// ship.mjs 의 판정. 기록(hooks.json)과 지금 문서로 내보낼지, draft 로 열지를 정한다. 부수 효과가 없어 시험할 수 있다.
//   refuse      모델이 저절로 바뀐 것이 관찰됐다. 내보내지 않는다
//   reasons     draft 로 여는 이유. 비면 정상 PR
//   modelCheck  PR 본문에 적는 모델 확인 상태. draft 를 정하지는 않는다
// 검증 기록이 없으면 정상 PR 로 내보내지 않는다(fail-closed). hook 이 돌지 않았거나 일부만 돈 run 도 여기서 걸린다.
import { LENSES } from './roles.mjs';

// 이번 run 의 시작·완료 기록을 짝짓는다. 완료는 같은 역할의 앞선 시작 가운데, actor 가 같은 것(Codex 는 SubagentStart 가
// actor 를 준다), 없으면 아직 짝이 없는 가장 최근 것과 짝짓는다. 짝이 없는 완료는 검토로 치지 않는다.
function pairs(rs) {
  const used = new Set(), out = [];
  rs.forEach((d, i) => {
    if (d.event !== 'done') return;
    const before = rs.slice(0, i).map((r, j) => [r, j]).filter(([r, j]) => r.event === 'start' && r.agent === d.agent && !used.has(j));
    const hit = before.filter(([r]) => r.actor && r.actor === d.actor).at(-1) || before.filter(([r]) => !r.actor).at(-1);
    if (!hit) return;
    used.add(hit[1]);
    out.push({ agent: d.agent, start: hit[0], startAt: hit[1], done: d, doneAt: i });
  });
  return out;
}

export function verdict({ reviews = [], modelSwitches = [], docSha, harness = null, runId = null, modelLog = {}, needs = [], blocking = [] }) {
  const reasons = [];
  const auto = modelSwitches.filter((m) => m.source === 'auto');
  const refuse = auto.length ? `모델이 저절로 바뀐 채 쓰였다(${auto.map((m) => `${m.from} → ${m.to}`).join(', ')}). 바뀐 모델이 쓴 문서는 내보내지 않는다` : null;

  if (!harness || !runId) reasons.push('begin.mjs 의 기록(.research/active.json)이 없다');
  // 지난 run 의 기록은 세지 않는다.
  const rs = reviews.filter((r) => r.runId && r.runId === runId && (r.event === 'start' || r.event === 'done'));
  const ps = pairs(rs);
  const of = (agent) => ps.filter((p) => p.agent === agent);
  const reread = of('recheck').some((p) => p.done.sha === docSha);

  for (const lens of LENSES) {
    const mine = of(lens);
    if (!mine.length) { reasons.push(`${lens} 의 시작과 완료가 짝지어진 기록이 없다`); continue; }
    if (mine.at(-1).done.sha !== docSha && !reread) reasons.push(`${lens} 가 읽은 뒤 문서가 바뀌었는데, 지금 문서를 recheck 가 끝까지 읽은 기록이 없다`);
  }
  // 두 lens 는 함께 돈다: 둘 다 시작한 뒤에 첫 완료가 온 짝이 있어야 한다.
  const [a, b] = LENSES.map(of);
  if (a.length && b.length && !a.some((x) => b.some((y) => Math.max(x.startAt, y.startAt) < Math.min(x.doneAt, y.doneAt)))) {
    reasons.push('두 lens 가 함께 돌지 않았다(하나가 끝난 뒤 다른 하나가 시작했다)');
  }
  const lastDone = rs.filter((r) => r.event === 'done').at(-1);
  if (lastDone && lastDone.sha !== docSha && !reread) reasons.push('마지막 검토가 끝난 뒤 문서가 바뀌었다');

  // lens·recheck 가 도는 동안 보호 파일이 바뀌었다: 셸로 쓴 것을 사후에 잡는다(끝까지 남은 변경만 보인다).
  // 역할마다 마지막 짝만 본다. 앞선 라운드가 그랬어도 그 뒤에 다시 돈 검토가 지금 문서를 깨끗이 읽었으면 그것이 기준이다.
  // lens 가 도는 동안 작성자가 바꾼 것은, 그 lens 가 끝난 뒤 시작한 recheck 가 지금 문서를 끝까지 읽었으면 검토된 것으로 본다.
  for (const agent of [...LENSES, 'recheck']) {
    const p = of(agent).at(-1);
    if (!p || !p.start.psha || !p.done.psha || p.start.psha === p.done.psha) continue;
    const coveredLater = agent !== 'recheck' && of('recheck').some((r) => r.startAt > p.doneAt && r.done.sha === docSha);
    if (!coveredLater) reasons.push(`${agent} 가 도는 동안 문서나 원장이 바뀌었다`);
  }

  if (needs.length) reasons.push('사람이 정할 것이 남았다');
  if (blocking.length) reasons.push('의미가 원문과 다른 채 고치지 못한 것이 남았다');

  // 모델 확인은 보조 관찰이다. 모든 행위자에게서 실제 모델을 봤을 때만 "확인함"이라고 적는다.
  const actors = Object.values(modelLog);
  const seen = actors.filter((x) => !x.unavailable && x.matched > 0 && !x.mismatch);
  const lensSeen = LENSES.every((l) => actors.some((x) => x.role === l && !x.unavailable && x.matched > 0));
  const how = harness === 'codex' ? 'Codex 로그의 서버 모델 보고' : 'agent 기록에 남은 응답 모델';
  const modelCheck = auto.length ? '전환 관찰됨'
    : actors.length && seen.length === actors.length && lensSeen ? `관찰된 전환 없음, 행위자 ${seen.length}개 모두 확인(${how})`
      : `확인 못 함: 실제 모델을 본 행위자 ${seen.length}/${actors.length}${lensSeen ? '' : ', lens 일부 없음'}(${how}). 보조 관찰이라 빈 것이 전환이 없었다는 뜻은 아니다`;
  return { refuse, reasons: [...new Set(reasons)], modelCheck };
}
