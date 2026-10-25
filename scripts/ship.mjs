#!/usr/bin/env node
// 문서 하나를 브랜치, 커밋, push, PR 로 내보낸다. researcher 가 마지막에 부른다.
//   node scripts/ship.mjs research/<slug>
// git 과 PR 은 모델이 아니라 이 스크립트가 한다. 게이트를 먼저 돌려 막히면 내보내지 않고, 사람이 정할 것이
// 남았거나 재검증 뒤에 문서가 바뀌었거나 모델이 저절로 바뀌었으면 draft 로 연다.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';

const HELP = `사용법: node scripts/ship.mjs research/<slug>

.research/<slug>/run.json 에서 읽는 것:
  commitSubject, commitBody   필수. AGENTS.md 의 Commits 규칙대로
  decided                     researcher 가 소유자 대신 정한 것 (kind, 질문 등)
  needs_owner                 소유자가 정할 것. 하나라도 있으면 draft
  unverified, unfixed         검증하지 못한 것, 확인했지만 고치지 못한 것. unfixed 는 {item, meaning} 이고
                              meaning 이 false(표현만 원문에 더 가까울 수 있음)가 아닌 것이 남으면 draft
  rendered                    렌더링한 화면을 봤는지 한 줄

.research/<slug>/notes/hooks.json (hook 이 쓴다, git 이 무시한다):
  reviews, modelSwitches      마지막 재검증 뒤 문서가 바뀌었으면 draft, 모델이 저절로 바뀌었으면 내보내지 않는다

README.md 와 index.html 은 PR 에 넣지 않는다. merge 뒤 main 에서 Action 이 다시 만든다.

새 문서는 doc/<slug>, 이미 main 에 있는 문서를 고치면 doc/<slug>-fix-<날짜시각> 브랜치로 연다.
같은 브랜치에서 다시 부르면 그 커밋을 고쳐 쓴다(문서 하나에 커밋 하나).`;

const arg = process.argv[2];
if (!arg || arg === '--help' || arg === '-h') { console.log(HELP); process.exit(arg ? 0 : 1); }
const slug = basename(arg.replace(/\/$/, ''));
const sh = (c, a) => spawnSync(c, a, { encoding: 'utf8' });
const tail = (s, n = 6) => (s || '').trim().split('\n').slice(-n).join('\n');
const die = (msg) => { console.error(`ship 하지 않았다: ${msg}`); process.exit(1); };
const runPath = join('.research', slug, 'run.json');
const docPath = join('research', slug, 'index.html');
if (!existsSync(docPath)) die(`${docPath} 가 없다. 저장소 루트에서 부른다`);
const run = existsSync(runPath) ? JSON.parse(readFileSync(runPath, 'utf8')) : {};
if (!run.commitSubject || !run.commitBody) die('run.json 에 commitSubject 와 commitBody 가 없다');
const hooksFile = join('.research', slug, 'notes', 'hooks.json');
const hooks = existsSync(hooksFile) ? JSON.parse(readFileSync(hooksFile, 'utf8')) : {};
const reviews = [...(run.reviews || []), ...(hooks.reviews || [])];
const modelSwitches = [...(run.modelSwitches || []), ...(hooks.modelSwitches || [])];

// 0. seq 는 목록 순서다. main 에 아직 없는 문서는 그사이 main 에 들어온 문서와 겹치지 않게 맨 뒤로 옮긴다.
// 게이트(seq-unique)보다 먼저 한다.
sh('git', ['fetch', '-q', 'origin', 'main']);
const existing = sh('git', ['cat-file', '-e', `origin/main:research/${slug}/meta.json`]).status === 0;
if (!existing) {
  const metaPath = join('research', slug, 'meta.json');
  const text = readFileSync(metaPath, 'utf8');
  const seqOf = (t) => { try { return JSON.parse(t).seq; } catch { return null; } };
  const seqs = readdirSync('research').filter((n) => n !== slug && existsSync(join('research', n, 'meta.json'))).map((n) => seqOf(readFileSync(join('research', n, 'meta.json'), 'utf8')));
  for (const n of sh('git', ['ls-tree', '--name-only', 'origin/main', 'research/']).stdout.split('\n')) {
    const name = n.split('/').pop();
    if (name && name !== slug) seqs.push(seqOf(sh('git', ['show', `origin/main:research/${name}/meta.json`]).stdout));
  }
  const max = Math.max(0, ...seqs.filter(Number.isInteger));
  if (!(Number.isInteger(seqOf(text)) && seqOf(text) > max)) writeFileSync(metaPath, text.replace(/"seq":\s*\d+/, `"seq": ${max + 1}`));
}

