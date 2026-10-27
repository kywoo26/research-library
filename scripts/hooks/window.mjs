#!/usr/bin/env node
// researcher 의 셸 명령 뒤(PostToolUse). lens 가 읽는 동안 보호 파일(문서, 원장, 고정 사본)이 바뀌었으면 그 순간 알린다.
// 막지는 않는다: 셸이 무엇을 쓸지는 명령만 보고 알 수 없고, 이미 실행된 뒤다. 알림을 받은 작성자는 두 보고가 온 뒤
// 바뀐 장을 recheck 에 넘긴다. 그러지 않으면 ship.mjs 가 그 PR 을 draft 로 연다.
// 창이 없으면(대부분의 호출) 파일 하나만 보고 바로 끝난다. git 도 부르지 않는다.
//   claude: researcher 정의의 PostToolUse(Bash)   codex: profile 의 PostToolUse(Bash|apply_patch)
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readEvent, pass } from './io.mjs';
import { windowChanges } from './docs.mjs';

const ev = readEvent();
let root = ev.cwd || process.cwd();
while (!existsSync(join(root, '.research', 'lens-window.json')) && dirname(root) !== root) root = dirname(root);
if (!existsSync(join(root, '.research', 'lens-window.json'))) pass(ev);

const changed = windowChanges(root);
if (!changed) pass(ev);
const note = `lens 가 읽는 동안 ${changed.join(', ')} 가 바뀌었다. lens 는 이 판을 보지 못한다. 문서와 원장은 두 보고가 올 때까지 그대로 두고, 보고가 오면 이 변경이 닿은 장을 recheck 에 넘긴다.`;
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: note } }) + '\n');
process.exit(0);
