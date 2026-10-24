#!/usr/bin/env node
// 연구 대상 하나를 고정, 작성, 검증, 수정을 거쳐 PR 까지 가져간다.
//   node scripts/chain.mjs run '{"slug":"YYYY-MM-DD-slug","kind":"explainer","target":"<URL>"}'
//   node scripts/chain.mjs run <slug>          # run.json 에 남은 단계부터 다시 간다
//   node scripts/chain.mjs status <slug>
// 순서는 이 스크립트가 쥐고 절차는 skill 이 쥔다. 각 단계는 `claude -p` 한 번이고, 게이트와 렌더링과
// git 은 스크립트가 직접 돌려 그 결과를 사실로 기록한다. 에이전트의 "통과했다"는 받지 않는다.
// 수정은 작성자 세션을 fork 해 이어 쓴다. 원문을 읽은 컨텍스트가 고쳐야 문장 도중에 원문을 다시
// 열 수 있다. 렌즈와 재검증은 그 세션을 모르는 새 컨텍스트다.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HELP = `사용법:
  node scripts/chain.mjs run '<args JSON>' [옵션]   새로 시작한다
  node scripts/chain.mjs run <slug> [옵션]          .research/<slug>/run.json 의 남은 단계부터 간다
  node scripts/chain.mjs status <slug>              단계별 상태와 비용을 보인다

args JSON:
  slug      필수. YYYY-MM-DD-slug. research/<slug>/ 와 .research/<slug>/ 의 이름이다
  kind      필수. comparison | explainer | walkthrough
  target    필수. GitHub URL, arXiv ID 와 버전, 또는 페이지 URL
  question  선택. 문서가 답해야 하는 질문
  angle     선택. 문서가 반드시 다뤄야 하는 관점

옵션:
  --from=<stage>          그 단계부터 다시 돌린다 (draft, verify, fix, ship)
  --to=<stage>            그 단계까지만 돌린다
  --dry-run               claude 와 git 을 부르지 않고 단계와 프롬프트만 보인다
  --model=<id>            모든 에이전트의 모델. 기본은 claude 설정
  --lens-model=<id>       렌즈, 재검증, claims 추출의 모델
  --permission-mode=<m>   claude -p 의 권한 모드. 기본 acceptEdits
  --max-budget-usd=<n>    호출 하나의 비용 상한

