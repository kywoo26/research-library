#!/usr/bin/env node
// Codex 연구 세션을 연다. origin/main 에서 새 worktree 를 만들고(또는 열린 연구 worktree 를 이어 받고), 그 worktree 의
// worktree gitdir 와 공용 git 저장소에 쓰기를 더한 채 `codex --profile research` 를 띄운다.
//   node scripts/codex-research.mjs ["리서치 맡겨 <url>"] [codex 인자...]
//   node scripts/codex-research.mjs --resume=<worktree> [codex 인자...]
// codex --worktree 를 쓰지 않는 이유: Codex 의 sandbox 는 linked worktree 의 gitdir 과 공용 .git 을 읽기 전용으로 둔다.
// index.lock 에는 정확한 gitdir 경로가, commit object 에는 공용 .git 경로가 쓰기로 필요하다.
// gitdir 은 worktree 가 생긴 뒤에야 정해진다.
// 허용은 profile 의 permission 을 상속한 run 전용 permission 으로 넘긴다. profile 의 다른 허용을 여기서 다시 읽지 않는다.
// profile 은 부를 때마다 저장소의 harness/codex/research.config.toml 을 \${CODEX_HOME}/research.config.toml 로 복사해 둔다.
// symlink 로 두면 Codex 가 hook trust 기록([hooks.state])을 그 파일에 써서 저장소 파일이 바뀐다. 복사할 때 그 기록은 이어 붙인다.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { jobStatus, runResearch } from './lib/codex-research-runner.mjs';
import { checkHookTrust } from './lib/codex-hook-trust.mjs';

const HELP = `사용법: node scripts/codex-research.mjs --run "리서치 맡겨 <url>" [codex 인자...]
       node scripts/codex-research.mjs ["리서치 맡겨 <url>"] [codex 인자...]
       node scripts/codex-research.mjs --resume=<worktree> [codex 인자...]
       node scripts/codex-research.mjs --run --fresh-thread --resume=<worktree> "<원래 요청>"
       node scripts/codex-research.mjs --status=<worktree>

0. 저장소의 연구 profile 을 \${CODEX_HOME:-~/.codex}/research.config.toml 로 복사한다(그 파일의 hook trust 기록은 남긴다).
1. origin/main 을 받아 \${CODEX_HOME:-~/.codex}/worktrees/research-<시각>-<난수>/research-library 에 worktree 를 만든다.
   --resume 이면 그 worktree 를 그대로 쓴다(멈춘 연구를 이어 갈 때).
2. permission research-run(= research 를 상속하고 worktree gitdir 와 공용 git 저장소를 쓰기로 더한 것)으로
   codex --profile research 를 그 worktree 에서 띄운다.
3. --run 은 Codex 의 JSON 이벤트를 감시하고 일시 오류를 같은 thread 에서 재개한다. 종료 뒤 게이트와 PR 을 확인한다.
   추가 인자는 모델(-m/--model)과 reasoning effort(-c model_reasoning_effort=...)만 받는다.
   --fresh-thread 는 실패한 연구의 안전장치 오류 뒤 같은 worktree 에 새 연구자 맥락을 연다.
   연구 hook 을 아직 trust 하지 않았으면 시작 전에 멈춘다. 대화형 세션에서 /hooks 를 열어 trust 한 뒤 다시 부른다.
   대화형 시작은 요청을 trust 뒤에만 첫 프롬프트로 넘긴다.
멈추는 경우: 설정이나 인자에 sandbox_mode·--sandbox 가 있어 permission profile 보다 먼저 적용될 때.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const statusArg = args.find((a) => a.startsWith('--status='));
if (statusArg) { console.log(JSON.stringify(jobStatus(resolve(statusArg.slice('--status='.length))), null, 1)); process.exit(0); }
const git = (a, cwd) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const die = (m) => { console.error(`codex-research: ${m}`); process.exit(1); };
const repo = git(['rev-parse', '--show-toplevel']).stdout.trim() || die('이 저장소 안에서 부른다');
const home = process.env.CODEX_HOME || join(homedir(), '.codex');

// legacy sandbox 설정은 permission profile 보다 먼저 적용된다(Codex permissions 문서). 그러면 git 허용이 듣지 않는다.
const resumeArg = args.find((a) => a.startsWith('--resume='));
const runMode = args.includes('--run');
const freshThread = args.includes('--fresh-thread');
if (freshThread && (!runMode || !resumeArg)) die('--fresh-thread 는 --run 과 --resume=<worktree> 가 필요하다');
const codexArgs = args.filter((a) => a !== resumeArg && a !== '--run' && a !== '--fresh-thread');
const request = runMode ? codexArgs.shift() : null;
if (runMode && (!request || request.startsWith('-'))) die('--run 뒤에 연구 요청을 한 인자로 넘긴다');
for (let i = 0; i < codexArgs.length; i++) {
  const arg = codexArgs[i];
  if (runMode) {
    if (arg === '-m' || arg === '--model') {
      if (!codexArgs[i + 1] || codexArgs[i + 1].startsWith('-')) die(`${arg} 뒤에 모델이 없다`);
      i++;
      continue;
    }
    if (/^(--model=.+|-m[^-].*)$/.test(arg)) continue;
    const config = arg === '-c' || arg === '--config' ? codexArgs[++i]
      : arg.startsWith('--config=') ? arg.slice('--config='.length)
        : arg.startsWith('-c') && arg.length > 2 ? arg.slice(2) : null;
    if (config === undefined) die(`${arg} 뒤에 설정값이 없다`);
    if (config && /^(model|model_reasoning_effort)=.+/.test(config)) continue;
    die(`감독 실행에는 모델과 reasoning effort 인자만 넘길 수 있다: ${arg}`);
  }
  if (arg === '--sandbox' || arg === '-s' || arg.startsWith('--sandbox=') || /^-s(?:=|[^-])/.test(arg))
    die('--sandbox 를 넘기면 연구 permission 이 무시된다. 빼고 다시 부른다');
  const config = arg === '-c' || arg === '--config' ? codexArgs[++i]
    : arg.startsWith('--config=') ? arg.slice('--config='.length)
      : arg.startsWith('-c') && arg.length > 2 ? arg.slice(2) : null;
  if (config === undefined) die(`${arg} 뒤에 설정값이 없다`);
  const key = config?.split('=')[0].trim();
  if (/^(sandbox_mode|default_permissions|developer_instructions)$|^(permissions|hooks)(\.|$)/.test(key || ''))
    die(`-c ${key} 는 연구 profile 의 권한·hook 을 바꾸므로 넘길 수 없다`);
}
const installed = join(home, 'research.config.toml');
const source = readFileSync(join(repo, 'harness', 'codex', 'research.config.toml'), 'utf8').replace(/^\[hooks\.state\][\s\S]*$/m, '');
let previousProfile = '';
let state = '';
try {
  previousProfile = readFileSync(installed, 'utf8');
  state = (/^\[hooks\.state\][\s\S]*$/m.exec(previousProfile) || [''])[0];
} catch {}
try { mkdirSync(home, { recursive: true }); }
catch (error) { die(`CODEX_HOME ${home} 를 만들지 못했다: ${error.message}`); }
try { if (lstatSync(installed).isSymbolicLink()) rmSync(installed); } catch {}
try {
  writeFileSync(installed, `# scripts/codex-research.mjs 가 harness/codex/research.config.toml 에서 복사했다. 고치려면 그 파일을 고친다.\n${source.trimEnd()}\n${state ? `\n${state.trimEnd()}\n` : ''}`);
} catch (error) { die(`연구 profile 을 ${installed} 에 설치하지 못했다: ${error.message}`); }
let trusted = false;
try {
  const trust = await checkHookTrust({ source, installed, previousProfile: readFileSync(installed, 'utf8'), cwd: repo });
  trusted = trust.trusted;
  if (runMode && !trusted) die(`연구 hook 신뢰가 필요하다(${trust.reason || trust.missing.join(', ')}). 대화형으로 node scripts/codex-research.mjs 를 열고 /hooks 에서 확인한 뒤 --run 을 다시 부른다`);
} catch (error) {
  if (runMode) die(`연구 hook 신뢰를 확인하지 못했다: ${error.message}`);
  console.warn(`연구 hook 신뢰를 확인하지 못했다: ${error.message}`);
}
for (const f of [join(home, 'config.toml'), installed, join(repo, '.codex', 'config.toml')]) {
  let text = '';
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  if (/^\s*sandbox_mode\s*=/m.test(text)) die(`${f} 에 sandbox_mode 가 있어 연구 permission 보다 먼저 적용된다. 그 줄을 지우거나 이 세션에서만 다른 CODEX_HOME 을 쓴다`);
}

