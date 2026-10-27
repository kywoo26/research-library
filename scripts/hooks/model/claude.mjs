// Claude 의 모델 관찰. 보조 관찰이고 공식 계약이 아니다: 아래 두 출처만 쓴다.
//   researcher: 자기 transcript 의 assistant 줄에 남은 "model". transcript 형식은 문서화된 인터페이스가 아니다.
//   lens·recheck: researcher 의 PostToolUse(Agent) 응답의 resolvedModel·modelsUsed. foreground 실행에서만 온다.
// 제거 조건: Claude Code 가 subagent 의 모델 전환을 hook 으로 알리게 되면 transcript 읽기를 지운다.
import { readFileSync } from 'node:fs';

const transcript = (raw) => raw.agent_transcript_path
  || (raw.transcript_path && raw.agent_id ? `${raw.transcript_path.replace(/\.jsonl$/, '')}/subagents/agent-${raw.agent_id}.jsonl` : null);

// { actor, role, models } 하나, 또는 볼 것이 없으면 null.
export function observe(ev, lenses) {
  const raw = ev.raw;
  if (ev.event === 'PostToolUse' && lenses.includes(ev.toolInput?.subagent_type)) {
    const resp = raw.tool_response || {};
    const models = Array.isArray(resp.modelsUsed) && resp.modelsUsed.length ? resp.modelsUsed : resp.resolvedModel ? [resp.resolvedModel] : [];
    return { actor: resp.agentId || ev.toolInput.subagent_type, role: ev.toolInput.subagent_type, models };
  }
  if (raw.agent_type !== 'researcher') return null;
  const path = transcript(raw);
  if (!path) return null;
  const models = [];
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.includes('"assistant"') && /"model":\s*"([^"<][^"]*)"/.exec(line);
      if (m && !models.includes(m[1])) models.push(m[1]);
    }
  } catch { return { actor: ev.actor, role: 'researcher', models: [], unavailable: 'transcript 를 읽지 못했다' }; }
  return { actor: ev.actor, role: 'researcher', models };
}