단계: draft → gates → verify(렌즈 B, 렌즈 A, claims 추출 병렬) → fix(최대 2회, 매회 게이트·렌더링·재검증)
→ ship(브랜치, 커밋, push, PR). 상태는 단계마다 run.json 에 남고, 실패해도 남는다. PR 은 알려진 결함
(고치지 못한 확인된 결함, 결과를 내지 못한 렌즈, 상한에서 멈춘 수정)이 있을 때만 draft 로 연다.`;

const MAX_ROUNDS = 2;
const STAGES = ['draft', 'verify', 'fix', 'ship'];
const AUTHOR_TOOLS = 'Bash Read Write Edit Glob Grep WebFetch WebSearch Skill';
const READER_TOOLS = 'Bash Read Glob Grep WebFetch';
const NO_EDIT = 'Edit Write NotebookEdit Agent';

// ─── 인자 ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (!argv.length || argv.some((a) => a === '--help' || a === '-h')) { console.log(HELP); process.exit(argv.length ? 0 : 1); }
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split(/=(.*)/s); return [k, v ?? true]; }));
const [cmd, input] = argv.filter((a) => !a.startsWith('--'));

function validate(a) {
  const problems = [];
  const unknown = Object.keys(a).filter((k) => !['slug', 'kind', 'target', 'question', 'angle'].includes(k));
  if (unknown.length) problems.push(`읽지 않는 키: ${unknown.join(', ')}`);
  if (typeof a.slug !== 'string' || !/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(a.slug)) problems.push(`slug 가 YYYY-MM-DD-slug 가 아니다: ${JSON.stringify(a.slug)}`);
  if (!['comparison', 'explainer', 'walkthrough'].includes(a.kind)) problems.push(`kind 가 comparison, explainer, walkthrough 가 아니다: ${JSON.stringify(a.kind)}`);
  if (typeof a.target !== 'string' || !a.target.trim()) problems.push('target 이 없다');
  for (const k of ['question', 'angle']) if (a[k] != null && typeof a[k] !== 'string') problems.push(`${k} 는 문자열이어야 한다`);
  return problems;
}

// ─── 상태 ────────────────────────────────────────────────────────────────────
const runPath = (slug) => join(ROOT, '.research', slug, 'run.json');
const save = (run) => { mkdirSync(dirname(runPath(run.slug)), { recursive: true }); writeFileSync(runPath(run.slug), JSON.stringify(run, null, 1) + '\n'); };
const sh = (cmdline, args) => spawnSync(cmdline, args, { cwd: ROOT, encoding: 'utf8' });
const tail = (s, n = 12) => (s || '').trim().split('\n').slice(-n).join('\n');
const lines = (p) => (existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter((l) => l.trim().startsWith('{')).length : 0);

function loadRun() {
  if (cmd === 'status' || (input && !input.trim().startsWith('{'))) {
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(input || '')) { console.error(`args JSON 이나 slug 가 아니다: ${JSON.stringify(input)}\n\n${HELP}`); process.exit(1); }
    const p = runPath(input);
    if (!existsSync(p)) { console.error(`run.json 이 없다: ${p}`); process.exit(1); }
    const old = JSON.parse(readFileSync(p, 'utf8'));
    return { stages: {}, calls: [], ...old };
  }
  let a;
  try { a = JSON.parse(input); } catch (e) { console.error(`args 가 JSON 이 아니다 (${e.message})\n\n${HELP}`); process.exit(1); }
  const problems = validate(a);
  if (problems.length) { console.error(`args 가 통과하지 못했다: ${problems.join('; ')}\n\n${HELP}`); process.exit(1); }
  if (existsSync(runPath(a.slug))) {
    const old = JSON.parse(readFileSync(runPath(a.slug), 'utf8'));
    if (old.chain) { console.error(`이미 run.json 이 있다. 이어 가려면: node scripts/chain.mjs run ${a.slug}`); process.exit(1); }
  }
  const head = sh('git', ['rev-parse', 'HEAD']).stdout.trim();
  return { ...a, chain: 'scripts/chain.mjs', harness: head, startedAt: new Date().toISOString(), stages: {}, calls: [] };
}

// ─── claude -p ───────────────────────────────────────────────────────────────
function claude(run, label, prompt, { schema, resume, tools = AUTHOR_TOOLS, deny, model } = {}) {
  const args = ['-p', prompt, '--output-format', 'json', '--permission-mode', opt['permission-mode'] || 'acceptEdits', '--allowedTools', tools];
  if (deny) args.push('--disallowedTools', deny);
  if (schema) args.push('--json-schema', JSON.stringify(schema));
  if (resume) args.push('--resume', resume, '--fork-session');
  const m = model || opt.model;
  if (m) args.push('--model', m);
  if (opt['max-budget-usd']) args.push('--max-budget-usd', String(opt['max-budget-usd']));
  if (opt['dry-run']) {
    console.log(`\n── ${label}${resume ? ` (작성자 세션 ${resume.slice(0, 8)} fork)` : ''}\n${prompt.slice(0, 1200)}${prompt.length > 1200 ? '\n…' : ''}`);
    return Promise.resolve(schema ? null : '');
  }
  return new Promise((ok) => {
    const t0 = Date.now();
    const p = spawn('claude', args, { cwd: ROOT });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      let r = {};
      try { r = JSON.parse(out); } catch {}
      const call = { label, session: r.session_id || null, resumed: resume || null, costUsd: r.total_cost_usd ?? null,
                     ms: Date.now() - t0, turns: r.num_turns ?? null, models: Object.keys(r.modelUsage || {}),
                     ok: code === 0 && !r.is_error && (!schema || r.structured_output != null) };
      if (!call.ok) call.error = tail(r.result || err || `exit ${code}`, 4);
      run.calls.push(call);
      save(run);
      console.log(`  ${label}: ${call.ok ? 'ok' : '실패'} · ${(call.ms / 60000).toFixed(1)}분 · $${(call.costUsd ?? 0).toFixed(2)}`);
      ok(call.ok ? (schema ? r.structured_output : r.result) : null);
    });
  });
}

// 작성자 세션이 이 기계에 없으면(다른 기계에서 이어 갈 때) 새 컨텍스트로 고친다. 그때는 원문을 다시
// 열어야 하므로 evidence.jsonl 을 먼저 읽으라고 한 줄을 더한다.
async function authorTurn(run, label, prompt, schema) {
  const resume = run.authorSession;
  const r = await claude(run, label, prompt, { schema, resume });
  const latest = run.calls[run.calls.length - 1];
  if (r != null && latest?.session) { run.authorSession = latest.session; save(run); }
  if (r != null || !resume || opt['dry-run']) return r;
  const last = run.calls[run.calls.length - 1];
  if (!/session|not found|No conversation/i.test(last.error || '')) return r;
  const fresh = await claude(run, `${label} (새 컨텍스트)`, `You did not write this document; read .research/${run.slug}/evidence.jsonl and reopen the pinned source before changing anything.\n\n${prompt}`, { schema });
  if (fresh != null) { run.authorSession = run.calls[run.calls.length - 1].session; save(run); }
  return fresh;
}

// ─── 게이트와 렌더링은 스크립트가 돌린다 ─────────────────────────────────────
function gates(run, slug, withClaims) {
  const doc = `research/${slug}`;
  const res = {};
  for (const [name, c, a] of [['check-doc', 'node', ['scripts/check-doc.mjs', doc]], ['check-prose', 'node', ['scripts/check-prose.mjs', doc]],
    ...(withClaims ? [['check-claims', 'node', ['.claude/skills/research-verify/scripts/check-claims.mjs', doc, ...run.repoArgs || []]]] : [])]) {
    if (opt['dry-run']) { res[name] = { pass: null }; continue; }
    const r = sh(c, a);
    res[name] = { pass: r.status === 0, tail: tail(r.stdout + r.stderr) };
  }
  if (!opt['dry-run']) sh('node', ['scripts/build-index.mjs']);
  return res;
}
const gateText = (g) => Object.entries(g).filter(([, v]) => v.pass === false).map(([k, v]) => `${k}:\n${v.tail}`).join('\n\n');
const gatesPass = (g) => Object.values(g).every((v) => v.pass !== false);

function render(run, slug, round) {
  if (opt['dry-run']) return { opened: null };
  const out = join('/tmp', `chain-${slug}-r${round}`);
  const r = sh('node', ['scripts/render.mjs', `research/${slug}`, `--out=${out}`]);
  if (r.status !== 0) return { opened: false, reason: tail(r.stderr, 2) };
  const m = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
  return { opened: true, dir: out, overflowX: !!m.overflowX, wideChapters: m.chapters.filter((c) => c.scrollers).map((c) => c.n) };
}

// ─── 프롬프트 ────────────────────────────────────────────────────────────────
const asked = (run) => [run.question && `The question the document has to settle: ${run.question}`, run.angle && `Required angle: ${run.angle}`].filter(Boolean).join('\n');

const DRAFT_SCHEMA = { type: 'object', required: ['summary', 'corpusEnumerated', 'notRead', 'commitSubject', 'commitBody'], properties: {
  summary: { type: 'string' }, checkoutPath: { type: 'string' }, repo: { type: 'string' },
  corpusEnumerated: { type: 'array', items: { type: 'string' } }, notRead: { type: 'array', items: { type: 'string' } },
  openQuestions: { type: 'array', items: { type: 'string' } },
  commitSubject: { type: 'string' }, commitBody: { type: 'string' } } };

const draftPrompt = (run) => `Objective: produce a publishable research document at research/${run.slug}/.

