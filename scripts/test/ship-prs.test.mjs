import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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
