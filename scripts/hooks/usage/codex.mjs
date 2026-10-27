// token_count 는 thread 누계다. snapshot 을 더하지 않고 마지막 유효 누계만 쓴다.
// 서로 다른 요청 모델이 나온 thread 는 모델별 분배를 추측하지 않는다. 이 값은
// 실제 서버 모델의 증거가 아니며, 자식 thread 사용량도 포함하지 않는다.
import { readFileSync } from 'node:fs';

const COUNTERS = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens',
  'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const REQUIRED = ['input_tokens', 'output_tokens', 'total_tokens'];

export default function usage(ev) {
  const path = ev.transcript || ev.raw?.agent_transcript_path || ev.raw?.transcript_path;
  if (!path) return null;
  let last = null;
  const models = new Set();
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      let d; try { d = JSON.parse(line); } catch { continue; }
      if (d?.type === 'turn_context' && typeof d.payload?.model === 'string' && d.payload.model) models.add(d.payload.model);
      if (d?.type !== 'event_msg' || d.payload?.type !== 'token_count') continue;
      const usage = d.payload.info?.total_token_usage;
      // info:null 은 rate-limit만 알리는 이벤트에도 나온다. 마지막 유효 누계를 유지한다.
      if (usage == null) continue;
      if (typeof usage !== 'object' || REQUIRED.some((k) => !(k in usage))) return null;
      const entries = COUNTERS.filter((k) => k in usage).map((k) => [k, usage[k]]);
      if (entries.some(([, value]) => !Number.isSafeInteger(value) || value < 0)) return null;
      last = Object.fromEntries(entries);
    }
  } catch { return null; }
  if (!last) return null;
  // hook.model 은 마지막 요청 모델일 뿐, 과거 누계를 그 모델에 귀속시킬 근거는 아니다.
  const model = models.size === 1 ? [...models][0] : 'unknown';
  const role = ev.agentType || ev.role || 'researcher';
  return {
    total: { [model]: last }, byAgent: { [role]: { [model]: last } }, children: 'unknown',
    scope: 'thread-cumulative', modelAttribution: models.size === 1 ? 'requested' : 'unknown',
  };
}