Target: ${run.target}
Document kind: ${run.kind}. It was settled before launch; do not ask for it.
${asked(run)}

Follow .claude/skills/research-source/SKILL.md, then, in this same context, .claude/skills/research-doc/SKILL.md, and write research/${run.slug}/index.html. Enumerate what the corpus contains before writing; the setup chapter and notRead are built from it. Run check-doc.mjs and check-prose.mjs until they pass, run build-index.mjs, and stop. A script re-runs the gates after you.

Output: JSON matching the schema. checkoutPath is where you cloned a repository (outside this repository), repo its owner/name. commitSubject and commitBody follow the Commits section of AGENTS.md: one line saying what was added, and a body naming the document's topic and the sources it rests on.
Boundaries: do not commit, do not create a branch, do not touch claims.jsonl, and do not start research-verify; separate contexts verify after you.`;

const NOT_THE_AUTHOR = (run) => `Document: research/${run.slug}/index.html
${asked(run)}
What the document is for is the purpose field of research/${run.slug}/meta.json; read it first, because what counts as missing depends on it. Material the required angle asks for is not "outside material nobody asked for".
Corpus identity: .research/${run.slug}/sources.jsonl
Evidence the author recorded while reading: .research/${run.slug}/evidence.jsonl
Checkout: ${run.checkoutPath || '(none; fetch the pinned identity yourself if you need it)'}

