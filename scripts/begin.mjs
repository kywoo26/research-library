#!/usr/bin/env node
// researcher 의 첫 동작. 이 작업 트리를 연구 run 으로 표시하고, origin/main 기준을 맞추고, 선행 조건을 확인한다.
//   node scripts/begin.mjs --harness=claude|codex [--allow=<점검>,...]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, realpathSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { cacheRoot } from './lib/source-cache.mjs';

const HELP = `사용법: node scripts/begin.mjs --harness=claude|codex [--allow=<점검>,...]

researcher 가 무엇보다 먼저 부른다. 하는 일:
  1. .research/active.json 을 쓴다(git 이 무시한다). 이 파일이 있는 작업 트리만 연구 run 으로 다룬다.
     끝난 run 의 worktree 와 오래된 원본 cache 를 정리한다(scripts/prune.mjs).
  2. primary checkout 이면 멈춘다. 연구는 자기 worktree 에서 한다(Codex 는 scripts/codex-research.mjs 로 연 세션).
  3. origin/main 을 받아, 트리가 깨끗하고 origin/main 에 없는 커밋이 없을 때만 그 위로 옮긴다.
     잃을 것이 있으면 옮기지 않고 멈춘다. reset --hard 나 clean 은 하지 않는다.
     이미 열린 run(같은 worktree, 같은 base)이면 그대로 이어 간다.
  4. 선행 조건을 실제 권한으로 확인한다: gh 인증, 브라우저(render.mjs), 원문 fetch, 원본 cache 쓰기,
     git 쓰기(object 와 이 worktree 의 gitdir, 곧 index.lock 자리), Claude 면 lens 를 띄울 수 있는 subagent 깊이.
     하나라도 안 되면 멈춘다. 소유자가 알고 넘기는 점검은 --allow=<이름> 으로 건너뛴다.
harness 는 인자로 받는다. 없으면 env 로 짐작하지만, 다른 harness 안에서 띄운 세션에는 바깥 env 가 새어 든다.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=') || null;
const allowed = new Set((opt('allow') || '').split(',').filter(Boolean));
const git = (a) => spawnSync('git', a, { encoding: 'utf8' });
const fail = (msg) => { console.error(`begin: 멈춘다. ${msg}`); process.exit(1); };

const top = git(['rev-parse', '--show-toplevel']).stdout.trim();
if (!top) fail('git 작업 트리 안에서 부른다');
process.chdir(top);
const envHarness = process.env.CLAUDECODE ? 'claude' : Object.keys(process.env).some((k) => k.startsWith('CODEX_')) ? 'codex' : null;
const harness = opt('harness') || envHarness;
if (!['claude', 'codex'].includes(harness)) fail('--harness=claude|codex 를 넘긴다');

const activePath = join('.research', 'active.json');
const prev = existsSync(activePath) ? JSON.parse(readFileSync(activePath, 'utf8')) : null;
const real = (p) => { try { return realpathSync(p); } catch { return p; } };
const gitDir = real(git(['rev-parse', '--path-format=absolute', '--git-dir']).stdout.trim());
const commonDir = real(git(['rev-parse', '--path-format=absolute', '--git-common-dir']).stdout.trim());
const run = {
  runId: prev && prev.state !== 'shipped' ? prev.runId : `${new Date().toISOString().slice(0, 10)}-${randomBytes(3).toString('hex')}`,
  harness, envHarness, state: 'starting', startedAt: prev?.startedAt || new Date().toISOString(),
  worktree: top, gitCommonDir: commonDir, branchBefore: git(['branch', '--show-current']).stdout.trim() || null,
};
const save = () => { mkdirSync('.research', { recursive: true }); writeFileSync(activePath, JSON.stringify(run, null, 1) + '\n'); };
// 1. 기록부터. preflight 가 실패해도 prune 이 이 worktree 를 찾을 수 있게.
save();
// 끝난 run 이 남긴 worktree 와 오래된 원본 cache 를 정리한다. 여기서 부르는 이유: 연구를 받는 세션에는 agent hook 이 없어
// 명령마다 권한을 물을 수 있다. researcher 안에서는 hook 이 허용한다. 정리가 실패해도 연구는 계속한다.
spawnSync('node', [join(top, 'scripts', 'prune.mjs')], { stdio: 'ignore' });

// 2. primary checkout
if (gitDir === commonDir) { run.state = 'refused'; run.reason = 'primary checkout'; save(); fail('primary checkout 이다. 자기 worktree 에서 연다(Codex: node scripts/codex-research.mjs).'); }

// 3. 기준
if (git(['fetch', '-q', 'origin', 'main']).status !== 0) fail('origin main 을 받지 못했다');
const base = git(['rev-parse', 'origin/main']).stdout.trim();
const head = git(['rev-parse', 'HEAD']).stdout.trim();
const resuming = prev && prev.state !== 'shipped' && prev.worktree === top && prev.baseOid;
if (resuming) {
  run.baseOid = prev.baseOid;
} else if (head !== base) {
  const dirty = git(['status', '--porcelain', '--untracked-files=no']).stdout.trim();
  // 앞선 커밋이 이미 원격 branch 에 있으면(ship.mjs 가 PR 로 내보낸 뒤 HEAD 를 떼어 둔 경우) 잃을 것이 없다.
  const pushed = git(['branch', '-r', '--contains', 'HEAD']).stdout.trim() !== '';
  const ahead = pushed ? '0' : git(['rev-list', '--count', `origin/main..HEAD`]).stdout.trim();
  if (dirty || ahead !== '0') { run.state = 'refused'; run.reason = dirty ? 'dirty tree' : `${ahead} commits not on origin/main`; save(); fail(`origin/main 으로 옮기면 잃는 것이 있다(${run.reason}). 새 worktree 에서 연다.`); }
  if (git(['switch', '-q', '--detach', 'origin/main']).status !== 0) fail('origin/main 으로 옮기지 못했다');
  run.baseOid = base;
} else run.baseOid = base;

// 4. 선행 조건
const checks = {
  gh: () => spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' }).status === 0,
  browser: () => spawnSync('sh', ['-c', 'find ~/.cache/ms-playwright -name chrome-headless-shell -type f 2>/dev/null | grep -q .']).status === 0,
  fetch: () => spawnSync('curl', ['-sfI', '--max-time', '15', 'https://arxiv.org/']).status === 0,
  cache: () => { try { mkdirSync(cacheRoot(), { recursive: true }); const d = mkdtempSync(join(cacheRoot(), '.begin-')); rmSync(d, { recursive: true }); return true; } catch { return false; } },
  // commit 은 object 와 gitdir 의 index.lock 을 쓴다. Codex sandbox 는 linked worktree 의 gitdir 을 따로 막는다.
  git: () => {
    if (spawnSync('git', ['hash-object', '-w', '--stdin'], { input: `begin ${run.runId}\n`, encoding: 'utf8' }).status !== 0) return false;
    try { const p = join(gitDir, `begin-${run.runId}.probe`); writeFileSync(p, ''); rmSync(p); return true; } catch { return false; }
  },
  // researcher 가 subagent 이므로 lens 는 둘째 단계다. 깊이가 1 이면 lens 를 띄우지 못한다.
  depth: () => harness !== 'claude' || !process.env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH || Number(process.env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH) >= 2,
};
run.preflight = {};
for (const [name, fn] of Object.entries(checks)) run.preflight[name] = allowed.has(name) ? 'allowed' : fn() ? 'ok' : 'failed';
const failed = Object.entries(run.preflight).filter(([, v]) => v === 'failed').map(([k]) => k);
run.state = failed.length ? 'refused' : 'running';
if (failed.length) run.reason = `preflight: ${failed.join(', ')}`;
save();
if (failed.length) fail(`선행 조건이 안 된다: ${failed.join(', ')}. 연구를 시작하기 전에 보고한다.`);
console.log(JSON.stringify({ runId: run.runId, harness, base: run.baseOid.slice(0, 7), resumed: !!resuming, preflight: run.preflight }));
