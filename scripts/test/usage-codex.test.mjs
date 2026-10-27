#!/usr/bin/env node
// bunx 없이 job 계보 선택, ccusage JSON 변환, 임시 입력과 정리를 시험한다.
//   node scripts/test/usage-codex.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import * as zlib from 'node:zlib';
import usage, { jobFiles, fromReport } from '../lib/usage/codex.mjs';

function fixture(t) {
  const home = mkdtempSync(join(tmpdir(), 'usage-codex-test-'));
  const root = join(home, 'worktrees', 'research-job', 'research-library');
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const add = (id, parent, { dir = 'sessions/2026/10/28', cwd = root, tail = [], prefix = '', role } = {}) => {
    const folder = join(home, dir);
    mkdirSync(folder, { recursive: true });
    const file = join(folder, `rollout-${id}.jsonl`);
    const meta = { id, ...(prefix ? { instructions: prefix } : {}), cwd,
      source: parent ? { subagent: { thread_spawn: { parent_thread_id: parent, agent_role: role } } } : 'cli' };
    writeFileSync(file, [JSON.stringify({ type: 'session_meta', payload: meta }), ...tail.map(JSON.stringify)].join('\n') + '\n');
    return file;
  };
  return { home, root, add };
}

const names = (files) => files.map((file) => basename(file)).sort();
const session = (sessionId, inputTokens, cacheCreationTokens, cacheReadTokens, outputTokens, costUSD, models = { sol: {} }) => ({
  sessionId, inputTokens, cacheCreationTokens, cacheReadTokens, outputTokens, costUSD, models,
  totalTokens: inputTokens + cacheCreationTokens + cacheReadTokens + outputTokens,
});
const report = (...sessions) => ({ sessions });
const role = (models, input, cache_write, cache_read, output, usd) => ({ models, input, cache_write, cache_read, output, usd });

test('실제 계보로 이름 없는 보조 thread 와 중첩 자손까지 고른다', (t) => {
  const f = fixture(t);
  f.add('root');
  f.add('numbers', 'root');
  f.add('helper', 'root', { cwd: join(f.home, 'another-directory') });
  f.add('nested', 'helper');
  f.add('other');
  f.add('other-child', 'other');
  assert.deepEqual(names(jobFiles(f.home, f.root, 'root')),
    ['rollout-helper.jsonl', 'rollout-nested.jsonl', 'rollout-numbers.jsonl', 'rollout-root.jsonl']);
});

test('fork 에 복사된 뒤쪽 부모 metadata 를 자식의 신원으로 쓰지 않는다', (t) => {
  const f = fixture(t);
  f.add('root');
  f.add('child', 'root', { tail: [{ type: 'session_meta', payload: { id: 'root', cwd: f.root, source: 'cli' } }] });
  assert.equal(jobFiles(f.home, f.root, 'root').length, 2);
});

test('hint 가 없으면 유일한 worktree root 를 찾고, 여러 root 면 추측하지 않는다', (t) => {
  const f = fixture(t);
  f.add('root');
  f.add('child', 'root');
  assert.equal(jobFiles(f.home, f.root).length, 2);
  f.add('another-root');
  assert.deepEqual(jobFiles(f.home, f.root), []);
  assert.equal(jobFiles(f.home, f.root, 'root').length, 2);
  assert.deepEqual(jobFiles(f.home, f.root, 'missing'), []);
  assert.deepEqual(jobFiles(f.home, join(f.root, 'wrong'), 'root'), []);
});

test('명시한 root 의 상위 thread 와 다른 job 은 포함하지 않는다', (t) => {
  const f = fixture(t);
  f.add('caller', undefined, { cwd: join(f.home, 'caller') });
  f.add('researcher', 'caller');
  f.add('lens', 'researcher');
  assert.deepEqual(names(jobFiles(f.home, f.root, 'researcher')), ['rollout-lens.jsonl', 'rollout-researcher.jsonl']);
});

