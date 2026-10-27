#!/usr/bin/env node
// researcher 가 끝날 때의 hook. 손대고 있는 문서가 있으면 게이트를 돌려 notes/hooks.json 에 남기고, 막히면 끝나지 못하게 한다.
// 게이트 결과가 에이전트의 "통과했다"가 아니라 스크립트가 본 사실이 되게 하려는 것이다.
// 같은 실패로 한 번 더 멈추려 하면 놓아 주고 사용자에게 알린다. 고칠 수 없는 실패에 세션이 맴돌지 않게.
//   claude: researcher 정의의 Stop(→SubagentStop)   codex: 연구 profile 의 Stop(root = researcher)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot, docsInProgress, updateHooks, activeRun } from './docs.mjs';
import { readEvent, block, pass } from './io.mjs';
import { checkModel } from './model.mjs';

const ev = readEvent();
const root = repoRoot(ev.cwd);
if (!root) pass(ev);
const slugs = docsInProgress(root);
if (!slugs.length) pass(ev);

const tail = (s, n = 8) => (s || '').trim().split('\n').slice(-n).join('\n');
// 이 저장소 자체를 출처로 삼은 문서는 check-claims 가 체크아웃을 찾도록 지금 작업 트리를 넘긴다(ship.mjs 와 같다).
const selfRepo = (slug) => {
  const name = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).stdout.trim().replace(/\.git$/, '').split(/[/:]/).slice(-2).join('/');
  let sources = '';
  try { sources = readFileSync(join(root, '.research', slug, 'sources.jsonl'), 'utf8'); } catch {}
  return sources.includes(`"repo": "${name}"`) || sources.includes(`"repo":"${name}"`) ? ['--repo', `${name}=${root}`] : [];
};

const failures = [];
for (const slug of slugs) {
  const doc = `research/${slug}`;
  const claims = join(root, '.research', slug, 'claims.jsonl');
  const hasClaims = existsSync(claims) && readFileSync(claims, 'utf8').split('\n').some((l) => l.trim().startsWith('{'));
  const gates = [['check-doc', ['scripts/check-doc.mjs', doc]], ['check-prose', ['scripts/check-prose.mjs', doc]],
    ...(hasClaims ? [['check-claims', ['.agents/skills/research-verify/scripts/check-claims.mjs', doc, ...selfRepo(slug)]]] : [])];
  const results = {};
  for (const [name, args] of gates) {
    const r = spawnSync('node', args, { cwd: root, encoding: 'utf8' });
    results[name] = { pass: r.status === 0, ...(r.status === 0 ? {} : { tail: tail(r.stdout + r.stderr) }) };
    if (r.status !== 0) failures.push(`${slug} ${name}:\n${results[name].tail}`);
  }
  updateHooks(root, slug, (run) => {
    run.gates = { at: new Date().toISOString(), session: ev.session || null, harness: ev.harness, results };
  });
}
await checkModel(ev, root, slugs);
// 게이트가 통과해도 ship.mjs 를 부르지 않고 끝나면 PR 이 없다. 연구 run 이 열려 있으면 한 번 막는다.
const active = activeRun(root);
if (active?.state === 'running') failures.push('ship 하지 않았다: run.json 에 commitSubject 와 commitBody 를 쓰고 node scripts/ship.mjs research/<slug> 를 부른다. 멈춰야 하는 이유가 있으면 보고에 적고 멈춘다.');
if (!failures.length) pass(ev);

const text = failures.join('\n\n');
const last = join(root, '.research', slugs[0], 'notes', '.gates-last');
const same = existsSync(last) && readFileSync(last, 'utf8') === text;
mkdirSync(join(root, '.research', slugs[0], 'notes'), { recursive: true });
writeFileSync(last, text);
if (ev.stopActive && same) pass(ev, `게이트가 막힌 채로 멈췄다. 같은 실패가 되풀이돼 놓아 주었다.\n${text}`);
block(ev, `게이트가 막혔다. 고친 뒤에 멈춘다. 사람이 정해야 하는 일이면 그 내용을 보고에 올리고 멈춘다.\n\n${text}`);
