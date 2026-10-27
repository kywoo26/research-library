// research job 하나가 쓴 토큰과 API 환산 금액. 통계를 쌓으려는 기록이라 합계와 모델별 값만 낸다.
// 세는 일은 ccusage(bunx ccusage@latest)가 한다. harness 마다 job 에 속한 기록을 고르는 일만 ./usage/<harness>.mjs 가 맡는다.
// 모델별 금액을 ccusage 가 주지 않으면 그 모델의 usd 는 null 이다(합계 usd 는 있다).
// 셀 수 없으면 null 이다(bunx 가 없거나, 기록을 찾지 못했을 때). ship 은 막지 않는다.
import { spawnSync } from 'node:child_process';

// ccusage JSON 의 session 하나(--breakdown)를 { tokens, usd, models } 로 줄인다.
export const fromSession = (s) => s && {
  tokens: s.totalTokens,
  usd: Math.round(s.totalCost * 100) / 100,
  models: Object.fromEntries((s.modelBreakdowns || []).map((m) => [m.modelName,
    { tokens: m.inputTokens + m.outputTokens + m.cacheCreationTokens + m.cacheReadTokens, usd: Math.round(m.cost * 100) / 100 }])),
};

export const ccusage = (args, env = {}) => {
  const r = spawnSync('bunx', ['ccusage@latest', ...args, '--json'], { encoding: 'utf8', timeout: 180000, env: { ...process.env, ...env } });
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
};

export async function jobUsage(harness, root) {
  try { return (await (await import(`./usage/${harness}.mjs`)).default(root)) || null; } catch { return null; }
}

export const usageLine = (u) => (u
  ? `${u.tokens.toLocaleString('en-US')} tokens, API 환산 $${u.usd.toFixed(2)} (${Object.entries(u.models).map(([m, x]) => `${m} ${x.usd == null ? `${x.tokens.toLocaleString('en-US')} tokens` : `$${x.usd.toFixed(2)}`}`).join(', ')})`
  : '셀 수 없었다');
