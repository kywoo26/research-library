// hook 입출력을 harness 와 상관없는 한 모양으로 바꾸고, 응답을 그 harness 의 문법으로 낸다.
// 정책(pretool, review, gates)은 이 모양만 본다. harness 와 역할은 등록 파일이 인자로 넘긴다:
//   node scripts/hooks/<x>.mjs --harness=claude|codex --role=researcher|lens-numbers|lens-reader|recheck [--event=...]
// env 로 harness 를 정하지 않는다. 다른 harness 안에서 띄운 세션에는 바깥의 env 가 새어 들어온다.
import { readInput } from './docs.mjs';

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=') || null;

// 각 harness 의 하위 agent 띄우기 도구와, 그 호출에서 역할 이름이 들어 있는 자리.
const SPAWN = {
  claude: (i) => (['Agent', 'Task'].includes(i.tool_name) ? i.tool_input?.subagent_type : null),
  codex: (i) => (/spawn_agent$/.test(i.tool_name || '') ? i.tool_input?.agent_type : null),
};

export function readEvent() {
  const harness = arg('harness') || 'claude';
  const raw = readInput();
  return {
    harness,
    role: arg('role'),
    event: arg('event') || raw.hook_event_name || null,
    raw,
    session: raw.session_id,
    // Codex 는 부모·자식이 session_id 를 같이 쓴다. 행위자는 agent_id 로 가른다.
    actor: raw.agent_id || raw.session_id || null,
    agentType: raw.agent_type || null,
    tool: raw.tool_name,
    toolInput: raw.tool_input,
    spawned: SPAWN[harness]?.(raw) || null,
    model: raw.model || null,
    cwd: raw.cwd,
    transcript: raw.agent_transcript_path || raw.transcript_path || null,
    stopActive: !!raw.stop_hook_active,
  };
}

const out = (o) => { process.stdout.write(JSON.stringify(o) + '\n'); process.exit(0); };

export function allow(ev, reason) {
  if (ev.harness === 'codex') out({});
  out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: reason } });
}

export function deny(ev, reason) {
  out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
}

// 끝나지 못하게 한다.
export function block(ev, reason) {
  out({ decision: 'block', reason });
}

// 아무것도 정하지 않고 넘긴다.
export function pass(ev, message) {
  out(message ? { systemMessage: message } : {});
}
