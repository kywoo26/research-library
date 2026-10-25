// hook 이 함께 쓰는 것: 지금 손대고 있는 문서를 찾고, 그 문서의 run.json 에 기록을 더한다.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const readInput = () => {
  try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
};

export const repoRoot = (cwd) => {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: cwd || process.cwd(), encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};

// 손대고 있는 문서의 slug: 커밋되지 않은 변경이 있거나, 커밋했지만 아직 origin/main 에 없는 research/<slug>/.
export const docsInProgress = (root) => {
  const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'research', '.research'], { cwd: root, encoding: 'utf8' });
  // 커밋했지만 아직 main 에 없는 문서도 포함한다. ship.mjs 가 커밋한 뒤에도 끝날 때의 기록이 남도록.
  const ahead = spawnSync('git', ['diff', '--name-only', 'origin/main...HEAD', '--', 'research', '.research'], { cwd: root, encoding: 'utf8' });
  const slugs = new Set();
  for (const line of (ahead.stdout || '').split('\n')) {
    const m = /^\.?research\/([^/]+)\//.exec(line);
    if (m && existsSync(join(root, 'research', m[1], 'index.html'))) slugs.add(m[1]);
  }
  for (const line of (r.stdout || '').split('\n')) {
    const m = /^.. (?:.* -> )?\.?research\/([^/]+)\//.exec(line);
    if (m && existsSync(join(root, 'research', m[1], 'index.html'))) slugs.add(m[1]);
  }
  return [...slugs];
};

export const updateRun = (root, slug, fn) => {
  const p = join(root, '.research', slug, 'run.json');
  let run = {};
  try { run = JSON.parse(readFileSync(p, 'utf8')); } catch {}
  fn(run);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(run, null, 1) + '\n');
};
