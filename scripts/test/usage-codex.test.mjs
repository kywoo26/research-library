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
  const add = (id, parent, { dir = 'sessions/2026/10/28', cwd = root, tail = [], prefix = '' } = {}) => {
    const folder = join(home, dir);
    mkdirSync(folder, { recursive: true });
    const file = join(folder, `rollout-${id}.jsonl`);
    const meta = { id, ...(prefix ? { instructions: prefix } : {}), cwd,
      source: parent ? { subagent: { thread_spawn: { parent_thread_id: parent } } } : 'cli' };
    writeFileSync(file, [JSON.stringify({ type: 'session_meta', payload: meta }), ...tail.map(JSON.stringify)].join('\n') + '\n');
    return file;
  };
  return { home, root, add };
}

const names = (files) => files.map((file) => basename(file)).sort();
const session = (tokens, costUSD, models) => ({ totalTokens: tokens, costUSD, models });
const report = (...sessions) => ({ sessions });

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

test('ccusage 합계·모델별 값을 더하고 마지막에 센트로 반올림한다', () => {
  const result = fromReport(report(
    session(100, 0.004, { sol: { totalTokens: 100 } }),
    session(200, 0.004, { sol: { totalTokens: 200 } }),
    session(50, 0.12, { astra: { totalTokens: 50 } }),
  ));
  assert.deepEqual(result, { tokens: 350, usd: 0.13,
    models: { sol: { tokens: 300, usd: 0.01 }, astra: { tokens: 50, usd: 0.12 } } });
});

test('여러 모델 thread 도 합계는 보존하고 나눌 근거가 없는 모델 비용만 null 이다', () => {
  const result = fromReport(report(
    session(10, 0.1, { sol: { totalTokens: 10 } }),
    session(30, 0.5, { sol: { totalTokens: 20 }, astra: { totalTokens: 10 } }),
    session(40, 0.2, { luna: { totalTokens: 40 } }),
  ));
  assert.deepEqual(result, { tokens: 80, usd: 0.8,
    models: { sol: { tokens: 30, usd: null }, astra: { tokens: 10, usd: null }, luna: { tokens: 40, usd: 0.2 } } });
});

test('모델별 비용을 주는 JSON 이면 그 값을 보존한다', () => {
  assert.deepEqual(fromReport(report(session(30, 0.5, {
    sol: { totalTokens: 20, costUSD: 0.2 }, astra: { totalTokens: 10, cost: 0.3 },
  }))), { tokens: 30, usd: 0.5, models: { sol: { tokens: 20, usd: 0.2 }, astra: { tokens: 10, usd: 0.3 } } });
});

test('reasoning 이 포함된 ccusage totalTokens 를 다시 더하지 않는다', () => {
  assert.equal(fromReport(report(session(12, 0.1, { sol: {
    totalTokens: 12, inputTokens: 2, cacheReadTokens: 5, outputTokens: 5, reasoningOutputTokens: 3,
  } }))).tokens, 12);
});

test('값이 없거나 모순된 ccusage JSON 은 null 이다', () => {
  for (const data of [null, {}, report(), report(session(-1, 1, {})),
    report(session(10, NaN, { sol: { totalTokens: 10 } })),
    report(session(10, 1, { sol: { totalTokens: 9 } })),
    report(session(10, 0, { sol: { totalTokens: 10, missingPricing: true } }))]) {
    assert.equal(fromReport(data), null);
  }
});

test('선택한 전체 파일을 한 번에 ccusage 로 넘기고 임시 입력을 지운다', (t) => {
  const f = fixture(t);
  f.add('root'); f.add('child', 'root'); f.add('other');
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
    return report(session(100, 1, { sol: { totalTokens: 100 } }));
  } });
  assert.deepEqual(result, { tokens: 100, usd: 1, models: { sol: { tokens: 100, usd: 1 } } });
  assert.equal(existsSync(temporary), false);
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
