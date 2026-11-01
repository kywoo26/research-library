import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const launcher = join(root, 'scripts/codex-research.mjs');

for (const option of [['-s', 'read-only'], ['-c', 'sandbox_mode="read-only"'], ['--config=sandbox_mode="read-only"'],
  ['-c', 'default_permissions="other"'], ['-c', 'agents.enabled=false'], ['--disable', 'network_proxy']]) {
  test(`launcher rejects permission override ${option.join(' ')}`, () => {
    const result = spawnSync('node', [launcher, '--run', 'test request', ...option], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /감독 실행에는 모델과 reasoning effort/);
    assert.doesNotMatch(result.stdout, /연구 worktree/);
  });
}
