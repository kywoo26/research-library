#!/usr/bin/env node
// hook 정책과 ship 판정의 시험. 두 harness 의 입력 모양으로 hook 을 실제로 돌려 notes/hooks.json 과 응답을 본다.
//   node scripts/test/hooks.test.mjs
// harness 가 실측에서 남긴 payload 는 scripts/test/fixtures/<harness>/*.json 에 있고, 있으면 정규화도 시험한다.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { verdict } from '../lib/ship-verdict.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { if (cond) pass++; else { fail++; console.log(`✗ ${name}${detail ? `\n    ${detail}` : ''}`); } };

// ── ship 판정 ───────────────────────────────────────────────────────────────
const RUN = 'run1';
const S = (agent, sha, psha = 'p', extra = {}) => ({ agent, event: 'start', sha, psha, runId: RUN, ...extra });
const D = (agent, sha, psha = 'p', extra = {}) => ({ agent, event: 'done', sha, psha, runId: RUN, ...extra });
const base = { harness: 'claude', runId: RUN, docSha: 'A' };
const why = (v) => JSON.stringify(v.reasons);
const draft = (name, v, part) => ok(name, v.reasons.some((r) => r.includes(part)), why(v));
draft('기록이 없으면 draft', verdict({ ...base }), 'lens-numbers');
draft('begin 기록이 없으면 draft', verdict({ ...base, harness: null, reviews: [S('lens-numbers', 'A'), S('lens-reader', 'A'), D('lens-numbers', 'A'), D('lens-reader', 'A')] }), 'begin');
draft('lens 하나만 끝나면 draft', verdict({ ...base, reviews: [S('lens-numbers', 'A'), D('lens-numbers', 'A')] }), 'lens-reader');
const both = [S('lens-numbers', 'A'), S('lens-reader', 'A'), D('lens-numbers', 'A'), D('lens-reader', 'A')];
ok('lens 둘이 함께 돌고 바뀐 것이 없으면 정상', verdict({ ...base, reviews: both }).reasons.length === 0, why(verdict({ ...base, reviews: both })));
draft('lens 뒤 문서가 바뀌었는데 recheck 가 없으면 draft', verdict({ ...base, docSha: 'B', reviews: both }), 'recheck');
ok('고친 문서를 recheck 가 끝까지 읽었으면 정상', verdict({ ...base, docSha: 'B', reviews: [...both, S('recheck', 'B'), D('recheck', 'B')] }).reasons.length === 0);
draft('recheck 뒤 또 바뀌면 draft', verdict({ ...base, docSha: 'C', reviews: [...both, S('recheck', 'B'), D('recheck', 'B')] }), '바뀌었다');
draft('lens 가 도는 동안 보호 파일이 바뀌면 draft',
  verdict({ ...base, reviews: [S('lens-numbers', 'A', 'p1'), S('lens-reader', 'A'), D('lens-numbers', 'A', 'p2'), D('lens-reader', 'A')] }), 'lens-numbers 가 도는 동안');
// 독립 검토(2026-10-27)가 찾은 구멍: 셋 다 정상 PR 이었다
draft('시작 없이 완료만 있으면 draft', verdict({ ...base, reviews: [D('lens-numbers', 'A'), D('lens-reader', 'A')] }), '짝지어진');
draft('lens 를 하나씩 차례로 돌리면 draft', verdict({ ...base, reviews: [S('lens-numbers', 'A'), D('lens-numbers', 'A'), S('lens-reader', 'A'), D('lens-reader', 'A')] }), '함께 돌지');
draft('한 lens 만 옛 문서를 읽었으면 draft', verdict({ ...base, reviews: [S('lens-numbers', 'OLD'), S('lens-reader', 'A'), D('lens-numbers', 'OLD'), D('lens-reader', 'A')] }), 'lens-numbers 가 읽은 뒤');
draft('지난 run 의 기록은 세지 않는다', verdict({ ...base, reviews: both.map((r) => ({ ...r, runId: 'old' })) }), '짝지어진');
ok('앞 라운드에서 원장이 바뀌었어도 다시 돈 라운드가 깨끗하면 정상',
  verdict({ ...base, reviews: [S('lens-numbers', 'A', 'p1'), S('lens-reader', 'A', 'p1'), D('lens-numbers', 'A', 'p2'), D('lens-reader', 'A', 'p2'), S('lens-numbers', 'A', 'p2'), S('lens-reader', 'A', 'p2'), D('lens-numbers', 'A', 'p2'), D('lens-reader', 'A', 'p2')] }).reasons.length === 0);