You did not write this document. A finding makes a claim in it wrong, stops the reader from doing what its purpose promises, or, for the reader lens, costs the reader the point. Wording you would have chosen differently is not a finding. Do not edit the document.`;

const LENS_SCHEMA = { type: 'object', required: ['report', 'mustFix', 'judgment'], properties: {
  report: { type: 'string' }, mustFix: { type: 'integer' }, judgment: { type: 'integer' },
  unverified: { type: 'array', items: { type: 'string' } } } };

const lensPrompt = (run, file) => `Read .claude/skills/research-verify/references/${file} and review through that lens.

${NOT_THE_AUTHOR(run)}

Write report in Korean, plain declarative, following .claude/skills/research-doc/references/prose-ko.md, in the format your lens file gives. Tag every item 고쳐야 (one correct answer: give the chapter and the document's sentence, plus the source value and locator) or 판단 (it changes the document's conclusion or its size). mustFix and judgment count them. unverified lists what you could not settle.`;

const claimsPrompt = (run) => `Read section "3. Extract claims from the shipped sentences" of .claude/skills/research-verify/SKILL.md and do exactly that for research/${run.slug}/index.html: write .research/${run.slug}/claims.jsonl from the visible text as it now stands, using .research/${run.slug}/evidence.jsonl and the pinned sources. Change no other file. Reply with one line: the number of claims written.`;

const FIX_SCHEMA = { type: 'object', required: ['fixed', 'touchedChapters'], properties: {
  fixed: { type: 'array', items: { type: 'string' } }, rejected: { type: 'array', items: { type: 'string' } },
  needsJudgment: { type: 'array', items: { type: 'string' } }, unverified: { type: 'array', items: { type: 'string' } },
  touchedChapters: { type: 'array', items: { type: 'integer' } } } };

const fixPrompt = (run, round, findings, gateFailures, open = {}) => `You are the author of research/${run.slug}/index.html. Read the "Fix, then re-verify what changed" section of .claude/skills/research-verify/SKILL.md and follow it. ${typeof round === 'number' ? `Round ${round} of at most ${MAX_ROUNDS}.` : 'This is the fix after the last re-check.'}
${asked(run)}

Findings to act on:
${findings}
${gateFailures ? `\nGates that failed after the last change (a script ran them):\n${gateFailures}\n` : ''}
Confirm each finding against the pinned source before you change anything; lenses are wrong often enough. Update .research/${run.slug}/claims.jsonl for the sentences you change, run check-doc.mjs, check-prose.mjs and check-claims.mjs until they pass, and run build-index.mjs. A script re-runs the gates and renders the page after you.

