#!/usr/bin/env node
// lens·recheck 의 시작과 끝을 notes/hooks.json 의 reviews 에 남긴다. 그때의 문서 sha 와 보호 집합 sha, run 과 actor 를 함께 적는다.
// ship.mjs 는 이것으로 lens 마다 시작과 완료가 짝지어졌는지, 둘이 함께 돌았는지, 읽은 뒤 문서가 바뀌었는지 본다.
// 게이트는 돌리지 않는다. 게이트는 researcher 가 끝날 때 gates.mjs 가 돌린다.
//   claude: lens 정의의 Stop(→SubagentStop) 이 done. start 는 pretool.mjs 가 남긴다.
//           researcher 의 PostToolUse(Agent) 는 돌아온 lens 의 모델만 본다.
//   codex:  profile 의 SubagentStart 가 start, SubagentStop 이 done.
import { repoRoot, docsInProgress, updateHooks, docSha, protectedSha, activeRun, openWindow, closeWindow } from './docs.mjs';
import { readEvent, pass } from './io.mjs';
import { checkModel } from './model.mjs';
import { REVIEWERS, LENSES } from '../lib/roles.mjs';

const ev = readEvent();
const root = repoRoot(ev.cwd);
const slugs = root ? docsInProgress(root) : [];

if (ev.harness === 'claude' && ev.event === 'PostToolUse') {
  await checkModel(ev, root, slugs);
  pass(ev);
}

const role = ev.agentType || ev.role;
if (!REVIEWERS.includes(role)) pass(ev);

const event = ev.event === 'SubagentStart' ? 'start' : 'done';
const runId = activeRun(root)?.runId || null;
for (const slug of slugs) {
  const entry = { at: new Date().toISOString(), agent: role, event, runId, sha: docSha(root, slug), psha: protectedSha(root, slug), actor: ev.actor, harness: ev.harness };
  // Claude 는 결과를 넘기는(handback) 단계에서 같은 subagent 의 Stop 을 한 번 더 부른다. 같은 actor·같은 문서의 완료는 하나로 친다.
  updateHooks(root, slug, (run) => {
    const rs = (run.reviews ||= []);
    if (event === 'done' && rs.some((r) => r.event === 'done' && r.actor && r.actor === entry.actor && r.sha === entry.sha && r.runId === runId)) return;
    rs.push(entry);
  });
}
if (root && LENSES.includes(role)) event === 'start' ? openWindow(root, slugs, role, runId) : closeWindow(root, role);
if (event === 'done') await checkModel(ev, root, slugs);
pass(ev);
