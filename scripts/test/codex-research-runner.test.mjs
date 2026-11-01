import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jobStatus, runResearch, shippedResult } from '../lib/codex-research-runner.mjs';

const fixture = (mode) => {
  const root = mkdtempSync(join(tmpdir(), 'research-runner-'));
  writeFileSync(join(root, 'mode'), mode);
  const command = join(root, 'fake-codex.mjs');
  writeFileSync(command, `#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const cwd = process.cwd();
const mode = readFileSync(join(cwd, 'mode'), 'utf8');
const countPath = join(cwd, 'count');
let count = 0; try { count = Number(readFileSync(countPath, 'utf8')); } catch {}
count++; writeFileSync(countPath, String(count));
writeFileSync(join(cwd, 'args-' + count), JSON.stringify(process.argv.slice(2)));
const emit = (x) => console.log(JSON.stringify(x));
emit({ type: 'thread.started', thread_id: 'thread-123' });
emit({ type: 'turn.started' });
if (mode === 'overloaded' || (mode === 'retry' && count === 1)) {
  emit({ type: 'turn.failed', error: { message: 'Selected model is at capacity. Please try a different model.' } });
  process.exit(1);
}
if (mode !== 'unshipped') {
  const base = join(cwd, '.research');
  const slug = '2026-10-30-fixture';
  mkdirSync(join(base, slug, 'notes'), { recursive: true });
  mkdirSync(join(cwd, 'research', slug), { recursive: true });
  const doc = '<html>fixture</html>';
  writeFileSync(join(cwd, 'research', slug, 'index.html'), doc);
  const docSha = createHash('sha256').update(doc).digest('hex');
  const shippedAt = '2026-10-30T00:00:00.000Z';
  writeFileSync(join(base, 'active.json'), JSON.stringify({ state: 'shipped', slug, shippedAt }));
  writeFileSync(join(base, slug, 'run.json'), JSON.stringify({ ship: { branch: 'doc/fixture', draft: false, docSha, gates: { 'check-doc': true, 'check-prose': true, 'check-claims': true } } }));
  writeFileSync(join(base, slug, 'notes', 'hooks.json'), JSON.stringify({ gates: { at: '2026-10-30T00:00:01.000Z', results: { 'check-doc': { pass: true }, 'check-prose': { pass: true }, 'check-claims': { pass: true } } } }));
}
emit({ type: 'turn.completed' });
`);
  chmodSync(command, 0o755);
  return { root, command, cleanup: () => rmSync(root, { recursive: true, force: true }) };
};
const prLookup = () => ({ url: 'https://example.test/pr/1', headRefName: 'doc/fixture', state: 'OPEN', isDraft: false });

test('transient model failure resumes the same thread and reports only a verified PR', async () => {
  const f = fixture('retry');
  try {
    const result = await runResearch({ worktree: f.root, request: 'research request', codexArgs: [], command: f.command,
      maxRetries: 1, retryDelayMs: 1, prLookup, report: () => {} });
    assert.equal(result.pr, 'https://example.test/pr/1');
    assert.equal(JSON.parse(readFileSync(join(f.root, '.research/codex-job.json'))).state, 'shipped');
    assert.equal(readFileSync(join(f.root, 'count'), 'utf8'), '2');
    assert.deepEqual(JSON.parse(readFileSync(join(f.root, 'args-2'))).slice(0, 3), ['exec', '--json', 'resume']);
    assert.equal(JSON.parse(readFileSync(join(f.root, 'args-2')))[3], 'thread-123');
  } finally { f.cleanup(); }
});

test('completed turn without a shipped PR is reported as failed', async () => {
  const f = fixture('unshipped');
  try {
    await assert.rejects(runResearch({ worktree: f.root, request: 'research request', codexArgs: [], command: f.command,
      maxRetries: 0, prLookup, report: () => {} }), /ship 되지 않았다/);
    assert.equal(JSON.parse(readFileSync(join(f.root, '.research/codex-job.json'))).state, 'failed');
  } finally { f.cleanup(); }
});

