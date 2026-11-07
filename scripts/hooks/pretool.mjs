#!/usr/bin/env node
// researcher 와 그가 띄우는 lens·recheck 의 PreToolUse hook. 소유자가 PR 까지 전권을 맡겼으므로 도구 호출을 허용한다
// (저장소의 deny 규칙과 위험한 삭제 차단은 그대로 남는다). 막는 것은 여덟이다:
//   lens·recheck 가 쓰기 도구를 부를 때. 셸로 쓰는 길은 남으므로 review.mjs 가 끝날 때의 sha 로 탐지한다.
//   누구든 notes/hooks.json 을 고치려 할 때. 검증 기록은 hook 만 쓴다(읽기는 된다).
//   게이트(check-doc, check-prose)를 통과하지 못한 초고에 lens 를 띄울 때.
//   lens 가 읽는 동안 편집 도구로 문서나 원장을 고칠 때(셸로 쓴 것은 window.mjs 가 그 뒤에 알린다).
//   이번 run 에서 네 번째 recheck 를 띄울 때. 수정은 두 라운드와 마지막 좁히기까지다.
//   Claude 에서 검토 역할을 background 로 띄우거나, researcher 가 SendMessage 로 agent 를 이어 부를 때.
//   Codex 에서 lens·recheck 를 저자의 대화를 물려주며(fork_turns 가 "none" 이 아니게) 띄울 때.
//   모델이 저절로 바뀐 것이 보일 때.
// Claude 에서 lens·recheck 를 띄우는 순간에는 그때의 문서 sha 를 reviews 에 "start" 로 남긴다(Codex 는 SubagentStart 가
// 남긴다, review.mjs). 띄울 때 넘긴 프롬프트도 함께 남겨, 저자의 맥락이 lens 에 새지 않았는지 나중에 볼 수 있게 한다.
// Codex 의 hook 입력에서는 그 메시지가 암호화돼 있어 남기지 않는다.
import { repoRoot, docsInProgress, updateHooks, docSha, protectedSha, activeRun, readHooks, readWindow, openWindow, isProtected } from './docs.mjs';
import { relative, isAbsolute } from 'node:path';
import { readEvent, allow, deny, pass } from './io.mjs';
import { checkModel } from './model.mjs';
import { ROLES, REVIEWERS, LENSES } from '../lib/roles.mjs';
import { spawnSync } from 'node:child_process';

// harness 마다 파일을 고치는 도구.
const WRITES = /^(Edit|Write|NotebookEdit|MultiEdit|apply_patch)$/;
// 편집 도구가 겨눈 경로(Claude 는 file_path, Codex apply_patch 는 패치의 파일 줄).
const editTargets = (ev) => [ev.toolInput?.file_path, ev.toolInput?.notebook_path,
  ...[...String(ev.toolInput?.command || ev.toolInput?.input || '').matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)].map((m) => m[1].trim())]
  .filter(Boolean);
// 검증 기록을 쓰는 호출인가. 편집 도구는 겨눈 경로만, 셸은 명령이 그 파일을 쓰는 꼴만 본다.
// 그 파일 이름을 담은 코드나 문서를 고치는 것은 막지 않는다(hook 이 모든 세션에 걸리므로 소유자의 하네스 작업도 지나간다).
const RECORD = /(^|\/)notes\/hooks\.json$/;
function writesRecord(ev) {
  if (WRITES.test(ev.tool || '')) return editTargets(ev).some((p) => RECORD.test(p));
  return SHELL_WRITE.test(String(ev.toolInput?.command ?? ''));
}
// 셸이 hooks.json 을 쓰는 꼴만 본다. `2>/dev/null` 이나 `=>` 처럼 그 파일을 읽기만 하는 명령은 막지 않는다.
const SHELL_WRITE = /(>{1,2}\s*['"]?[^\s'"|;&]*hooks\.json|\b(tee|truncate|rm|mv|cp)\b[^|;&]*hooks\.json|\bsed\s+-i[^|;&]*hooks\.json|writeFile[^)]*hooks\.json|open\([^)]*hooks\.json[^)]*['"][wa])/;

const ev = readEvent();
// 실제 행위자의 agent_type 을 등록 인자보다 먼저 본다. Codex 는 profile 의 hook 하나가 세션 전체에 걸리고,
// Claude 는 이 hook 을 .claude/settings.json 에 두어 이 저장소의 모든 세션에 걸린다(agent frontmatter 의 hook 은
// trust 없는 세션에서 돌지 않는다, docs/harness-parity.md 13행).
const role = ev.agentType || ev.role;

