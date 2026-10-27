// 행위자(actor)마다 모델이 저절로 바뀌었는지 본다. 관찰은 harness 마다 model/<harness>.mjs 가 하고, 여기서는
// 그 결과를 notes/hooks.json 의 modelLog(행위자별 관찰)와 modelSwitches(전환)에 남긴다.
// ship.mjs 는 source "auto" 인 전환이 하나라도 있으면 내보내지 않는다. 관찰은 보조 수단이라, 비었다고 바뀌지
// 않았다는 증명은 아니다. PR 의 '모델 확인' 줄이 본 범위를 그대로 적는다.
import { updateHooks, activeRun } from './docs.mjs';
import { REVIEWERS } from '../lib/roles.mjs';
import { observe as claude } from './model/claude.mjs';
import { observe as codex } from './model/codex.mjs';

const at = () => new Date().toISOString();

const record = (root, slugs, o, switches) => { for (const slug of slugs) updateHooks(root, slug, (run) => {
  const e = ((run.modelLog ||= {})[o.actor] ||= { role: o.role, matched: 0, mismatch: 0 });
  e.role = o.role || e.role;
  if (o.unavailable) { e.unavailable = o.unavailable; if (o.db) e.db = o.db; return; }
  delete e.unavailable;
  if (o.db) e.db = o.db;
  if (o.models) { e.models = [...new Set([...(e.models || []), ...o.models])]; e.matched = e.models.length ? 1 : 0; e.mismatch = e.models.length > 1 ? 1 : 0; }
  if (o.matched !== undefined) { e.matched = Math.max(e.matched, o.matched); e.mismatch = Math.max(e.mismatch, o.mismatches.length); }
  // 로그는 잘려 나갈 수 있으므로, 본 불일치는 원문째 남기고 지우지 않는다.
  if (o.mismatches?.length) { const seen = new Set((e.evidence ||= []).map((x) => x.id)); for (const x of o.mismatches) if (!seen.has(x.id)) e.evidence.push(x); }
  const known = new Set((run.modelSwitches || []).map((s) => `${s.actor}|${s.to}`));
  for (const s of switches) if (!known.has(`${o.actor}|${s.to}`)) (run.modelSwitches ||= []).push({ at: at(), source: 'auto', actor: o.actor, ...s });
}); };

// 전환이 보이면 { from, to } 를 돌려준다. 그때 부르는 쪽은 더 진행하지 못하게 막는다.
export async function checkModel(ev, root, slugs) {
  if (!root || !slugs.length) return null;
  let o = null, switches = [];
  if (ev.harness === 'claude') {
    o = claude(ev, REVIEWERS);
    if (o?.models?.length > 1) switches = o.models.slice(1).map((to) => ({ from: o.models[0], to, detectedBy: o.role === 'researcher' ? 'transcript' : 'modelsUsed' }));
  } else if (ev.harness === 'codex') {
    // 같은 세션에서 두 번째 연구를 하면 thread 가 같다. 이번 run 이 시작한 뒤의 행만 본다.
    o = await codex(ev, Math.floor(Date.parse(activeRun(root)?.startedAt || 0) / 1000) || 0);
    switches = (o.mismatches || []).map((x) => ({ from: x.from, to: x.to, detectedBy: 'codex-log' }));
  }
  if (!o) return null;
  record(root, slugs, o, switches);
  return switches[0] ? { from: switches[0].from, to: switches[0].to } : null;
}
