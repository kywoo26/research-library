#!/usr/bin/env node
// researcher 와 그가 띄우는 렌즈·recheck 의 PreToolUse hook. 소유자가 PR 까지 전권을 맡겼으므로 도구 호출을 허용한다
// (저장소의 deny 규칙과 위험한 삭제 차단은 그대로 남는다). 렌즈나 재검증을 띄우는 순간에는 그때의 문서
// sha 를 run.json 의 reviews 에 남긴다. ship.mjs 가 이것으로 재검증 뒤에 문서가 바뀌었는지 본다.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readInput, repoRoot, docsInProgress, updateRun } from './docs.mjs';

const REVIEWERS = ['lens-numbers', 'lens-reader', 'recheck'];
const input = readInput();
const agent = input.tool_name === 'Agent' ? input.tool_input?.subagent_type : null;
if (REVIEWERS.includes(agent)) {
  const root = repoRoot(input.cwd);
  for (const slug of root ? docsInProgress(root) : []) {
    const sha = createHash('sha256').update(readFileSync(join(root, 'research', slug, 'index.html'))).digest('hex');
    updateRun(root, slug, (run) => { (run.reviews ||= []).push({ at: new Date().toISOString(), agent, sha }); });
  }
}
// subagent 안의 safeguard fallback 은 PostModelSwitch 를 부르지 않고 조용히 모델을 바꾼다(2.1.310 에서 확인).
// researcher 자신의 기록에서 모델이 바뀌었는지 보고 modelSwitches 에 남긴다. ship.mjs 는 그 PR 을 draft 로 연다.
if (input.agent_type === 'researcher' && input.agent_id && input.transcript_path) {
  const path = `${input.transcript_path.replace(/\.jsonl$/, '')}/subagents/agent-${input.agent_id}.jsonl`;
  const models = [];
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.includes('"assistant"') && /"model":\s*"([^"<][^"]*)"/.exec(line);
      if (m && !models.includes(m[1])) models.push(m[1]);
    }
  } catch {}
  const root = models.length > 1 ? repoRoot(input.cwd) : null;
  for (const slug of root ? docsInProgress(root) : []) {
    updateRun(root, slug, (run) => {
      const seen = new Set((run.modelSwitches || []).map((s) => s.to));
      for (const to of models.slice(1).filter((m) => !seen.has(m))) {
        (run.modelSwitches ||= []).push({ at: new Date().toISOString(), from: models[0], to, source: 'auto', detectedBy: 'transcript' });
      }
    });
  }
  // 바뀐 모델이 이어 쓰지 못하게 그 뒤의 도구 호출을 모두 막는다.
  if (models.length > 1) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
      permissionDecisionReason: `모델이 ${models[0]} 에서 ${models.slice(1).join(', ')} 로 바뀌었다. 더 진행하지 말고, 멈춘 지점과 그때 쓰던 장을 보고하고 끝낸다.` } }));
    process.exit(0);
  }
}
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: '소유자가 researcher 에게 PR 까지 맡겼다' } }));
