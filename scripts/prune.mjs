#!/usr/bin/env node
// 끝난 리서치가 남긴 것을 지운다. research skill 이 researcher 를 띄우기 전에 한 번 부른다(따로 도는 정리는 없다).
//   node scripts/prune.mjs [--dry-run] [--days=30]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cacheRoot, usedMarker } from './lib/source-cache.mjs';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`사용법: node scripts/prune.mjs [--dry-run] [--days=30]

지우는 것:
  1. 이 저장소의 .claude/worktrees/agent-* 가운데, 실행 중이 아니고(잠기지 않았고 한 시간 안에 바뀌지 않음),
     커밋하지 않은 변경이 없고, HEAD 가 이미 원격 브랜치에 있는 것. 지워도 잃는 것이 없는 worktree 다.
  2. 원본 cache(${cacheRoot()}) 가운데 --days 일 넘게 쓰지 않은 것과, 하루 넘은 받다 만 임시본.
남기는 것: 커밋하지 않은 변경이나 push 하지 않은 커밋이 있는 worktree, 실행 중인 worktree, 최근에 쓴 원본.
작업 파일은 worktree 안 .research/<slug>/notes/ 에 두므로 worktree 와 함께 지워진다.`);
  process.exit(0);
}
const dry = args.includes('--dry-run');
const days = Number((args.find((a) => a.startsWith('--days=')) || '--days=30').split('=')[1]);
const now = Date.now(), HOUR = 3600e3, DAY = 24 * HOUR;
const git = (a, cwd) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const removed = [], kept = [];
const remove = (what, fn) => { if (!dry) fn(); removed.push(what); };

// 1. worktree
const top = git(['rev-parse', '--path-format=absolute', '--git-common-dir']).stdout.trim().replace(/\/\.git$/, '');
git(['fetch', '-q', '--prune', 'origin'], top);
const blocks = git(['worktree', 'list', '--porcelain'], top).stdout.split('\n\n');
for (const b of blocks) {
  const path = (b.match(/^worktree (.+)$/m) || [])[1];
  if (!path || !path.includes('/.claude/worktrees/agent-')) continue;
  const why = /^locked/m.test(b) ? '실행 중(잠김)'
    : now - statSync(path).mtimeMs < HOUR ? '한 시간 안에 바뀜'
    : git(['status', '--porcelain'], path).stdout.trim() ? '커밋하지 않은 변경'
    : !git(['branch', '-r', '--contains', 'HEAD'], path).stdout.trim() ? 'push 하지 않은 커밋'
    : null;
  if (why) { kept.push(`${path} (${why})`); continue; }
  const branch = (b.match(/^branch refs\/heads\/(.+)$/m) || [])[1];
  remove(path, () => {
    git(['worktree', 'remove', '--force', path], top);
    if (branch?.startsWith('worktree-agent-')) git(['branch', '-D', branch], top);
  });
}
if (!dry) git(['worktree', 'prune'], top);

// 2. 원본 cache
const root = cacheRoot();
for (const name of existsSync(root) ? readdirSync(root) : []) {
  if (name.endsWith('.used')) continue;
  const dir = join(root, name);
  const tmp = /\.tmp-\d+$/.test(name);
  const marker = usedMarker(dir);
  const last = existsSync(marker) ? statSync(marker).mtimeMs : statSync(dir).mtimeMs;
  if (tmp ? now - last < DAY : now - last < days * DAY) continue;
  remove(dir, () => {
    spawnSync('chmod', ['-R', 'u+w', dir]);
    rmSync(dir, { recursive: true, force: true });
    rmSync(marker, { force: true });
  });
}

console.log(`${dry ? '(dry-run) ' : ''}지움 ${removed.length}, 남김 ${kept.length}`);
for (const r of removed) console.log(`  - ${r}`);
for (const k of kept) console.log(`  = ${k}`);