${open.needsJudgment?.length || open.unverified?.length ? `Still open from earlier rounds:\nneedsJudgment:\n${(open.needsJudgment || []).map((x) => `- ${x}`).join('\n') || '- (none)'}\nunverified:\n${(open.unverified || []).map((x) => `- ${x}`).join('\n') || '- (none)'}\n\n` : ''}Output: JSON matching the schema. touchedChapters decides what gets re-read. needsJudgment and unverified are the full lists as they stand after this round, earlier rounds' items included where they still hold: a decision only a person can make, and a claim you could not settle against the source. Process notes (rounds, rendering, gates) are not items; a script records those.
Boundaries: do not commit. A change to the document's conclusion or its size is not yours to make; list it under needsJudgment and leave the document as it is.`;

const RECHECK_SCHEMA = { type: 'object', required: ['newMustFix'], properties: {
  newMustFix: { type: 'array', items: { type: 'object', required: ['text', 'kind'], properties: {
    text: { type: 'string' }, kind: { type: 'string', enum: ['number', 'quote', 'direction', 'reference', 'wording'] } } } },
  badRejections: { type: 'array', items: { type: 'string' } } } };

const recheckPrompt = (run, round, fix, view) => `${NOT_THE_AUTHOR(run)}

You are re-reading after a fix round, not reviewing the whole document. Round ${round} changed chapters ${fix.touchedChapters.join(', ')}.
Applied:
${(fix.fixed || []).map((x) => `- ${x}`).join('\n') || '- (nothing recorded)'}
Rejected rather than applied:
${(fix.rejected || []).map((x) => `- ${x}`).join('\n') || '- (none)'}
${view.opened ? `Screenshots of every chapter as rendered are in ${view.dir} (chNN-K.png); look at the changed chapters.` : 'The page could not be rendered; read the HTML.'}

Read those chapters against the pinned source and look for what the edits broke: a number that no longer matches its neighbours, a cross-reference pointing at the wrong chapter, a qualifier dropped while rewriting, a condition moved to the limits chapter that leaves the body sentence false. Check the rejections too. Report only new items; give each a kind (number, quote, direction or reference when it has one correct answer, wording when it is about how a sentence reads).`;

// ─── 단계 ────────────────────────────────────────────────────────────────────
async function stageDraft(run) {
  const d = await claude(run, 'draft', draftPrompt(run), { schema: DRAFT_SCHEMA });
  if (opt['dry-run']) return true;
  if (!d) return fail(run, 'draft', '작성 에이전트가 결과를 내지 못했다');
  run.authorSession = run.calls[run.calls.length - 1].session;
  Object.assign(run, { checkoutPath: d.checkoutPath || null, repo: d.repo || null, commitSubject: d.commitSubject, commitBody: d.commitBody,
                       notRead: d.notRead, corpusEnumerated: d.corpusEnumerated, openQuestions: d.openQuestions || [] });
  run.repoArgs = d.repo && d.checkoutPath ? ['--repo', `${d.repo}=${d.checkoutPath}`] : [];
  let g = gates(run, run.slug, false);
  if (!gatesPass(g)) {
    await authorTurn(run, 'draft:gates', `A script ran the gates on research/${run.slug} and these failed:\n\n${gateText(g)}\n\nFix the document until they pass, then stop. Reply with one line.`);
    g = gates(run, run.slug, false);
  }
  const evidence = lines(join(ROOT, '.research', run.slug, 'evidence.jsonl'));
  run.stages.draft = { done: gatesPass(g) && evidence > 0, gates: g, evidence };
  if (!gatesPass(g)) return fail(run, 'draft', `게이트를 통과하지 못했다\n${gateText(g)}`);
  if (!evidence) return fail(run, 'draft', 'evidence.jsonl 이 비었다. 원문을 읽은 기록 없이 쓴 문서다');
  save(run);
  return true;
}

