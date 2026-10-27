// researcher 와 그가 띄운 lens·재검증의 기록에서 메시지별 토큰을 모델별로 합산한다. 금액은 남지 않는다.
// 중첩 subagent 의 기록은 같은 subagents 폴더에 놓이므로, researcher 가 시작한 뒤에 쓰인 것만 센다.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

export default function usage(ev) {
  const transcript = ev.raw.agent_transcript_path;
  if (!transcript) return null;
  const dir = dirname(transcript);
  const AGENTS = ['researcher', 'lens-numbers', 'lens-reader', 'recheck'];
  let since = 0;
  try { since = statSync(transcript).birthtimeMs || 0; } catch {}
  const byAgent = {}, total = {}, seen = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.jsonl'))) {
    const path = join(dir, f);
    let type = 'unknown';
    try { type = JSON.parse(readFileSync(path.replace(/\.jsonl$/, '.meta.json'), 'utf8')).agentType || type; } catch {}
    if (path !== transcript && (!AGENTS.includes(type) || statSync(path).mtimeMs < since)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      let m; try { m = JSON.parse(line); } catch { continue; }
      const msg = m.type === 'assistant' && m.message;
      if (!msg?.usage || !msg.model || msg.model.startsWith('<') || seen.has(msg.id)) continue;
      seen.add(msg.id);
      for (const bucket of [((byAgent[type] ||= {})[msg.model] ||= {}), (total[msg.model] ||= {})]) {
        for (const k of ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens']) bucket[k] = (bucket[k] || 0) + (msg.usage[k] || 0);
      }
    }
  }
  return { total, byAgent };
}
