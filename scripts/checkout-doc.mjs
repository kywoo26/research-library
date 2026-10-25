#!/usr/bin/env node
// main 에 아직 없는 문서를 고칠 때, 그 문서가 있는 PR 브랜치로 이 worktree 를 옮긴다.
//   node scripts/checkout-doc.mjs <slug>
// researcher 의 worktree 는 늘 origin/main 에서 만들어져, PR 에만 있는 문서는 거기 없다(2026-10-25 #17, #20).
// git 을 직접 부르지 않고 이 스크립트를 부르게 한 것은, 격리 worktree 의 검사가 복잡한 git 명령을 막기 때문이다.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const slug = (process.argv[2] || '').replace(/^research\//, '').replace(/\/$/, '');
if (!slug || slug.startsWith('-')) {
  console.log('사용법: node scripts/checkout-doc.mjs <slug>\n\nmain 에 없는 research/<slug> 를 고칠 때 그 문서가 있는 origin/doc/<slug>* 브랜치로 옮긴다.\n여럿이면 가장 최근에 커밋된 것을 고른다. main 에 이미 있으면 아무것도 하지 않는다.');
  process.exit(slug ? 0 : 1);
}
const git = (...a) => spawnSync('git', a, { encoding: 'utf8' });
git('fetch', '-q', 'origin');
if (git('cat-file', '-e', `origin/main:research/${slug}/meta.json`).status === 0) {
  console.log(`research/${slug} 는 main 에 있다. 브랜치를 바꾸지 않는다.`);
  process.exit(0);
}
const refs = git('for-each-ref', '--sort=-committerdate', '--format=%(refname:short)', `refs/remotes/origin/doc/${slug}*`).stdout.split('\n').filter(Boolean)
  .filter((r) => git('cat-file', '-e', `${r}:research/${slug}/meta.json`).status === 0);
if (!refs.length) { console.error(`research/${slug} 가 있는 origin/doc/${slug}* 브랜치가 없다`); process.exit(1); }
const remote = refs[0], local = remote.replace(/^origin\//, '');
if (git('status', '--porcelain', '--', 'research', '.research').stdout.trim()) {
  console.error('research/ 나 .research/ 에 커밋하지 않은 변경이 있다. 옮기지 않는다'); process.exit(1);
}
const r = git('switch', '--ignore-other-worktrees', '-C', local, remote);
if (r.status !== 0) { console.error(r.stderr.trim()); process.exit(1); }
console.log(`${remote} 로 옮겼다${existsSync(`research/${slug}/index.html`) ? '' : ' (그런데 문서가 보이지 않는다)'}.`);