test('archive 의 자식도 찾고 중복 사본보다 active 를 우선한다', (t) => {
  const f = fixture(t);
  const active = f.add('root');
  f.add('root', 'unrelated', { dir: 'archived_sessions' });
  f.add('child', 'root', { dir: 'archived_sessions' });
  const files = jobFiles(f.home, f.root, 'root');
  assert.equal(files.length, 2);
  assert.ok(files.includes(active));
});

test('plain/zstd 중복을 제외하고 압축된 자손도 고른다', { skip: !zlib.zstdCompressSync }, (t) => {
  const f = fixture(t);
  const root = f.add('root');
  writeFileSync(root + '.zst', zlib.zstdCompressSync(readFileSync(root)));
  const child = f.add('child', 'root');
  writeFileSync(child + '.zst', zlib.zstdCompressSync(readFileSync(child)));
  rmSync(child);
  assert.deepEqual(names(jobFiles(f.home, f.root, 'root')), ['rollout-child.jsonl.zst', 'rollout-root.jsonl']);
});

test('긴 첫 metadata 의 UTF-8 cwd 를 보존하고 잘못된 파일을 건너뛴다', (t) => {
  const f = fixture(t);
  f.add('root', undefined, { prefix: '한'.repeat(8191) });
  writeFileSync(join(f.home, 'sessions', 'broken.jsonl'), '{bad}\n');
  assert.equal(jobFiles(f.home, f.root, 'root').length, 1);
  assert.deepEqual(jobFiles(join(f.home, 'absent'), f.root, 'root'), []);
});

test('같은 역할의 여러 thread 를 유형별로 합치고 모델 중복을 제거한다', () => {
  const result = fromReport(report(
    session('root', 10, 20, 30, 40, 1.004),
    session('check-1', 1, 0, 2, 3, 0.004),
    session('check-2', 4, 5, 6, 7, 0.004, { astra: {}, sol: {} }),
  ), new Map([['root', 'researcher'], ['check-1', 'recheck'], ['check-2', 'recheck']]));
  assert.deepEqual(result, { tokens: 128, usd: 1.01, roles: {
    researcher: role(['sol'], 10, 20, 30, 40, 1),
    recheck: role(['astra', 'sol'], 5, 5, 8, 10, 0.01),
  } });
});

test('한 thread 에 여러 모델이 있어도 그 역할의 ccusage 금액을 유지한다', () => {
  assert.deepEqual(fromReport(report(session('root', 2, 0, 20, 8, 0.5, { sol: {}, astra: {} })),
    new Map([['root', 'researcher']])),
  { tokens: 30, usd: 0.5, roles: { researcher: role(['astra', 'sol'], 2, 0, 20, 8, 0.5) } });
});

test('역할 금액을 알 수 없어도 토큰과 다른 역할의 값을 남긴다', () => {
  const result = fromReport(report(
    session('root', 1, 2, 3, 4, 1),
    session('helper-1', 10, 0, 20, 5, undefined),
    session('helper-2', 1, 0, 2, 3, 0.5),
  ), new Map([['root', 'researcher'], ['helper-1', 'default'], ['helper-2', 'default']]));
  assert.deepEqual(result, { tokens: 51, usd: null, roles: {
    researcher: role(['sol'], 1, 2, 3, 4, 1), default: role(['sol'], 11, 0, 22, 8, null),
  } });
  const missingPrice = session('root', 1, 0, 2, 3, 0, { sol: { missingPricing: true } });
  assert.deepEqual(fromReport(report(missingPrice), new Map([['root', 'researcher']])),
    { tokens: 6, usd: null, roles: { researcher: role(['sol'], 1, 0, 2, 3, null) } });
});

