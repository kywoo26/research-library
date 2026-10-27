// Codex research job = 해당 worktree 의 연구 thread 와 그 자손 전체.
// session_meta 의 계보만 읽는다. 사용량·fork replay·compaction·가격 계산은 ccusage 에 맡긴다.
import { readdirSync, readFileSync, openSync, readSync, closeSync, existsSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import * as zlib from 'node:zlib';
import { ccusage } from '../usage.mjs';

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
const cents = (n) => Math.round(n * 100) / 100;

// Codex JSON 은 models 객체다. Claude 의 modelBreakdowns 와 모양이 다르다.
export function fromReport(report) {
  const sessions = report?.sessions;
  if (!Array.isArray(sessions) || !sessions.length) return null;
  let tokens = 0, usd = 0;
  const models = {};
  for (const session of sessions) {
    const cost = session.costUSD ?? session.totalCost;
    if (!count(session.totalTokens) || !money(cost) || !session.models || Array.isArray(session.models)) return null;
    const entries = Object.entries(session.models);
    if (!entries.length && session.totalTokens) return null;
    tokens += session.totalTokens;
    usd += cost;
    let modelTokens = 0;
    for (const [model, usage] of entries) {
      if (!count(usage?.totalTokens) || usage.missingPricing) return null;
      modelTokens += usage.totalTokens;
      const amount = usage.costUSD ?? usage.cost ?? (entries.length === 1 ? cost : null);
      if (amount !== null && !money(amount)) return null;
      const previous = models[model] || { tokens: 0, usd: 0 };
      models[model] = { tokens: previous.tokens + usage.totalTokens,
        usd: previous.usd === null || amount === null ? null : previous.usd + amount };
    }
    if (modelTokens !== session.totalTokens) return null;
  }
  if (!count(tokens) || !money(usd)) return null;
  for (const value of Object.values(models)) if (value.usd !== null) value.usd = cents(value.usd);
  return { tokens, usd: cents(usd), models };
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
    mkdirSync(out);
    for (const [index, file] of files.entries()) {
      const dir = join(out, String(index));
      mkdirSync(dir);
      copyFileSync(file, join(dir, basename(file)));
    }
    // 오래된 로그의 speed fallback 도 원래 설정을 읽게 한다.
    if (existsSync(join(home, 'config.toml'))) copyFileSync(join(home, 'config.toml'), join(tmp, 'config.toml'));
    return fromReport(run(['codex', 'session'], { CODEX_HOME: tmp }));
  } catch { return null; }
  finally { if (tmp) rmSync(tmp, { recursive: true, force: true }); }
}
