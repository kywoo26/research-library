#!/usr/bin/env node
// Codex 연구 세션을 연다. origin/main 에서 새 worktree 를 만들고(또는 열린 연구 worktree 를 이어 받고), 그 worktree 의
// gitdir 에만 쓰기를 더한 채 `codex --profile research` 를 띄운다. 하는 일은 그것뿐이고, 세션 자체는 Codex 그대로다.
//   node scripts/codex-research.mjs ["리서치 맡겨 <url>"] [codex 인자...]
//   node scripts/codex-research.mjs --resume=<worktree> [codex 인자...]
// codex --worktree 를 쓰지 않는 이유: Codex 의 sandbox 는 linked worktree 의 gitdir 을 읽기 전용으로 두고, 정확한 gitdir
// 경로를 허용해야만 commit 이 된다(상위 디렉터리 허용은 듣지 않는다). 그 경로는 worktree 가 생긴 뒤에야 정해진다.
// 허용은 profile 의 permission 을 상속한 run 전용 permission 으로 넘긴다. profile 의 다른 허용을 여기서 다시 읽지 않는다.
// profile 은 부를 때마다 저장소의 harness/codex/research.config.toml 을 \${CODEX_HOME}/research.config.toml 로 복사해 둔다.
// symlink 로 두면 Codex 가 hook trust 기록([hooks.state])을 그 파일에 써서 저장소 파일이 바뀐다. 복사할 때 그 기록은 이어 붙인다.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

const HELP = `사용법: node scripts/codex-research.mjs ["리서치 맡겨 <url>"] [codex 인자...]
       node scripts/codex-research.mjs --resume=<worktree> [codex 인자...]

0. 저장소의 연구 profile 을 \${CODEX_HOME:-~/.codex}/research.config.toml 로 복사한다(그 파일의 hook trust 기록은 남긴다).
1. origin/main 을 받아 \${CODEX_HOME:-~/.codex}/worktrees/research-<시각>-<난수>/research-library 에 worktree 를 만든다.
   --resume 이면 그 worktree 를 그대로 쓴다(멈춘 연구를 이어 갈 때).
2. permission research-run(= research 를 상속하고 그 worktree 의 gitdir 만 쓰기로 더한 것)으로
   codex --profile research 를 그 worktree 에서 띄운다.
3. 연구 hook 넷을 아직 trust 하지 않았으면 요청을 첫 프롬프트로 넘기지 않는다. 세션에서 /hooks 를 열어 trust 한 뒤에
   요청을 입력한다. trust 전에 시작한 turn 에서는 subagent hook 이 돌지 않아 검증 기록이 비고, 그 PR 은 draft 가 된다.
멈추는 경우: 설정이나 인자에 sandbox_mode·--sandbox 가 있어 permission profile 보다 먼저 적용될 때.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const git = (a, cwd) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const die = (m) => { console.error(`codex-research: ${m}`); process.exit(1); };
const repo = git(['rev-parse', '--show-toplevel']).stdout.trim() || die('이 저장소 안에서 부른다');
const home = process.env.CODEX_HOME || join(homedir(), '.codex');

// legacy sandbox 설정은 permission profile 보다 먼저 적용된다(Codex permissions 문서). 그러면 gitdir 허용이 듣지 않는다.
const resumeArg = args.find((a) => a.startsWith('--resume='));
const codexArgs = args.filter((a) => a !== resumeArg);
if (codexArgs.some((a) => a === '--sandbox' || a === '-s' || a.startsWith('--sandbox='))) die('--sandbox 를 넘기면 연구 permission 이 무시된다. 빼고 다시 부른다');
const installed = join(home, 'research.config.toml');
const source = readFileSync(join(repo, 'harness', 'codex', 'research.config.toml'), 'utf8').replace(/^\[hooks\.state\][\s\S]*$/m, '');
let state = '';
try { state = (/^\[hooks\.state\][\s\S]*$/m.exec(readFileSync(installed, 'utf8')) || [''])[0]; } catch {}
mkdirSync(home, { recursive: true });
try { if (lstatSync(installed).isSymbolicLink()) rmSync(installed); } catch {}
writeFileSync(installed, `# scripts/codex-research.mjs 가 harness/codex/research.config.toml 에서 복사했다. 고치려면 그 파일을 고친다.\n${source.trimEnd()}\n${state ? `\n${state.trimEnd()}\n` : ''}`);
// profile 에 등록한 hook 이벤트마다 trust 기록이 있어야 한다(Codex 는 이벤트 이름을 snake_case 로 적는다).
const EVENTS = [...new Set([...source.matchAll(/^\[\[hooks\.(\w+)\]\]/gm)].map((m) => m[1].replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()))];
const trusted = EVENTS.every((e) => state.includes(`${installed}:${e}:`));
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
  if (git(['fetch', '-q', 'origin', 'main'], repo).status !== 0) die('origin main 을 받지 못했다');
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}-${randomBytes(2).toString('hex')}`;
  wt = join(home, 'worktrees', `research-${stamp}`, 'research-library');
  mkdirSync(join(wt, '..'), { recursive: true });
  if (git(['worktree', 'add', '-q', '--detach', wt, 'origin/main'], repo).status !== 0) die(`worktree 를 만들지 못했다: ${wt}`);
}
const gitdir = git(['rev-parse', '--path-format=absolute', '--git-dir'], wt).stdout.trim() || die(`gitdir 을 읽지 못했다: ${wt}`);

// 요청은 hook 이 trust 된 뒤에만 첫 프롬프트로 넘긴다. 옵션이 아닌 첫 인자를 요청으로 본다.
const promptAt = codexArgs.findIndex((a, i) => !a.startsWith('-') && !(i > 0 && /^-(m|c|p)$|^--(model|config|profile)$/.test(codexArgs[i - 1])));
const held = !trusted && promptAt >= 0 ? codexArgs.splice(promptAt, 1)[0] : null;
console.log(`연구 worktree: ${wt}\n허용한 gitdir: ${gitdir}`);
if (held) console.log(`연구 hook 을 아직 trust 하지 않았다. 세션에서 /hooks 를 열어 hook 넷을 보고 trust(t) 한 뒤, 이 요청을 입력한다:\n  ${held}`);
const r = spawnSync('codex', ['--profile', 'research', '-C', wt,
  '-c', 'default_permissions="research-run"',
  '-c', 'permissions.research-run.extends="research"',
  '-c', `permissions.research-run.filesystem={${JSON.stringify(gitdir)}="write"}`,
  ...codexArgs], { stdio: 'inherit' });
process.exit(r.status ?? 1);