test('a new request cannot reuse the previous shipped PR', async () => {
  const f = fixture('success');
  try {
    const options = { worktree: f.root, request: 'first request', codexArgs: [], command: f.command,
      maxRetries: 0, prLookup, report: () => {} };
    await runResearch(options);
    await assert.rejects(runResearch({ ...options, request: 'different request' }), /이미 ship 했다/);
    assert.equal(readFileSync(join(f.root, 'count'), 'utf8'), '1');
  } finally { f.cleanup(); }
});

test('safeguard recovery starts a fresh thread in the same worktree', async () => {
  const f = fixture('unshipped');
  try {
    mkdirSync(join(f.root, '.research'), { recursive: true });
    writeFileSync(join(f.root, '.research/codex-job.json'), JSON.stringify({
      state: 'failed', request: 'research request', threadId: 'old-thread', attempts: 1,
      lastError: 'safeguard stopped the previous researcher',
    }));
    await assert.rejects(runResearch({ worktree: f.root, request: 'research request', codexArgs: [], command: f.command,
      freshThread: true, maxRetries: 0, prLookup, report: () => {} }), /ship 되지 않았다/);
    const args = JSON.parse(readFileSync(join(f.root, 'args-1'), 'utf8'));
    assert.deepEqual(args.slice(0, 2), ['exec', '--json']);
    assert.notEqual(args[2], 'resume');
    assert.match(args[2], /^research request\n/);
    assert.match(args[2], /safeguard stopped the previous researcher/);
    assert.match(args[2], new RegExp(f.root));
    await assert.rejects(runResearch({ worktree: f.root, request: 'research request', codexArgs: [], command: f.command,
      freshThread: true, maxRetries: 0, prLookup, report: () => {} }), /이미 한 번 열었다/);
  } finally { f.cleanup(); }
});

test('fresh thread is refused without a failed prior job', async () => {
  const f = fixture('unshipped');
  try {
    await assert.rejects(runResearch({ worktree: f.root, request: 'research request', codexArgs: [], command: f.command,
      freshThread: true, maxRetries: 0, prLookup, report: () => {} }), /실패한 연구에서만/);
  } finally { f.cleanup(); }
});

test('exhausted transient retries leave an explicit failed job and no PR', async () => {
  const f = fixture('overloaded');
  try {
    await assert.rejects(runResearch({ worktree: f.root, request: 'research request', codexArgs: [], command: f.command,
      maxRetries: 1, retryDelayMs: 1, prLookup, report: () => {} }), /at capacity/);
    assert.equal(readFileSync(join(f.root, 'count'), 'utf8'), '2');
    assert.equal(JSON.parse(readFileSync(join(f.root, '.research/codex-job.json'))).state, 'failed');
  } finally { f.cleanup(); }
});

test('a stale Stop hook cannot certify a shipped PR', () => {
  const f = fixture('unshipped');
  try {
    const base = join(f.root, '.research');
    const slug = '2026-10-30-fixture';
    mkdirSync(join(base, slug, 'notes'), { recursive: true });
    writeFileSync(join(base, 'active.json'), JSON.stringify({ state: 'shipped', slug, shippedAt: '2026-10-30T00:00:02.000Z' }));
    writeFileSync(join(base, slug, 'run.json'), JSON.stringify({ ship: { branch: 'doc/fixture', gates: { 'check-doc': true, 'check-prose': true, 'check-claims': true } } }));
    writeFileSync(join(base, slug, 'notes', 'hooks.json'), JSON.stringify({ gates: { at: '2026-10-30T00:00:01.000Z', results: { 'check-doc': { pass: true }, 'check-prose': { pass: true }, 'check-claims': { pass: true } } } }));
    assert.match(shippedResult(f.root, prLookup).reason, /종료 hook/);
  } finally { f.cleanup(); }
});

test('an abandoned running record is not reported as live', () => {
  const f = fixture('unshipped');
  try {
    mkdirSync(join(f.root, '.research'), { recursive: true });
    writeFileSync(join(f.root, '.research/codex-job.json'), JSON.stringify({ state: 'running', supervisorPid: 99999999,
      updatedAt: '2026-10-30T00:00:00Z' }));
    assert.equal(jobStatus(f.root).state, 'stale');
  } finally { f.cleanup(); }
});
