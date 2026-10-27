// Codex research job = 해당 worktree 의 연구 thread 와 그 자손 전체.
// session_meta 의 계보만 읽는다. 사용량·fork replay·compaction·가격 계산은 ccusage 에 맡긴다.
import { readdirSync, readFileSync, openSync, readSync, closeSync, existsSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import * as zlib from 'node:zlib';
import { ccusage, fromRoles, TYPES } from '../usage.mjs';

// 첫 session_meta 가 이 파일의 thread 다. 뒤에는 fork 로 복사된 부모 metadata 가 올 수 있다.
function metadata(file) {
  try {
    let line;
    if (file.endsWith('.zst')) {
      line = zlib.zstdDecompressSync(readFileSync(file)).toString('utf8').split('\n', 1)[0];
    } else {
      const fd = openSync(file, 'r');
      const chunks = [];
      try {
        const buffer = Buffer.alloc(8192);
        for (;;) {
          const n = readSync(fd, buffer, 0, buffer.length, null);
          if (!n) break;
          const end = buffer.subarray(0, n).indexOf(10);
          chunks.push(Buffer.from(buffer.subarray(0, end < 0 ? n : end)));
          if (end >= 0) break;
        }
      } finally { closeSync(fd); }
      line = Buffer.concat(chunks).toString('utf8');
    }
    const record = JSON.parse(line);
    const m = record.type === 'session_meta' && record.payload;
    if (!m?.id || typeof m.cwd !== 'string') return null;
    return { file, id: m.id, cwd: resolve(m.cwd),
      role: m.source?.subagent?.thread_spawn?.agent_role || m.agent_role || 'default',
      parent: m.source?.subagent?.thread_spawn?.parent_thread_id || m.parent_thread_id || m.forked_from_id };
  } catch { return null; }
}

function rollouts(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return rollouts(path);
    return entry.isFile() && /\.jsonl(?:\.zst)?$/.test(entry.name) ? [path] : [];
  });
}

export function jobFiles(home, root, threadId) {
  const byId = new Map();
  // active 를 archived 보다, 같은 rollout 의 plain 을 zstd 보다 우선한다.
  const dirs = ['sessions', 'archived_sessions'].map((d) => join(home, d));
  for (const dir of dirs.some(existsSync) ? dirs : [home]) {
    for (const file of rollouts(dir)) {
      const m = metadata(file);
      if (m && !byId.has(m.id)) byId.set(m.id, m);
    }
  }
  const cwd = resolve(root);
  const candidates = threadId ? [byId.get(threadId)].filter(Boolean)
    : [...byId.values()].filter((m) => !m.parent && m.cwd === cwd);
  if (candidates.length !== 1 || candidates[0].cwd !== cwd) return [];
  const ids = new Set([candidates[0].id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const m of byId.values()) {
      if (!ids.has(m.id) && ids.has(m.parent)) { ids.add(m.id); grew = true; }
    }
  }
  return [...ids].map((id) => byId.get(id).file);
}

const count = (n) => Number.isSafeInteger(n) && n >= 0;
const money = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const sessionKey = (id) => typeof id === 'string' ? id.replaceAll('\\', '/').replace(/\.jsonl(?:\.zst)?$/, '') : '';

// ccusage Codex JSON 의 inputTokens 는 cache 제외, cacheCreationTokens 는 cache write 다.
// outputTokens 에 reasoning 이 포함된다. totalTokens/reasoningOutputTokens 를 다시 더하지 않는다.
export function fromReport(report, sessionRoles) {
  const sessions = report?.sessions;
  if (!Array.isArray(sessions) || !sessions.length) return null;
  const roles = new Map();
  for (const session of sessions) {
    const role = sessionRoles?.get(sessionKey(session.sessionId));
    if (typeof role !== 'string' || !role) return null;
    const values = { input: session.inputTokens, cache_write: session.cacheCreationTokens ?? 0,
      cache_read: session.cacheReadTokens ?? 0, output: session.outputTokens };
    if (!count(session.totalTokens) || TYPES.some((key) => !count(values[key]))) return null;
    if (TYPES.reduce((sum, key) => sum + values[key], 0) !== session.totalTokens) return null;
    const cost = session.costUSD ?? session.totalCost;
    if (!session.models || typeof session.models !== 'object' || Array.isArray(session.models)) return null;
    const entries = Object.entries(session.models);
    if (!entries.length && session.totalTokens) return null;
    const row = roles.get(role) || { models: [], input: 0, cache_write: 0, cache_read: 0, output: 0, usd: 0 };
    for (const [model] of entries) if (!row.models.includes(model)) row.models.push(model);
    for (const key of TYPES) row[key] += values[key];
    if (row.usd === null || !money(cost) || entries.some(([, model]) => model?.missingPricing)) row.usd = null;
    else row.usd += cost;
    if (TYPES.some((key) => !count(row[key]))) return null;
    roles.set(role, row);
  }
  for (const row of roles.values()) {
    row.models.sort();
    if (row.usd !== null && !money(row.usd)) return null;
  }
  const result = fromRoles(Object.fromEntries(roles));
  return result && count(result.tokens) ? result : null;
}

// options 는 bunx 없이 선별·전달을 시험할 때만 바꾼다.
export default function usage(root, {
  home = process.env.CODEX_HOME || join(homedir(), '.codex'),
  threadId = process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID,
  run = ccusage,
} = {}) {
  let tmp;
  try {
    const files = jobFiles(home, root, threadId);
    if (!files.length) return null;
    tmp = mkdtempSync(join(tmpdir(), 'research-usage-codex-'));
    const out = join(tmp, 'sessions');
    const sessionRoles = new Map();
    mkdirSync(out);
    for (const [index, file] of files.entries()) {
      const dir = join(out, String(index));
      mkdirSync(dir);
      copyFileSync(file, join(dir, basename(file)));
      const role = index === 0 ? 'researcher' : metadata(file)?.role;
      if (typeof role !== 'string' || !role) return null;
      sessionRoles.set(sessionKey(`${index}/${basename(file)}`), role);
    }
    // 오래된 로그의 speed fallback 도 원래 설정을 읽게 한다.
    if (existsSync(join(home, 'config.toml'))) copyFileSync(join(home, 'config.toml'), join(tmp, 'config.toml'));
    return fromReport(run(['codex', 'session'], { CODEX_HOME: tmp }), sessionRoles);
  } catch { return null; }
  finally { if (tmp) rmSync(tmp, { recursive: true, force: true }); }
}