test('input 은 cache 제외, output 은 reasoning 포함이며 cache write 누락은 0 이다', () => {
  const s = session('root', 2, 3, 5, 7, 0.1);
  s.reasoningOutputTokens = 3;
  const roles = new Map([['root', 'researcher']]);
  assert.deepEqual(fromReport(report(s), roles),
    { tokens: 17, usd: 0.1, roles: { researcher: role(['sol'], 2, 3, 5, 7, 0.1) } });
  delete s.cacheCreationTokens;
  s.totalTokens = 14;
  assert.equal(fromReport(report(s), roles).roles.researcher.cache_write, 0);
});

test('값이 없거나 모순된 ccusage JSON 은 null 이다', () => {
  const valid = session('root', 1, 2, 3, 4, 1);
  const roles = new Map([['root', 'researcher']]);
  for (const data of [null, {}, report(), report({ ...valid, inputTokens: -1 }),
    report({ ...valid, totalTokens: 11 }), report({ ...valid, cacheReadTokens: '3' }),
    report({ ...valid, sessionId: 'unregistered' }), report({ ...valid, models: {} })]) {
    assert.equal(fromReport(data, roles), null);
  }
});

test('전체 파일을 ccusage 에 한 번 넘기고 root/typed child 역할을 연결한다', (t) => {
  const f = fixture(t);
  f.add('root'); f.add('child', 'root', { role: 'lens-numbers' }); f.add('other');
  writeFileSync(join(f.home, 'config.toml'), 'service_tier = "priority"\n');
  let temporary;
  const result = usage(f.root, { home: f.home, threadId: 'root', run(args, env) {
    assert.deepEqual(args, ['codex', 'session']);
    temporary = env.CODEX_HOME;
    assert.notEqual(temporary, f.home);
    const sessions = join(temporary, 'sessions');
    const copied = readdirSync(sessions).flatMap((dir) => readdirSync(join(sessions, dir)));
    assert.deepEqual(copied.sort(), ['rollout-child.jsonl', 'rollout-root.jsonl']);
    assert.equal(readFileSync(join(temporary, 'config.toml'), 'utf8'), 'service_tier = "priority"\n');
    return report(session('0/rollout-root', 10, 2, 30, 8, 0.5),
      session('1/rollout-child', 5, 0, 40, 5, 0.25));
  } });
  assert.deepEqual(result, { tokens: 100, usd: 0.75, roles: {
    researcher: role(['sol'], 10, 2, 30, 8, 0.5), 'lens-numbers': role(['sol'], 5, 0, 40, 5, 0.25),
  } });
  assert.equal(existsSync(temporary), false);
});

test('이름 없는 자식은 default, 여러 recheck 는 한 역할로 합친다', (t) => {
  const f = fixture(t);
  f.add('root'); f.add('a-helper', 'root');
  f.add('check-1', 'root', { role: 'recheck' }); f.add('check-2', 'root', { role: 'recheck' });
  const result = usage(f.root, { home: f.home, threadId: 'root', run(args, env) {
    const sessions = join(env.CODEX_HOME, 'sessions');
    return report(...readdirSync(sessions).map((dir) => {
      const file = readdirSync(join(sessions, dir))[0];
      return session(`${dir}/${file}`, 1, 0, 2, 3, 0.1);
    }));
  } });
  assert.deepEqual(result, { tokens: 24, usd: 0.4, roles: {
    researcher: role(['sol'], 1, 0, 2, 3, 0.1), default: role(['sol'], 1, 0, 2, 3, 0.1),
    recheck: role(['sol'], 2, 0, 4, 6, 0.2),
  } });
});

test('ccusage 실패도 ship 을 막지 않고 임시 입력을 정리한다', (t) => {
  const f = fixture(t);
  f.add('root');
  let temporary;
  assert.equal(usage(f.root, { home: f.home, threadId: 'root', run(args, env) {
    temporary = env.CODEX_HOME;
    throw new Error('bunx unavailable');
  } }), null);
  assert.equal(existsSync(temporary), false);
  assert.equal(usage(f.root, { home: f.home, threadId: 'missing', run() { assert.fail('must not invoke bunx'); } }), null);
});