draft('lens 가 도는 동안 바꾼 것을 뒤의 recheck 가 읽지 않으면 draft', verdict({ ...base, docSha: 'B', reviews: [S('lens-numbers', 'A', 'p1'), S('lens-reader', 'A', 'p1'), D('lens-numbers', 'B', 'p2'), D('lens-reader', 'B', 'p2')] }), '도는 동안');
ok('lens 가 도는 동안 바꾼 것을 그 뒤 recheck 가 지금 문서로 읽었으면 정상', verdict({ ...base, docSha: 'B', reviews: [S('lens-numbers', 'A', 'p1'), S('lens-reader', 'A', 'p1'), D('lens-numbers', 'B', 'p2'), D('lens-reader', 'B', 'p2'), S('recheck', 'B', 'p2'), D('recheck', 'B', 'p2')] }).reasons.length === 0);
ok('Codex 는 actor 로 짝짓는다', verdict({ ...base, harness: 'codex', reviews: [S('lens-numbers', 'A', 'p', { actor: 'n1' }), S('lens-reader', 'A', 'p', { actor: 'r1' }), D('lens-reader', 'A', 'p', { actor: 'r1' }), D('lens-numbers', 'A', 'p', { actor: 'n1' })] }).reasons.length === 0);
ok('자동 모델 전환이면 내보내지 않는다', !!verdict({ ...base, reviews: both, modelSwitches: [{ source: 'auto', from: 'a', to: 'b' }] }).refuse);
ok('요청한 전환은 막지 않는다', !verdict({ ...base, reviews: both, modelSwitches: [{ source: 'user', from: 'a', to: 'b' }] }).refuse);
ok('사람이 정할 것이 남으면 draft', verdict({ ...base, reviews: both, needs: ['x'] }).reasons.length === 1);
const log = { r: { role: 'researcher', matched: 2, mismatch: 0 }, n: { role: 'lens-numbers', matched: 1, mismatch: 0 }, l: { role: 'lens-reader', matched: 1, mismatch: 0 } };
ok('모든 행위자의 모델을 봤으면 확인함', verdict({ ...base, harness: 'codex', reviews: both, modelLog: log }).modelCheck.startsWith('관찰된 전환 없음'));
ok('lens 하나의 관찰이 비면 확인 못 함, 그래도 draft 는 아니다', (() => {
  const v = verdict({ ...base, reviews: both, modelLog: { r: log.r, n: log.n } });
  return v.modelCheck.startsWith('확인 못 함') && v.reasons.length === 0;
})());
ok('관찰이 하나도 없으면 확인 못 함', verdict({ ...base, reviews: both }).modelCheck.startsWith('확인 못 함'));

// ── hook 을 실제로 돌린다 ───────────────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), 'hooks-test-'));
const repo = join(tmp, 'repo');
mkdirSync(join(repo, 'scripts'), { recursive: true });
cpSync(join(ROOT, 'scripts', 'hooks'), join(repo, 'scripts', 'hooks'), { recursive: true });
cpSync(join(ROOT, 'scripts', 'lib'), join(repo, 'scripts', 'lib'), { recursive: true });
// 게이트 대역: repo 에 .gate-fail 이 있으면 막는다
for (const g of ['check-doc', 'check-prose']) writeFileSync(join(repo, 'scripts', `${g}.mjs`), "import { existsSync } from 'node:fs'; if (existsSync('.gate-fail')) { console.log('FAIL gate'); process.exit(1); }");
const g = (a) => spawnSync('git', a, { cwd: repo, encoding: 'utf8' });
g(['init', '-q']); g(['commit', '-q', '--allow-empty', '-m', 'init']);
const slug = '2026-01-01-test-doc';
mkdirSync(join(repo, 'research', slug), { recursive: true });
mkdirSync(join(repo, '.research', slug, 'notes', 'web'), { recursive: true });
writeFileSync(join(repo, 'research', slug, 'index.html'), '<html>v1</html>');
writeFileSync(join(repo, 'research', slug, 'meta.json'), '{}');
writeFileSync(join(repo, '.research', slug, 'evidence.jsonl'), '{}\n');
const hooksJson = () => { try { return JSON.parse(readFileSync(join(repo, '.research', slug, 'notes', 'hooks.json'), 'utf8')); } catch { return {}; } };
const run = (script, args, input) => {
  const r = spawnSync('node', [join(repo, 'scripts', 'hooks', script), ...args], { input: JSON.stringify(input), encoding: 'utf8', cwd: repo, env: { ...process.env, CODEX_HOME: join(tmp, 'codex-home') } });
  let out = null; try { out = JSON.parse(r.stdout.trim().split('\n').pop()); } catch {}
  return { status: r.status, out, stderr: r.stderr };
};