// 1. 게이트
const claims = join('.research', slug, 'claims.jsonl');
const hasClaims = existsSync(claims) && readFileSync(claims, 'utf8').split('\n').some((l) => l.trim().startsWith('{'));
const gates = {};
for (const [name, a] of [['check-doc', ['scripts/check-doc.mjs', `research/${slug}`]], ['check-prose', ['scripts/check-prose.mjs', `research/${slug}`]],
  ...(hasClaims ? [['check-claims', ['.claude/skills/research-verify/scripts/check-claims.mjs', `research/${slug}`]]] : [])]) {
  const r = sh('node', name === 'check-claims' ? [...a, ...selfRepo()] : a);
  gates[name] = r.status === 0;
  if (r.status !== 0) die(`${name} 가 막았다\n${tail(r.stdout + r.stderr)}`);
}
if (!hasClaims) die('claims.jsonl 이 비었다. 검증을 거치지 않은 문서다');

// 2. draft 판정
const sha = createHash('sha256').update(readFileSync(docPath)).digest('hex');
const lastReview = reviews.at(-1);
const unreviewed = lastReview && lastReview.sha !== sha;
const autoSwitch = modelSwitches.filter((m) => m.source === 'auto');
const asList = (xs) => (Array.isArray(xs) ? xs : xs ? [String(xs)] : []).map((x) => {
  if (typeof x === 'string') return x;
  const head = x.question ?? x.item ?? x.text ?? (x.what && (x.choice ? `${x.what}: ${x.choice}` : x.what));
  const parts = [head, x.options && `선택지: ${[].concat(x.options).join(' / ')}`, (x.default ?? x.pick) && `researcher 의 추천: ${x.default ?? x.pick}`, x.why && `이유: ${x.why}`].filter(Boolean);
  return parts.length ? parts.join(' — ') : Object.values(x).filter((v) => typeof v === 'string').join(' — ');
});
const unfixedRaw = Array.isArray(run.unfixed) ? run.unfixed : run.unfixed ? [run.unfixed] : [];
const blocking = unfixedRaw.filter((x) => typeof x === 'string' || x.meaning !== false);
const needs = asList(run.needs_owner);
const unfixed = unfixedRaw.map((x) => (typeof x === 'object' && x.meaning === false ? '(표현) ' : '') + asList([x])[0]);
if (autoSwitch.length) die(`모델이 저절로 바뀐 채 쓰였다(${autoSwitch.map((m) => `${m.from} → ${m.to}`).join(', ')}). 바뀐 모델이 쓴 문서는 내보내지 않는다`);
const isDraft = needs.length > 0 || blocking.length > 0 || unreviewed;

// 3. 브랜치. README.md 와 index.html 은 생성물이라 작업 중에 다시 만든 것을 버린다(merge 뒤 main 에서 만든다).
const current = sh('git', ['branch', '--show-current']).stdout.trim();
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const branch = current.startsWith(`doc/${slug}`) ? current : existing ? `doc/${slug}-fix-${stamp}` : `doc/${slug}`;
const amend = current === branch && sh('git', ['log', '-1', '--format=%s']).stdout.trim() === run.commitSubject;
const step = (c, a) => { const r = sh(c, a); if (r.status !== 0) die(`${c} ${a.join(' ')}: ${tail(r.stdout + r.stderr, 3)}`); return r; };
if (current !== branch) {
  step('git', ['checkout', 'HEAD', '--', 'README.md', 'index.html']);
  const known = sh('git', ['rev-parse', '--verify', '-q', `refs/heads/${branch}`]).status === 0;
  step('git', known ? ['switch', branch] : ['switch', '-c', branch, 'origin/main']);
}

run.shippedAt = new Date().toISOString();
run.ship = { branch, draft: isDraft, gates, docSha: sha, unreviewed: !!unreviewed };
writeFileSync(runPath, JSON.stringify(run, null, 1) + '\n');
step('git', ['checkout', 'HEAD', '--', 'README.md', 'index.html']);
step('node', ['scripts/check-doc.mjs', `research/${slug}`]);
step('git', ['add', `research/${slug}`, `.research/${slug}`]);
step('git', amend ? ['commit', '-q', '--amend', '--no-edit']
  : ['commit', '-q', '-m', run.commitSubject, '-m', `${run.commitBody.replace(/\n*Co-Authored-By:.*$/gim, '')}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`]);