if (writesRecord(ev)) {
  deny(ev, 'notes/hooks.json 은 hook 이 남기는 검증 기록이다. 고치지 않는다. 기록이 틀렸다고 보이면 보고에 적는다.');
}
// 연구 체인의 역할이 아니면(소유자 세션, 다른 agent) 아무것도 정하지 않고 넘긴다. git 도 부르지 않는다.
if (!ROLES.includes(role)) pass(ev);
if (REVIEWERS.includes(role) && WRITES.test(ev.tool || '')) {
  deny(ev, `${role} 는 읽기만 한다. 고칠 것은 보고에 적어 작성자에게 돌려준다.`);
}
const root = repoRoot(ev.cwd);
const slugs = root ? docsInProgress(root) : [];

// lens 가 읽는 동안: 편집 도구가 겨눈 경로만 본다.
if (root && WRITES.test(ev.tool || '') && readWindow(root)) {
  const targets = editTargets(ev).map((p) => (isAbsolute(p) ? relative(root, p) : p));
  const hit = targets.find((t) => slugs.some((s) => isProtected(t, s)));
  if (hit) deny(ev, `lens 가 읽는 중이다. ${hit} 는 두 보고가 온 뒤에 고친다. 그동안 claims.jsonl 과 notes/ 의 작업 파일은 써도 된다.`);
}
// Claude 의 검토 역할은 새 foreground Agent 호출로만 띄운다. background 로 띄우면 researcher 가 결과를 기다리며 턴을
// 끝내고, 결과는 researcher 가 아니라 소유자 세션으로 간다. 끝난 agent 를 SendMessage 로 다시 깨우면 시작 기록 없이 돌아
// recheck 횟수에도 잡히지 않고, ship.mjs 가 그 완료를 짝으로 세지 못한다(2026-11-07, PR #54).
if (ev.harness === 'claude' && role === 'researcher' && REVIEWERS.includes(ev.spawned) && ev.toolInput?.run_in_background !== false) {
  deny(ev, `${ev.spawned} 는 foreground 로 띄운다. run_in_background: false 를 주고 다시 부른다. 두 lens 는 한 메시지에 두 호출로 함께 띄운다.`);
}
if (ev.harness === 'claude' && role === 'researcher' && ev.tool === 'SendMessage') {
  deny(ev, '검토 역할을 이어 부르지 않는다. 다시 읽힐 것이 있으면 Agent 로 새 recheck 를 foreground 로 띄운다.');
}
if (ev.spawned === 'recheck' && root) {
  const runId = activeRun(root)?.runId;
  const n = Math.max(0, ...slugs.map((s) => (readHooks(root, s).reviews || []).filter((r) => r.agent === 'recheck' && r.event === 'start' && r.runId === runId).length));
  if (n >= 3) deny(ev, 'recheck 는 이번 run 에서 이미 세 번 돌았다. 남은 지적은 run.json 의 unfixed 에 적고 ship 한다.');
}

// lens 는 게이트를 통과한 초고를 읽는다. 통과하지 못한 초고에 lens 를 쓰면 그 보고는 고친 뒤에 다시 받아야 한다.
if (LENSES.includes(ev.spawned)) {
  for (const slug of slugs) for (const gate of ['check-doc', 'check-prose']) {
    const r = spawnSync('node', [`scripts/${gate}.mjs`, `research/${slug}`], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) deny(ev, `${slug} 가 ${gate} 를 통과하지 못했다. 고치고 다시 읽은 뒤 lens 를 띄운다.\n${(r.stdout + r.stderr).trim().split('\n').slice(-6).join('\n')}`);
  }
}
if (ev.harness === 'codex' && REVIEWERS.includes(ev.spawned) && ev.toolInput?.fork_turns !== 'none') {
  deny(ev, `${ev.spawned} 는 저자의 대화 없이 읽어야 한다. fork_turns 를 "none" 으로 주고 다시 띄운다.`);
}
if (ev.harness === 'claude' && role === 'researcher' && REVIEWERS.includes(ev.spawned)) {
  const runId = activeRun(root)?.runId || null;
  for (const slug of slugs) {
    const entry = { at: new Date().toISOString(), agent: ev.spawned, event: 'start', runId, sha: docSha(root, slug), psha: protectedSha(root, slug), prompt: ev.toolInput?.prompt ?? null, harness: ev.harness };
    updateHooks(root, slug, (run) => { (run.reviews ||= []).push(entry); });
  }
  if (LENSES.includes(ev.spawned)) openWindow(root, slugs, ev.spawned, runId);
}

const switched = await checkModel(ev, root, slugs);
if (switched) {
  // 바뀐 모델이 이어 쓰지 못하게 그 뒤의 도구 호출을 모두 막는다.
  deny(ev, `모델이 ${switched.from} 에서 ${switched.to} 로 바뀌었다. 더 진행하지 말고, 멈춘 지점과 그때 쓰던 장을 보고하고 끝낸다.`);
}
allow(ev, '소유자가 researcher 에게 PR 까지 맡겼다');