let wt;
if (resumeArg) {
  wt = resolve(resumeArg.split('=').slice(1).join('='));
  if (!existsSync(join(wt, '.git'))) die(`${wt} 는 worktree 가 아니다`);
} else {
  const fetched = git(['fetch', '-q', 'origin', 'main'], repo);
  if (fetched.status !== 0) die(`origin main 을 받지 못했다: ${(fetched.stderr || fetched.error?.message || '').trim()}`);
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}-${randomBytes(2).toString('hex')}`;
  wt = join(home, 'worktrees', `research-${stamp}`, 'research-library');
  mkdirSync(join(wt, '..'), { recursive: true });
  const added = git(['worktree', 'add', '-q', '--detach', wt, 'origin/main'], repo);
  if (added.status !== 0) die(`worktree 를 만들지 못했다: ${wt}: ${(added.stderr || added.error?.message || '').trim()}`);
}
const gitdir = git(['rev-parse', '--path-format=absolute', '--git-dir'], wt).stdout.trim() || die(`gitdir 을 읽지 못했다: ${wt}`);
const commonDir = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], wt).stdout.trim() || die(`공용 git 저장소를 읽지 못했다: ${wt}`);

// 대화형 요청은 hook 이 trust 된 뒤에만 첫 프롬프트로 넘긴다.
const interactivePromptAt = codexArgs.findIndex((a, i) => !a.startsWith('-') && !(i > 0 && /^-(m|c|p)$|^--(model|config|profile)$/.test(codexArgs[i - 1])));
const held = !runMode && !trusted && interactivePromptAt >= 0 ? codexArgs.splice(interactivePromptAt, 1)[0] : null;
console.log(`연구 worktree: ${wt}\n허용한 gitdir: ${gitdir}\n허용한 공용 git 저장소: ${commonDir}`);
if (held) console.log(`연구 hook 을 아직 trust 하지 않았다. 세션에서 /hooks 를 열어 hook 다섯 개를 보고 trust(t) 한 뒤, 이 요청을 입력한다:\n  ${held}`);
const sessionArgs = ['--profile', 'research', '-C', wt,
  '-c', 'default_permissions="research-run"',
  '-c', 'permissions.research-run.extends="research"',
  '-c', `permissions.research-run.filesystem={${JSON.stringify(gitdir)}="write",${JSON.stringify(commonDir)}="write"}`,
  ...codexArgs];
if (runMode) {
  try { await runResearch({ worktree: wt, request, codexArgs: sessionArgs, freshThread }); }
  catch (error) { console.error(`codex-research: ${error.message}`); process.exitCode = 1; }
} else {
  const r = spawnSync('codex', sessionArgs, { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
