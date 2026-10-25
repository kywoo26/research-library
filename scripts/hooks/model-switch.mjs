#!/usr/bin/env node
// PostModelSwitch hook. 세션 모델이 바뀌면 손대고 있는 문서의 notes/hooks.json 에 남기고, 사용자와 작성자에게 알린다.
// safeguard 가 세션을 다른 모델로 넘기는 일(source "auto")은 알리지 않으면 아무도 모른 채 지나간다.
import { readInput, repoRoot, docsInProgress, updateHooks } from './docs.mjs';

const input = readInput();
if (input.source === 'resume') process.exit(0);
const root = repoRoot(input.cwd);
const slugs = root ? docsInProgress(root) : [];
const entry = { at: new Date().toISOString(), from: input.from_model ?? null, to: input.to_model ?? null, source: input.source ?? null, session: input.session_id || null };
for (const slug of slugs) updateHooks(root, slug, (run) => { (run.modelSwitches ||= []).push(entry); });
if (input.source !== 'auto') process.exit(0);
console.log(JSON.stringify({
  systemMessage: `세션 모델이 ${entry.from} 에서 ${entry.to} 로 자동으로 바뀌었다${slugs.length ? ` (${slugs.join(', ')} 의 notes/hooks.json 에 남겼다)` : ''}.`,
  hookSpecificOutput: { hookEventName: 'PostModelSwitch', additionalContext:
    `Claude Code switched this session's model from ${entry.from} to ${entry.to} on its own. Tell the owner in your next report which parts of the document were written after the switch.` },
}));