// Claude: researcher 가 lens 를 띄우고, lens 가 끝난다
writeFileSync(join(repo, '.research', 'active.json'), JSON.stringify({ runId: 'R1', harness: 'claude', state: 'running', startedAt: new Date().toISOString() }));
let r = run('pretool.mjs', ['--harness=claude', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'Agent', tool_input: { subagent_type: 'lens-numbers', prompt: 'Document: research/x' }, agent_type: 'researcher', agent_id: 'r1', session_id: 's1' });
ok('claude pretool 은 허용한다', r.out?.hookSpecificOutput?.permissionDecision === 'allow', r.stderr);
writeFileSync(join(repo, '.gate-fail'), '');
{ const n = (hooksJson().reviews || []).length;
  r = run('pretool.mjs', ['--harness=claude', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'Agent', tool_input: { subagent_type: 'lens-reader', prompt: 'x' }, agent_type: 'researcher', agent_id: 'r1', session_id: 's1' });
  ok('게이트를 통과하지 못한 초고에는 lens 를 띄우지 못한다', r.out?.hookSpecificOutput?.permissionDecision === 'deny' && (hooksJson().reviews || []).length === n, JSON.stringify(r.out)); }
rmSync(join(repo, '.gate-fail'));
{ const s0 = hooksJson().reviews?.at(-1) || {};
  ok('claude spawn 은 run 과 프롬프트를 담은 start 를 남긴다', s0.event === 'start' && s0.agent === 'lens-numbers' && s0.runId === 'R1' && s0.prompt === 'Document: research/x', JSON.stringify(s0)); }
r = run('review.mjs', ['--harness=claude', '--role=lens-numbers'], { hook_event_name: 'SubagentStop', cwd: repo, agent_type: 'lens-numbers', agent_id: 'l1', session_id: 's1' });
ok('claude lens Stop 은 done 을 남긴다', hooksJson().reviews?.at(-1)?.event === 'done' && hooksJson().reviews.at(-1).agent === 'lens-numbers' && hooksJson().reviews.at(-1).runId === 'R1');
{ const n = (hooksJson().reviews || []).length;
  run('review.mjs', ['--harness=claude', '--role=lens-numbers'], { hook_event_name: 'SubagentStop', cwd: repo, agent_type: 'lens-numbers', agent_id: 'l1', session_id: 's1' });
  ok('handback 으로 같은 subagent 의 Stop 이 한 번 더 와도 done 은 하나다', (hooksJson().reviews || []).length === n); }
r = run('review.mjs', ['--harness=claude', '--role=researcher', '--event=PostToolUse'], { hook_event_name: 'PostToolUse', cwd: repo, tool_name: 'Agent', tool_input: { subagent_type: 'lens-reader' }, tool_response: { resolvedModel: 'claude-sonnet-5-5', agentId: 'l2' }, agent_type: 'researcher' });
ok('claude lens 의 응답 모델을 modelLog 에 남긴다', hooksJson().modelLog?.l2?.role === 'lens-reader' && hooksJson().modelLog.l2.matched === 1, JSON.stringify(hooksJson().modelLog));
r = run('review.mjs', ['--harness=claude', '--role=researcher', '--event=PostToolUse'], { hook_event_name: 'PostToolUse', cwd: repo, tool_name: 'Agent', tool_input: { subagent_type: 'lens-reader' }, tool_response: { resolvedModel: 'claude-sonnet-5-5', modelsUsed: ['claude-sonnet-5-5', 'claude-haiku-5-5'], agentId: 'l3' }, agent_type: 'researcher' });
ok('claude modelsUsed 가 둘이면 자동 전환으로 남긴다', (hooksJson().modelSwitches || []).some((m) => m.detectedBy === 'modelsUsed' && m.source === 'auto'));
for (const [name, tool, input] of [['Write', 'Write', { file_path: `.research/${slug}/notes/hooks.json`, content: '{}' }],
  ['셸 덮어쓰기', 'Bash', { command: `echo {} > .research/${slug}/notes/hooks.json` }], ['apply_patch', 'apply_patch', { command: `*** Update File: .research/${slug}/notes/hooks.json` }]]) {
  r = run('pretool.mjs', ['--harness=claude', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: tool, tool_input: input, agent_type: 'researcher', agent_id: 'r1' });
  ok(`hooks.json 을 고치는 ${name} 는 거부한다`, r.out?.hookSpecificOutput?.permissionDecision === 'deny', JSON.stringify(r.out));
}
r = run('pretool.mjs', ['--harness=claude', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'Bash', tool_input: { command: `cat .research/${slug}/notes/hooks.json` }, agent_type: 'researcher', agent_id: 'r1' });
ok('hooks.json 읽기는 허용한다', r.out?.hookSpecificOutput?.permissionDecision === 'allow', JSON.stringify(r.out));
for (const cmd of [`jq . .research/${slug}/notes/hooks.json 2>/dev/null`, `node -e "JSON.parse(require('fs').readFileSync('.research/${slug}/notes/hooks.json')).reviews.map(r=>r.agent)"`]) {
  r = run('pretool.mjs', ['--harness=claude', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'Bash', tool_input: { command: cmd }, agent_type: 'researcher', agent_id: 'r1' });
  ok(`hooks.json 을 읽기만 하는 명령은 허용한다: ${cmd.slice(0, 30)}`, r.out?.hookSpecificOutput?.permissionDecision === 'allow', JSON.stringify(r.out));
}