step('git', ['push', '-q', ...(amend ? ['--force-with-lease'] : []), '-u', 'origin', branch]);

// 5. PR
const head = sh('git', ['rev-parse', 'HEAD']).stdout.trim();
const remote = sh('git', ['remote', 'get-url', 'origin']).stdout.trim().replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
const repo = remote.split('/').slice(-2).join('/');
const ogUrl = (readFileSync(docPath, 'utf8').match(/property="og:url" content="([^"]+)"/) || [])[1] || '';
const list = (xs) => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : '- (없음)');
const body = `문서: ${remote}/blob/${head}/research/${slug}/index.html

merge 뒤 주소: ${ogUrl}

${run.commitBody.replace(/\n*Co-Authored-By:.*$/gim, '')}

## researcher 가 대신 정한 것
${list(asList(run.decided))}

## 사람이 정할 것
${list(needs)}

## 검증하지 못한 것
${list(asList(run.unverified))}

## 확인했지만 고치지 못한 것
${list(unfixed)}

## 실행 기록
- 게이트(이 스크립트가 돌렸다): ${Object.entries(gates).map(([k, v]) => `${k} ${v ? '통과' : '막힘'}`).join(', ')}
- 렌즈·재검증 호출 ${reviews.length}회${unreviewed ? '. 마지막 재검증 뒤 문서가 바뀌었다' : ''}
- 렌더링: ${run.rendered || '기록 없음'}
- 도식이 든 본문 장: ${figureShare(docPath)}
- 토큰과 모델별 사용량은 실행이 끝날 때 hook 이 .research/${slug}/notes/hooks.json 에 남긴다(커밋하지 않는다)
${isDraft ? '\n위의 이유로 draft 로 열었다.\n' : ''}
🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
const existingPr = sh('gh', ['pr', 'list', '-R', repo, '--head', branch, '--state', 'open', '--json', 'url', '-q', '.[0].url']);
if (existingPr.status === 0 && existingPr.stdout.trim()) {
  step('gh', ['pr', 'edit', branch, '-R', repo, '--body', body]);
  sh('gh', ['pr', 'ready', branch, '-R', repo, ...(isDraft ? ['--undo'] : [])]);
  console.log(`PR 갱신: ${existingPr.stdout.trim()}`);
} else {
  const pr = step('gh', ['pr', 'create', '-R', repo, '--base', 'main', '--head', branch, '--title', run.commitSubject, '--body', body, ...(isDraft ? ['--draft'] : [])]);
  console.log(`PR: ${pr.stdout.trim().split('\n').pop()}${isDraft ? ' (draft)' : ''}`);
}

// 끝난 실행의 worktree 가 브랜치를 쥐고 있으면, 같은 PR 을 고치는 다음 실행이 그 브랜치로 바꾸지 못한다.
sh('git', ['switch', '-q', '--detach']);

// 이 저장소 자체를 출처로 삼은 문서는 check-claims 가 체크아웃을 찾도록 지금 작업 트리를 넘긴다.
function selfRepo() {
  const name = sh('git', ['remote', 'get-url', 'origin']).stdout.trim().replace(/\.git$/, '').split(/[/:]/).slice(-2).join('/');
  const sources = readFileSync(join('.research', slug, 'sources.jsonl'), 'utf8');
  return sources.includes(`"repo": "${name}"`) || sources.includes(`"repo":"${name}"`) ? ['--repo', `${name}=${process.cwd()}`] : [];
}

// 표지·요약·출처 같은 고정 장을 뺀 본문 장 가운데 그림(svg, img)이 든 장의 비율. 막지 않고 보이기만 한다.
function figureShare(path) {
  const FIXED = /data-(?:label|role)="(index|cover|tl-dr|setup|sources|critique)"|<p class="eyebrow">(index|tl-dr|setup|sources|critique)</;
  const body = readFileSync(path, 'utf8').split(/<section\s+class="slide/).slice(1).filter((s) => !FIXED.test(s.slice(0, s.indexOf('>'))) && !FIXED.test(s));
  const drawn = body.filter((s) => /<svg|<img|class="board|class="plot|class="ladder/.test(s)).length;
  return `${drawn}/${body.length}${body.length ? ` (${Math.round((drawn * 100) / body.length)}%)` : ''}`;
}
