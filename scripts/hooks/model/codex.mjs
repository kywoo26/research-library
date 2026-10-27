// Codex 의 모델 관찰. 보조 관찰이고 공식 계약이 아니다.
// hook 입력의 model 은 요청한 모델이라 reroute 에 바뀌지 않는다. Codex 가 자기 SQLite 로그에 남기는
// "server reported model X while requested model was Y" 를 actor(thread)별로 읽는다. 대화형 세션에만 있고,
// 테이블·target·문구는 버전에 따라 바뀔 수 있다. 0.164.0 에서 실제 서버로 돌린 연구 세션(2026-10-27)에는 이 줄이 하나도
// 없었다(가짜 서버가 OpenAI-Model 헤더를 보낼 때만 보였다). 그러니 대개 "확인 못 함"이 되고, 보이면 전환으로 막는다.
// 제거 조건: hook 이 공식 model/rerouted 이벤트(app-server 에는 있다)를 받을 수 있게 되면 이 파일을 지운다.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// { actor, role, matched, mismatches:[{id,ts,to,from,body}], db } 또는 { unavailable }.
export async function observe(ev, since) {
  const homes = [process.env.CODEX_SQLITE_HOME, process.env.CODEX_HOME || join(homedir(), '.codex')].filter(Boolean);
  const db = homes.flatMap((h) => [join(h, 'logs_2.sqlite'), join(h, 'log', 'logs_2.sqlite')]).find(existsSync);
  const base = { actor: ev.actor || 'unknown', role: ev.agentType || 'researcher' };
  if (!db) return { ...base, unavailable: 'Codex 로그 DB 를 찾지 못했다' };
  if (!ev.actor) return { ...base, unavailable: 'actor 가 없다' };
  let rows = [], con = null;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    con = new DatabaseSync(db, { readOnly: true });
    const cols = con.prepare('PRAGMA table_info(logs)').all().map((r) => r.name);
    const body = cols.includes('feedback_log_body') ? 'feedback_log_body' : 'message';
    rows = con.prepare(`SELECT id, ts, level, ${body} AS body FROM logs WHERE thread_id = ? AND ts >= ? AND target LIKE 'codex_core::session%'
      AND instr(${body}, 'server reported model ') > 0 ORDER BY id`).all(ev.actor, since);
  } catch (e) { return { ...base, db, unavailable: `Codex 로그를 읽지 못했다: ${e.message}` }; }
  finally { try { con?.close(); } catch {} }
  const mismatches = [];
  let matched = 0;
  for (const r of rows) {
    const m = /server reported model (\S+) while requested model was (\S+)/.exec(r.body || '');
    if (m) mismatches.push({ id: r.id, ts: r.ts, to: m[1], from: m[2], body: r.body });
    else if (/\(matches requested model\)/.test(r.body || '')) matched++;
  }
  return { ...base, db, matched, mismatches };
}