// lens 가 읽는 동안의 창: 편집 도구로 보호 파일을 고치면 막고, 셸로 바뀐 것은 그 뒤에 한 번 알린다. 창이 없으면 아무것도 하지 않는다
{
  rmSync(join(repo, '.research', slug, 'notes', 'hooks.json'), { force: true });
  rmSync(join(repo, '.research', 'lens-window.json'), { force: true });
  writeFileSync(join(repo, '.research', 'active.json'), JSON.stringify({ runId: 'RW', harness: 'claude', state: 'running', startedAt: new Date().toISOString() }));
  const P = { hook_event_name: 'PreToolUse', cwd: repo, agent_type: 'researcher', agent_id: 'r1', session_id: 's1' };
  const post = (cmd) => run('window.mjs', ['--harness=claude', '--role=researcher'], { hook_event_name: 'PostToolUse', cwd: repo, tool_name: 'Bash', tool_input: { command: cmd } });
  ok('창이 없으면 window.mjs 는 아무 말도 하지 않는다', JSON.stringify(post('ls').out) === '{}', JSON.stringify(post('ls')));
  run('pretool.mjs', ['--harness=claude', '--role=researcher'], { ...P, tool_name: 'Agent', tool_input: { subagent_type: 'lens-numbers', prompt: 'x' } });
  run('pretool.mjs', ['--harness=claude', '--role=researcher'], { ...P, tool_name: 'Agent', tool_input: { subagent_type: 'lens-reader', prompt: 'x' } });
  ok('lens 를 띄우면 창이 열린다', existsSync(join(repo, '.research', 'lens-window.json')));
  r = run('pretool.mjs', ['--harness=claude', '--role=researcher'], { ...P, tool_name: 'Write', tool_input: { file_path: join(repo, 'research', slug, 'index.html'), content: 'x' } });
  ok('창이 열린 동안 편집 도구로 문서를 고치면 막는다', r.out?.hookSpecificOutput?.permissionDecision === 'deny', JSON.stringify(r.out));
  r = run('pretool.mjs', ['--harness=claude', '--role=researcher'], { ...P, tool_name: 'Write', tool_input: { file_path: join(repo, '.research', slug, 'claims.jsonl'), content: '{}' } });
  ok('창이 열린 동안에도 claims.jsonl 은 쓸 수 있다', r.out?.hookSpecificOutput?.permissionDecision === 'allow', JSON.stringify(r.out));
  r = run('pretool.mjs', ['--harness=codex', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'apply_patch', tool_input: { command: `*** Begin Patch\n*** Update File: .research/${slug}/evidence.jsonl\n@@\n*** End Patch` }, session_id: 'P' });
  ok('창이 열린 동안 apply_patch 로 원장을 고치면 막는다', r.out?.hookSpecificOutput?.permissionDecision === 'deny', JSON.stringify(r.out));
  ok('셸로 아무것도 바꾸지 않았으면 알리지 않는다', JSON.stringify(post('ls').out) === '{}');
  writeFileSync(join(repo, 'research', slug, 'index.html'), '<html>changed while lenses read</html>');
  const w1 = post('python3 build.py');
  ok('셸로 문서가 바뀌면 바뀐 파일을 알린다', (w1.out?.hookSpecificOutput?.additionalContext || '').includes('index.html'), JSON.stringify(w1.out));
  ok('같은 변경은 다시 알리지 않는다', JSON.stringify(post('python3 build.py').out) === '{}');
  run('review.mjs', ['--harness=claude', '--role=lens-numbers'], { hook_event_name: 'SubagentStop', cwd: repo, agent_type: 'lens-numbers', agent_id: 'n9' });
  ok('lens 하나가 끝나도 창은 남는다', existsSync(join(repo, '.research', 'lens-window.json')));
  run('review.mjs', ['--harness=claude', '--role=lens-reader'], { hook_event_name: 'SubagentStop', cwd: repo, agent_type: 'lens-reader', agent_id: 'r9' });
  ok('두 lens 가 끝나면 창이 닫힌다', !existsSync(join(repo, '.research', 'lens-window.json')));
  for (const i of [1, 2]) run('pretool.mjs', ['--harness=claude', '--role=researcher'], { ...P, tool_name: 'Agent', tool_input: { subagent_type: 'recheck', prompt: 'x' } });
  r = run('pretool.mjs', ['--harness=claude', '--role=researcher'], { ...P, tool_name: 'Agent', tool_input: { subagent_type: 'recheck', prompt: 'x' } });
  ok('세 번째 recheck 는 막는다', r.out?.hookSpecificOutput?.permissionDecision === 'deny', JSON.stringify(r.out));
  writeFileSync(join(repo, 'research', slug, 'index.html'), '<html>v1</html>');
  rmSync(join(repo, '.research', 'active.json'));
}

