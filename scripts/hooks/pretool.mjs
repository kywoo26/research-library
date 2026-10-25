#!/usr/bin/env node
// researcher 의 PreToolUse hook. 소유자가 PR 까지 전권을 맡겼으므로 이 subagent 의 도구 호출을 허용한다
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
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: '소유자가 researcher 에게 PR 까지 맡겼다' } }));
