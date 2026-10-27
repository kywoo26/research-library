// research job 하나가 쓴 토큰과 API 환산 금액. 통계로 쌓아 다음 최적화를 고르는 데 쓴다.
// 역할(researcher, lens-numbers, lens-reader, recheck, 그 밖의 보조 agent)마다 토큰 유형과 금액을 낸다.
// 세는 일은 ccusage(bunx ccusage@latest)가 한다. harness 마다 job 에 속한 기록을 역할별로 고르는 일만 ./usage/<harness>.mjs 가 맡는다.
// 형식: { tokens, usd, roles: { <역할>: { models, input, cache_write, cache_read, output, usd } } }
// 셀 수 없으면 null 이다(bunx 가 없거나, 기록을 찾지 못했을 때). ship 은 막지 않는다.
import { spawnSync } from 'node:child_process';

const cents = (x) => Math.round(x * 100) / 100;
export const TYPES = ['input', 'cache_write', 'cache_read', 'output'];

// 역할별 값으로 전체 형식을 만든다.
export const fromRoles = (roles) => {
  const names = Object.keys(roles);
  if (!names.length) return null;
  const usd = cents(names.reduce((s, r) => s + roles[r].usd, 0));
  for (const r of names) roles[r].usd = cents(roles[r].usd);
  return { tokens: names.reduce((s, r) => s + TYPES.reduce((t, k) => t + roles[r][k], 0), 0), usd, roles };
};

// ccusage claude session(--breakdown) 의 session 하나를 역할 값으로 줄인다.
export const claudeRole = (s) => ({ models: s.modelsUsed || [], input: s.inputTokens, cache_write: s.cacheCreationTokens,
  cache_read: s.cacheReadTokens, output: s.outputTokens, usd: s.totalCost });

export const ccusage = (args, env = {}) => {
  const r = spawnSync('bunx', ['ccusage@latest', ...args, '--json'], { encoding: 'utf8', timeout: 180000, env: { ...process.env, ...env } });
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
};

export async function jobUsage(harness, root) {
  try { return (await (await import(`./usage/${harness}.mjs`)).default(root)) || null; } catch { return null; }
}

const n = (x) => x.toLocaleString('en-US');
// PR 본문의 표. 역할은 금액이 큰 순서.
export const usageTable = (u) => {
  if (!u) return '셀 수 없었다';
  const rows = Object.entries(u.roles).sort((a, b) => b[1].usd - a[1].usd)
    .map(([r, x]) => `| ${r} | ${x.models.join(', ')} | ${TYPES.map((k) => n(x[k])).join(' | ')} | $${x.usd.toFixed(2)} |`);
  const sum = TYPES.map((k) => n(Object.values(u.roles).reduce((s, x) => s + x[k], 0)));
  return ['| 역할 | 모델 | input | cache write | cache read | output | API 환산 |', '|---|---|---:|---:|---:|---:|---:|',
    ...rows, `| 합계 | | ${sum.join(' | ')} | $${u.usd.toFixed(2)} |`].join('\n');
};
