// hook 이 함께 쓰는 것: 지금 손대고 있는 문서를 찾고, 그 문서의 notes/hooks.json 에 기록을 더한다.
// run.json 이 아니라 따로 두는 이유: researcher 가 run.json 을 통째로 다시 쓰면 hook 기록이 지워졌다(2026-10-25).
// notes/ 는 git 이 무시하므로, 실행이 끝난 뒤 쓰는 사용량 때문에 worktree 가 '변경 있음'으로 남지도 않는다.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, rmdirSync, statSync, rmSync } from 'node:fs';
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

export const hooksPath = (root, slug) => join(root, '.research', slug, 'notes', 'hooks.json');

// Codex 는 같은 이벤트의 hook 들을 병렬로 돌린다. 기록이 서로를 덮어쓰지 않게 잠그고, 다 쓴 뒤 이름을 바꾼다.
export const updateHooks = (root, slug, fn) => {
  const p = hooksPath(root, slug);
  mkdirSync(dirname(p), { recursive: true });
  const lock = `${p}.lock`;
  const until = Date.now() + 10000;
  let held = false;
  while (!held) {
    try { mkdirSync(lock); held = true; } catch {
      // 30초 넘게 남은 lock 은 죽은 hook 의 것이다.
      try { if (Date.now() - statSync(lock).mtimeMs > 30000) rmdirSync(lock); } catch {}
      if (Date.now() > until) { process.stderr.write(`hooks.json 을 잠그지 못해 기록하지 않았다: ${p}\n`); return false; }
      spawnSync('sleep', ['0.05']);
    }
  }
  try {
    let run = {};
    try { run = JSON.parse(readFileSync(p, 'utf8')); } catch {}
    fn(run);
    writeFileSync(`${p}.tmp${process.pid}`, JSON.stringify(run, null, 1) + '\n');
    renameSync(`${p}.tmp${process.pid}`, p);
    return true;
  } finally { try { rmdirSync(lock); } catch {} }
};

export const readHooks = (root, slug) => { try { return JSON.parse(readFileSync(hooksPath(root, slug), 'utf8')); } catch { return {}; } };

// lens 가 고쳐서는 안 되는 파일들의 sha. claims.jsonl 은 빠진다: 작성자가 lens 가 도는 동안 claims 를 뽑아 쓴다.
export const protectedSha = (root, slug) => {
  const files = [join('research', slug, 'index.html'), join('research', slug, 'meta.json'),
    ...['sources.jsonl', 'evidence.jsonl', join('notes', 'figures.md')].map((f) => join('.research', slug, f))];
  const web = join(root, '.research', slug, 'notes', 'web');
  if (existsSync(web)) for (const f of readdirSync(web).sort()) files.push(join('.research', slug, 'notes', 'web', f));
  const h = createHash('sha256');
  for (const f of files) {
    h.update(f + '\0');
    try { h.update(readFileSync(join(root, f))); } catch { h.update('-'); }
  }
  return h.digest('hex');
};

export const docSha = (root, slug) => createHash('sha256').update(readFileSync(join(root, 'research', slug, 'index.html'))).digest('hex');

// begin.mjs 가 쓰는 연구 run 의 표지. 없으면 이 작업 트리는 연구 run 이 아니다.
export const activeRun = (root) => { try { return JSON.parse(readFileSync(join(root, '.research', 'active.json'), 'utf8')); } catch { return null; } };

// lens 가 읽는 동안의 창. lens 가 시작할 때 열고, 두 lens 가 모두 끝나면 닫는다(.research/ 바로 아래라 git 이 무시한다).
// 창이 열린 동안 보호 파일이 바뀌면 lens 는 그 판을 보지 못한다. 그 사실을 바뀐 순간에 작성자에게 알리려고 둔다.
export const PROTECTED = (slug) => [join('research', slug, 'index.html'), join('research', slug, 'meta.json'),
  ...['sources.jsonl', 'evidence.jsonl', join('notes', 'figures.md')].map((f) => join('.research', slug, f))];
export const isProtected = (rel, slug) => PROTECTED(slug).includes(rel) || rel.startsWith(join('.research', slug, 'notes', 'web') + '/');
const fileHashes = (root, slug) => {
  const out = {};
  const files = [...PROTECTED(slug)];
  const web = join(root, '.research', slug, 'notes', 'web');
  if (existsSync(web)) for (const f of readdirSync(web).sort()) files.push(join('.research', slug, 'notes', 'web', f));
  for (const f of files) { try { out[f] = createHash('sha256').update(readFileSync(join(root, f))).digest('hex'); } catch { out[f] = null; } }
  return out;
};
export const windowPath = (root) => join(root, '.research', 'lens-window.json');
const WINDOW_MAX = 45 * 60e3;
export const readWindow = (root) => {
  try {
    const w = JSON.parse(readFileSync(windowPath(root), 'utf8'));
    if (Date.now() - Date.parse(w.opened) > WINDOW_MAX) { rmSync(windowPath(root), { force: true }); return null; }
    return w;
  } catch { return null; }
};
export const openWindow = (root, slugs, lens, runId) => {
  const w = readWindow(root) || { runId, opened: new Date().toISOString(), pending: [], files: {} };
  if (!w.pending.includes(lens)) w.pending.push(lens);
  for (const slug of slugs) w.files[slug] ||= fileHashes(root, slug);
  writeFileSync(windowPath(root), JSON.stringify(w) + '\n');
};
export const closeWindow = (root, lens) => {
  const w = readWindow(root);
  if (!w) return;
  w.pending = w.pending.filter((l) => l !== lens);
  if (w.pending.length) writeFileSync(windowPath(root), JSON.stringify(w) + '\n');
  else rmSync(windowPath(root), { force: true });
};
// 창이 열린 뒤 바뀐 보호 파일들. 이미 알린 상태는 다시 알리지 않는다.
export const windowChanges = (root) => {
  const w = readWindow(root);
  if (!w) return null;
  const changed = [];
  for (const [slug, before] of Object.entries(w.files)) {
    const now = fileHashes(root, slug);
    for (const f of new Set([...Object.keys(before), ...Object.keys(now)])) if (before[f] !== now[f]) changed.push(f);
  }
  const key = changed.sort().join('|');
  if (!changed.length || key === w.warned) return null;
  w.warned = key;
  writeFileSync(windowPath(root), JSON.stringify(w) + '\n');
  return changed;
};