// Codex: 하나의 profile hook 이 세션 전체에 걸린다. start 는 SubagentStart, done 은 SubagentStop 이 남긴다
rmSync(join(repo, '.research', slug, 'notes', 'hooks.json'), { force: true });
writeFileSync(join(repo, '.research', 'active.json'), JSON.stringify({ runId: 'R2', harness: 'codex', state: 'running', startedAt: new Date().toISOString() }));
r = run('pretool.mjs', ['--harness=codex', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'collaborationspawn_agent', tool_input: { agent_type: 'lens-reader', task_name: 'lens_reader', fork_turns: 'none', message: 'Document: research/x' }, session_id: 'P', model: 'gpt-6-luna' });
ok('codex pretool 허용은 빈 객체', r.out && Object.keys(r.out).length === 0, JSON.stringify(r.out));
ok('codex spawn 은 start 를 남기지 않는다(SubagentStart 가 남긴다)', !(hooksJson().reviews || []).length);
r = run('pretool.mjs', ['--harness=codex', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'collaborationspawn_agent', tool_input: { agent_type: 'lens-numbers', fork_turns: 'all', message: 'x' }, session_id: 'P', model: 'gpt-6-luna' });
ok('codex lens 를 저자 대화를 물려주며 띄우면 거부한다', r.out?.hookSpecificOutput?.permissionDecision === 'deny', JSON.stringify(r.out));
r = run('review.mjs', ['--harness=codex', '--role=researcher'], { hook_event_name: 'SubagentStart', cwd: repo, session_id: 'P', agent_id: 'C', agent_type: 'lens-reader', model: 'gpt-6-luna' });
ok('codex SubagentStart 는 actor 를 담은 start 를 남긴다', hooksJson().reviews?.at(-1)?.event === 'start' && hooksJson().reviews.at(-1).actor === 'C' && hooksJson().reviews.at(-1).runId === 'R2');
r = run('pretool.mjs', ['--harness=codex', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch' }, session_id: 'P', agent_id: 'C', agent_type: 'lens-reader', model: 'gpt-6-luna' });
ok('codex lens 의 apply_patch 는 거부한다(등록 인자보다 실제 agent_type)', r.out?.hookSpecificOutput?.permissionDecision === 'deny', JSON.stringify(r.out));
r = run('review.mjs', ['--harness=codex', '--role=researcher'], { hook_event_name: 'SubagentStop', cwd: repo, session_id: 'P', agent_id: 'C', agent_type: 'lens-reader', model: 'gpt-6-luna', stop_hook_active: false });
ok('codex SubagentStop 은 actor 를 담은 done 을 남긴다', hooksJson().reviews?.at(-1)?.event === 'done' && hooksJson().reviews.at(-1).actor === 'C');
rmSync(join(repo, '.research', 'active.json'));

// Codex: 서버가 보고한 모델은 Codex 자신의 SQLite 로그에만 남는다. 이번 run 이 시작한 뒤의 행만 본다
{
  const { DatabaseSync } = await import('node:sqlite');
  mkdirSync(join(tmp, 'codex-home'), { recursive: true });
  const db = new DatabaseSync(join(tmp, 'codex-home', 'logs_2.sqlite'));
  db.exec('CREATE TABLE logs (id INTEGER PRIMARY KEY, ts INTEGER, ts_nanos INTEGER, level TEXT, target TEXT, feedback_log_body TEXT, module_path TEXT, file TEXT, line INTEGER, thread_id TEXT, process_uuid TEXT, estimated_bytes INTEGER)');
  const now = Math.floor(Date.now() / 1000);
  const ins = db.prepare('INSERT INTO logs (ts, level, target, feedback_log_body, thread_id) VALUES (?, ?, ?, ?, ?)');
  ins.run(now - 86400, 'WARN', 'codex_core::session', 'session_loop{model=gpt-6-luna}: server reported model old-run while requested model was gpt-6-luna', 'P');
  ins.run(now, 'INFO', 'codex_core::session', 'session_loop{model=gpt-6-luna}: server reported model gpt-6-luna (matches requested model)', 'P');
  db.close();
  writeFileSync(join(repo, '.research', 'active.json'), JSON.stringify({ harness: 'codex', state: 'running', startedAt: new Date((now - 60) * 1000).toISOString() }));
  rmSync(join(repo, '.research', slug, 'notes', 'hooks.json'), { force: true });
  r = run('pretool.mjs', ['--harness=codex', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'Bash', tool_input: { command: 'ls' }, session_id: 'P', model: 'gpt-6-luna' });
  ok('codex 이전 run 의 불일치 행은 보지 않는다', Object.keys(r.out || {}).length === 0 && !(hooksJson().modelSwitches || []).length, JSON.stringify(r.out));
  ok('codex 일치 로그는 matched 로 센다', hooksJson().modelLog?.P?.matched === 1, JSON.stringify(hooksJson().modelLog));
  const db2 = new DatabaseSync(join(tmp, 'codex-home', 'logs_2.sqlite'));
  db2.prepare('INSERT INTO logs (ts, level, target, feedback_log_body, thread_id) VALUES (?, ?, ?, ?, ?)').run(now, 'WARN', 'codex_core::session', 'session_loop{model=gpt-6-luna}: server reported model gpt-5.2 while requested model was gpt-6-luna', 'P');
  db2.close();
  r = run('pretool.mjs', ['--harness=codex', '--role=researcher'], { hook_event_name: 'PreToolUse', cwd: repo, tool_name: 'Bash', tool_input: { command: 'ls' }, session_id: 'P', model: 'gpt-6-luna' });
  ok('codex reroute 로그가 보이면 막고 증거를 남긴다', r.out?.hookSpecificOutput?.permissionDecision === 'deny'
    && (hooksJson().modelSwitches || []).some((m) => m.detectedBy === 'codex-log' && m.to === 'gpt-5.2') && hooksJson().modelLog?.P?.evidence?.length === 1, JSON.stringify(hooksJson()));
  rmSync(join(repo, '.research', 'active.json'));
}

// 실측 payload 가 있으면 정규화가 깨지지 않는지 본다
for (const h of ['codex']) {
  const dir = join(ROOT, 'scripts', 'test', 'fixtures', h);
  for (const f of existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')) : []) {
    const input = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const res = spawnSync('node', ['-e', `import('${join(ROOT, 'scripts', 'hooks', 'io.mjs')}').then(m=>console.log(JSON.stringify(m.readEvent())))`, '--', `--harness=${h}`], { input: JSON.stringify(input), encoding: 'utf8' });
    let ev = null; try { ev = JSON.parse(res.stdout); } catch {}
    ok(`fixture ${h}/${f} 정규화`, ev && ev.harness === h && (ev.actor || ev.session), res.stderr);
    if (/spawn/.test(f)) ok(`fixture ${h}/${f} 의 띄운 역할`, ['lens-numbers', 'lens-reader', 'recheck', 'researcher'].includes(ev?.spawned), JSON.stringify(ev?.spawned));
  }
}

rmSync(tmp, { recursive: true, force: true });
console.log(`${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
