import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkHookTrust } from '../lib/codex-hook-trust.mjs';

test('saved hook key needs the current Codex hash and must stay enabled', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'hook-trust-test-'));
  try {
    const command = join(temp, 'fake-codex.mjs');
    writeFileSync(command, `#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { join } from 'node:path';
const lines = createInterface({ input: process.stdin });
lines.on('line', (line) => {
  const message = JSON.parse(line);
  if (message.id === 1) console.log(JSON.stringify({ id: 1, result: {} }));
  if (message.id === 2) console.log(JSON.stringify({ id: 2, result: { data: [{ hooks: [{
    sourcePath: join(process.env.CODEX_HOME, 'config.toml'), key: join(process.env.CODEX_HOME, 'config.toml') + ':pre_tool_use:0:0',
    eventName: 'preToolUse', currentHash: 'sha256:current'
  }] }] } }));
});
`);
    chmodSync(command, 0o755);
    const installed = join(temp, 'research.config.toml');
    const source = '[[hooks.PreToolUse]]\nmatcher = ".*"\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "true"\n';
    const key = `${installed}:pre_tool_use:0:0`;
    const profile = (hash, enabled = true) => `${source}\n[hooks.state.${JSON.stringify(key)}]\ntrusted_hash = "${hash}"\n${enabled ? '' : 'enabled = false\n'}`;
    const options = { source, installed, cwd: temp, command };
    assert.deepEqual(await checkHookTrust({ ...options, previousProfile: profile('sha256:current') }), { trusted: true, missing: [] });
    assert.deepEqual(await checkHookTrust({ ...options, previousProfile: profile('sha256:old') }), { trusted: false, missing: ['preToolUse'] });
    assert.deepEqual(await checkHookTrust({ ...options, previousProfile: profile('sha256:current', false) }), { trusted: false, missing: ['preToolUse'] });
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
