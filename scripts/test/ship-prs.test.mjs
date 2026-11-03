import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { classifyDocPrs, isDocBranch } from '../lib/ship-prs.mjs';

const slug = '2026-09-15-open-code-review';
const first = { headRefName: `doc/${slug}-fix-202610290936`, url: 'https://example.test/pr/44' };
const second = { headRefName: `doc/${slug}-fix-202610291911`, url: 'https://example.test/pr/45' };

test('a second worktree sees the first document PR before it creates another', () => {
  const found = classifyDocPrs([first], slug, second.headRefName);
  assert.equal(found.current, null);
  assert.deepEqual(found.conflicts, [first]);
});

test('the same branch can update its own PR', () => {
  const found = classifyDocPrs([first], slug, first.headRefName);
  assert.deepEqual(found.current, first);
  assert.deepEqual(found.conflicts, []);
});

test('a different slug with the same prefix is unrelated', () => {
  const another = { headRefName: `doc/${slug}-extra-fix-20261029`, url: 'https://example.test/pr/46' };
  assert.equal(isDocBranch(another.headRefName, slug), false);
  assert.deepEqual(classifyDocPrs([another], slug, second.headRefName).conflicts, []);
});

test('ship stops before commit or push when another worktree already has a PR', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ship-pr-conflict-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    mkdirSync(join(dir, 'research', slug), { recursive: true });
    mkdirSync(join(dir, '.research', slug), { recursive: true });
    writeFileSync(join(dir, 'research', slug, 'index.html'), '<html><body>draft</body></html>');
    writeFileSync(join(dir, '.research', slug, 'run.json'), JSON.stringify({ commitSubject: '수정', commitBody: '근거' }));
    writeFileSync(join(dir, '.research', slug, 'claims.jsonl'), '{}\n');
    writeFileSync(join(dir, '.research', slug, 'sources.jsonl'), '{}\n');
    const calls = join(dir, 'calls.txt');
    writeFileSync(bin + '/node', '#!/bin/sh\nprintf "node %s\\n" "$*" >> "$TEST_CALLS"\n');
    writeFileSync(bin + '/git', `#!/bin/sh
printf 'git %s\\n' "$*" >> "$TEST_CALLS"
case "$1 $2" in
  'branch --show-current') printf 'test-fixture\\n' ;;
  'remote get-url') printf 'https://github.com/kywoo26/research-library.git\\n' ;;
esac
exit 0
`);
    writeFileSync(bin + '/gh', '#!/bin/sh\nprintf "gh %s\\n" "$*" >> "$TEST_CALLS"\nprintf "%s\\n" "$TEST_PR_LIST"\n');
    for (const name of ['node', 'git', 'gh']) spawnSync('chmod', ['+x', join(bin, name)]);
    const result = spawnSync(process.execPath, [resolve('scripts/ship.mjs'), `research/${slug}`], {
      cwd: dir, encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_CALLS: calls, TEST_PR_LIST: JSON.stringify([first]) },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /같은 문서의 다른 열린 PR/);
    const observed = readFileSync(calls, 'utf8');
    assert.match(observed, /gh pr list/);
    assert.doesNotMatch(observed, /git (checkout|switch|add|commit|push)|gh pr (create|edit)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ship carries old wording records and new understanding blockers into PR arguments', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ship-reader-impact-'));
  try {
    const bin = join(dir, 'bin');
    const pub = join(dir, 'research', slug);
    const evidence = join(dir, '.research', slug);
    mkdirSync(bin);
    mkdirSync(pub, { recursive: true });
    mkdirSync(join(evidence, 'notes'), { recursive: true });
    const html = '<html><body><section class="slide" data-role="mechanism">설명</section></body></html>';
    const sha = createHash('sha256').update(html).digest('hex');
    writeFileSync(join(pub, 'index.html'), html);
    writeFileSync(join(evidence, 'claims.jsonl'), '{}\n');
    writeFileSync(join(evidence, 'sources.jsonl'), '{}\n');
    const calls = join(dir, 'calls.jsonl');
    // 실제 ship의 판정·run 기록·PR 인자를 확인한다. 외부 명령은 기록만 하므로 git/gh를 실행하지 않는다.
    for (const tool of ['node', 'git', 'gh', 'bunx']) {
      const stub = `#!${process.execPath}
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2), tool = ${JSON.stringify(tool)};
appendFileSync(process.env.TEST_CALLS, JSON.stringify({ tool, args }) + '\\n');
if (tool === 'bunx') process.exit(1);
if (tool === 'git' && args[0] === 'branch') console.log(${JSON.stringify(`doc/${slug}`)});
if (tool === 'git' && args[0] === 'remote') console.log('https://example.test/fixture/research.git');
if (tool === 'git' && args[0] === 'rev-parse') console.log('fixture-sha');
if (tool === 'gh' && args[1] === 'list') console.log('[]');
if (tool === 'gh' && args[1] === 'create') console.log('https://example.test/pr/1');
`;
      writeFileSync(join(bin, tool), stub, { mode: 0o755 });
    }
    const cases = [
      { label: 'old wording', item: { item: '표현 선택', meaning: false }, draft: false },
      { label: 'wording', item: { item: '표현 선택', meaning: false, impact: 'wording' }, draft: false },
      { label: 'understanding', item: { item: '조건 경로를 따라갈 수 없다', meaning: false, impact: 'understanding' }, draft: true },
      { label: 'fact', item: { item: '원문과 다른 사실', meaning: true, impact: 'wording' }, draft: true },
    ];
    for (const harness of ['claude', 'codex']) for (const c of cases) {
      writeFileSync(calls, '');
      writeFileSync(join(dir, '.research', 'active.json'), JSON.stringify({ runId: 'R', harness, state: 'running' }));
      const review = (agent, event) => ({ agent, event, actor: agent, runId: 'R', harness, sha, psha: 'protected' });
      writeFileSync(join(evidence, 'notes', 'hooks.json'), JSON.stringify({ reviews: [
        review('lens-numbers', 'start'), review('lens-reader', 'start'),
        review('lens-numbers', 'done'), review('lens-reader', 'done'),
      ] }));
      writeFileSync(join(evidence, 'run.json'), JSON.stringify({ commitSubject: '설명 수정', commitBody: '고정 출처', unfixed: [c.item] }));
      const result = spawnSync(process.execPath, [resolve('scripts/ship.mjs'), `research/${slug}`], {
        cwd: dir, encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_CALLS: calls },
      });
      assert.equal(result.status, 0, `${harness}/${c.label}: ${result.stderr}`);
      const run = JSON.parse(readFileSync(join(evidence, 'run.json'), 'utf8'));
      assert.equal(run.ship.draft, c.draft, `${harness}/${c.label}`);
      const commands = readFileSync(calls, 'utf8').trim().split('\n').map((s) => JSON.parse(s));
      const pr = commands.find((x) => x.tool === 'gh' && x.args[1] === 'create');
      assert.ok(pr);
      assert.equal(pr.args.includes('--draft'), c.draft, `${harness}/${c.label}`);
      if (c.label === 'understanding') {
        assert.match(pr.args[pr.args.indexOf('--body') + 1], /\(독자 이해\) 조건 경로를 따라갈 수 없다/);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