async function stageVerify(run) {
  const [b, a, claims] = await Promise.all([
    claude(run, 'lens:numbers', lensPrompt(run, 'lens-numbers.md') + `\nWhere evidence.jsonl holds a span for a number, check the document against the span and the span against the source.`,
      { schema: LENS_SCHEMA, tools: READER_TOOLS, deny: NO_EDIT, model: opt['lens-model'] }),
    claude(run, 'lens:reader', lensPrompt(run, 'lens-reader.md'), { schema: LENS_SCHEMA, tools: READER_TOOLS, deny: NO_EDIT, model: opt['lens-model'] }),
    claude(run, 'claims', claimsPrompt(run), { tools: 'Bash Read Write Glob Grep WebFetch', deny: 'Edit NotebookEdit Agent', model: opt['lens-model'] }),
  ]);
  if (opt['dry-run']) return true;
  const claimsCheck = gates(run, run.slug, true)['check-claims'];
  run.stages.verify = { done: true,
    lenses: { B: b && { mustFix: b.mustFix, judgment: b.judgment }, A: a && { mustFix: a.mustFix, judgment: a.judgment } },
    deadLenses: [['B', b], ['A', a]].filter(([, r]) => !r).map(([k]) => k),
    claims: lines(join(ROOT, '.research', run.slug, 'claims.jsonl')), checkClaims: claimsCheck,
    findings: [b && `### 렌즈 B (수치와 인용)\n${b.report}`, a && `### 렌즈 A (독자)\n${a.report}`,
               claimsCheck && claimsCheck.pass === false && `### check-claims\n${claimsCheck.tail}`].filter(Boolean).join('\n\n'),
    unverified: [...(b?.unverified || []), ...(a?.unverified || [])] };
  save(run);
  return true;
}

async function stageFix(run) {
  const acc = { fixed: [], rejected: [], needsJudgment: [], unverified: [], wording: [], openFindings: [], afterLastRecheck: [] };
  const rounds = [];
  let findings = run.stages.verify?.findings || '(no findings)';
  let stopped = 'cap';
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const fix = await authorTurn(run, `fix:${round}`, fixPrompt(run, round, findings, null, acc), FIX_SCHEMA);
    if (opt['dry-run']) { await claude(run, `recheck:${round}`, recheckPrompt(run, round, { touchedChapters: [] }, {}), { schema: RECHECK_SCHEMA, tools: READER_TOOLS, deny: NO_EDIT }); break; }
    if (!fix) { stopped = 'fix-failed'; break; }
    for (const k of ['fixed', 'rejected']) acc[k].push(...(fix[k] || []));
    // 남은 판단과 미검증은 매 라운드 전체 목록으로 다시 받는다. 덧붙이면 풀린 항목이 남는다.
    for (const k of ['needsJudgment', 'unverified']) acc[k] = fix[k] || acc[k];
    let g = gates(run, run.slug, true);
    if (!gatesPass(g)) {
      await authorTurn(run, `fix:${round}:gates`, `A script ran the gates after your fixes and these failed:\n\n${gateText(g)}\n\nFix them, then stop. Reply with one line.`);
      g = gates(run, run.slug, true);
    }
    const view = render(run, run.slug, round);
    const r = { round, applied: (fix.fixed || []).length, rejected: (fix.rejected || []).length, touched: fix.touchedChapters || [], gates: g, rendered: view };
    rounds.push(r);
    if (!gatesPass(g)) { stopped = 'gates'; break; }
    if (!fix.touchedChapters?.length) { stopped = 'nothing-changed'; break; }
    const re = await claude(run, `recheck:${round}`, recheckPrompt(run, round, fix, view), { schema: RECHECK_SCHEMA, tools: READER_TOOLS, deny: NO_EDIT, model: opt['lens-model'] });
    if (!re) { stopped = 'recheck-failed'; acc.openFindings.push(`라운드 ${round} 의 재검증이 결과를 내지 못했다. 고친 장 ${fix.touchedChapters.join(', ')} 은 고친 컨텍스트 말고는 아무도 읽지 않았다`); break; }
    const hard = (re.newMustFix || []).filter((x) => x.kind !== 'wording').map((x) => x.text);
    acc.wording.push(...(re.newMustFix || []).filter((x) => x.kind === 'wording').map((x) => x.text));
    r.recheck = { hard: hard.length, wording: (re.newMustFix || []).length - hard.length, badRejections: (re.badRejections || []).length };
    const fresh = [...hard, ...(re.badRejections || [])];
    if (!fresh.length) { stopped = 'dry'; break; }
    if (round === MAX_ROUNDS) {
      // 마지막 재검증이 찾은 정답 하나짜리 항목은 한 번 더 고치되, 다시 읽히지 않았다고 기록한다.
      if (hard.length) {
        const last = await authorTurn(run, 'fix:after-last-recheck', fixPrompt(run, 'after the last re-check', hard.map((x) => `- ${x}`).join('\n'), null, acc) + '\nNo re-check follows; change nothing else.', FIX_SCHEMA);
        if (last) { acc.afterLastRecheck.push(...(last.fixed || [])); acc.openFindings.push(...(last.rejected || [])); acc.needsJudgment = last.needsJudgment || acc.needsJudgment; acc.unverified = last.unverified || acc.unverified; }
        const g2 = gates(run, run.slug, true);
        if (!gatesPass(g2)) { stopped = 'gates'; r.gatesAfterLast = g2; }
      }
      acc.openFindings.push(...(re.badRejections || []));
      break;
    }
    findings = fresh.map((x) => `- ${x}`).join('\n');
  }
  if (opt['dry-run']) return true;
  run.stages.fix = { done: !['gates', 'fix-failed'].includes(stopped), stoppedBecause: stopped, rounds, ...acc };
  save(run);
  if (!run.stages.fix.done) return fail(run, 'fix', `수정이 ${stopped} 에서 멈췄다`);
  return true;
}

function stageShip(run) {
  const f = run.stages.fix || {}, v = run.stages.verify || {};
  const defects = [...(f.openFindings || []), ...(v.deadLenses || []).map((k) => `렌즈 ${k} 가 결과를 내지 못해 그 관점은 검토되지 않았다`)];
  const isDraft = defects.length > 0;
  const branch = `doc/${run.slug}`;
  const cost = run.calls.reduce((a, c) => a + (c.costUsd || 0), 0);
  const lastView = (f.rounds || []).map((r) => r.rendered).filter(Boolean).pop() || {};
  const list = (xs, none = '(없음)') => (xs && xs.length ? xs.map((x) => `- ${x}`).join('\n') : `- ${none}`);
  if (opt['dry-run']) { console.log(`\n── ship: ${branch}, draft=${isDraft}`); return true; }
  const paths = [`research/${run.slug}`, `.research/${run.slug}`, 'README.md', 'index.html'];
  run.finishedAt = new Date().toISOString();
  run.costUsd = Math.round(cost * 100) / 100;
  run.isDraft = isDraft;
  run.stages.ship = { done: true, branch };
  save(run);
  const steps = [['git', ['fetch', '-q', 'origin', 'main']], ['git', ['switch', '-c', branch, 'origin/main']], ['git', ['add', ...paths]],
    ['git', ['commit', '-q', '-m', run.commitSubject, '-m', `${run.commitBody}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`]], ['git', ['push', '-q', '-u', 'origin', branch]]];
  for (const [c, a] of steps) { const r = sh(c, a); if (r.status !== 0) return fail(run, 'ship', `${c} ${a.join(' ')}: ${tail(r.stderr, 3)}`); }
  const sha = sh('git', ['rev-parse', 'HEAD']).stdout.trim();
  const remote = sh('git', ['remote', 'get-url', 'origin']).stdout.trim().replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
  const owner = remote.split('/').slice(-2).join('/');
  const ogUrl = (readFileSync(join(ROOT, 'research', run.slug, 'index.html'), 'utf8').match(/property="og:url" content="([^"]+)"/) || [])[1] || '';
  const body = `문서: ${remote}/blob/${sha}/research/${run.slug}/index.html

merge 뒤 주소: ${ogUrl}

${run.commitBody}

## 사람이 정할 것
${list(f.needsJudgment)}

## 검증하지 못한 것
${list([...(v.unverified || []), ...(f.unverified || [])])}

## 다시 읽은 재검증이 기록만 한 문장 문제
${list(f.wording)}

## 확인했지만 고치지 못한 것
${list(defects)}
${f.afterLastRecheck?.length ? `\n마지막 재검증 뒤에 고친 정답 하나짜리 항목 ${f.afterLastRecheck.length}건은 다시 읽히지 않았다(run.json 의 afterLastRecheck).\n` : ''}
## 실행 기록
- 수정 ${(f.rounds || []).length}회, 멈춘 이유 ${f.stoppedBecause || '-'}, 렌즈 B 고쳐야 ${v.lenses?.B?.mustFix ?? '-'} · 판단 ${v.lenses?.B?.judgment ?? '-'}, 렌즈 A 고쳐야 ${v.lenses?.A?.mustFix ?? '-'} · 판단 ${v.lenses?.A?.judgment ?? '-'}
- 게이트는 스크립트가 돌렸다. 렌더링: ${lastView.opened ? `headless Chrome 으로 모든 장을 찍었다${lastView.overflowX ? ', 페이지가 가로로 넘친다' : ''}${lastView.wideChapters?.length ? `, 가로 스크롤이 있는 장 ${lastView.wideChapters.join(', ')}` : ''}` : '하지 못했다'}
- 호출 ${run.calls.length}회, 추정 비용 $${run.costUsd}. 세부는 .research/${run.slug}/run.json
${isDraft ? '\n알려진 결함이 있어 draft 로 열었다.\n' : ''}
🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
  const pr = sh('gh', ['pr', 'create', '-R', owner, '--base', 'main', '--head', branch, '--title', run.commitSubject, '--body', body, ...(isDraft ? ['--draft'] : [])]);
  if (pr.status !== 0) return fail(run, 'ship', `gh pr create: ${tail(pr.stderr, 3)}`);
  // run.json 은 이미 커밋에 들어갔다. PR 주소를 남기려고 커밋을 하나 더 만들지 않는다(문서 하나에 커밋 하나).
  console.log(`PR: ${pr.stdout.trim().split('\n').pop()}${isDraft ? ' (draft)' : ''}`);
  return true;
}

function fail(run, stage, reason) {
  run.stoppedAt = stage;
  run.stoppedReason = reason;
  run.stages[stage] = { ...(run.stages[stage] || {}), done: false };
  save(run);
  console.error(`\n${stage} 에서 멈췄다: ${reason}\n다시: node scripts/chain.mjs run ${run.slug} --from=${stage}`);
  return false;
}

// ─── 실행 ────────────────────────────────────────────────────────────────────
const run = loadRun();
if (cmd === 'status') {
  for (const s of STAGES) console.log(`${s.padEnd(7)} ${run.stages[s]?.done ? 'done' : run.stoppedAt === s ? `멈춤: ${run.stoppedReason}` : '-'}`);
  console.log(`호출 ${run.calls.length}회, $${run.calls.reduce((a, c) => a + (c.costUsd || 0), 0).toFixed(2)}${run.pr ? `, PR ${run.pr}` : ''}`);
  process.exit(0);
}
if (cmd !== 'run') { console.log(HELP); process.exit(1); }
const from = opt.from ? STAGES.indexOf(opt.from) : STAGES.findIndex((s) => !run.stages[s]?.done);
const to = opt.to ? STAGES.indexOf(opt.to) : STAGES.length - 1;
if (from < 0 || to < 0) { console.error(`단계 이름은 ${STAGES.join(', ')} 중 하나다`); process.exit(1); }
delete run.stoppedAt; delete run.stoppedReason;
if (!opt['dry-run']) save(run);
console.log(`${run.slug}: ${STAGES.slice(from, to + 1).join(' → ')}${opt['dry-run'] ? ' (dry-run)' : ''}`);
const impl = { draft: stageDraft, verify: stageVerify, fix: stageFix, ship: stageShip };
for (const s of STAGES.slice(from, to + 1)) {
  console.log(`[${s}]`);
  if (!(await impl[s](run))) process.exit(1);
}
