#!/usr/bin/env node
// 고정 커밋의 원본 저장소를 cache 에 받고 그 경로를 출력한다. researcher 는 clone 을 직접 하지 않고 이것을 부른다.
//   node scripts/source.mjs <owner/name> [<commit>] [--history]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { cacheRoot, srcPath, usedMarker } from './lib/source-cache.mjs';

const HELP = `사용법: node scripts/source.mjs <owner/name> [<commit>] [--history]

고정 커밋의 GitHub 저장소를 $XDG_CACHE_HOME/research-library/src/<owner>__<name>@<commit>/ 에 받고
그 경로를 출력한다(마지막 줄). 이미 있으면 받지 않는다. commit 을 빼면 기본 브랜치의 지금 커밋으로 고정한다.

- 받는 것은 그 커밋 하나(depth 1, blob 은 checkout 이 필요한 만큼)다. 커밋 빈도·기여자 같은 history 주장이
  필요하면 --history 로 전체 기록을 따로 받는다(<…>@<commit>+history).
- 받은 트리는 쓰기 권한을 뺀다. 여러 문서가 같은 커밋을 함께 믿고 쓰므로 고치지 않는다.
- 동시에 같은 것을 받으면 먼저 끝난 쪽을 쓴다(임시 이름으로 받은 뒤 rename).
- 쓸 때마다 마지막 사용 시각을 남긴다. scripts/prune.mjs 가 오래 안 쓴 것을 지운다.
- check-claims.mjs 는 sources.jsonl 의 repo 와 commit 으로 같은 자리를 찾는다.
cache 위치: ${cacheRoot()}`;

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
if (!pos.length || args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(pos.length ? 0 : 1); }
const [repo, ref] = pos;
const history = args.includes('--history');
if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { console.error(`owner/name 꼴이 아니다: ${repo}`); process.exit(1); }
const url = `https://github.com/${repo}.git`;
const git = (a, cwd) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const die = (m) => { console.error(m); process.exit(1); };

let commit = ref;
if (!commit || !/^[0-9a-f]{40}$/.test(commit)) {
  const r = git(['ls-remote', url, commit || 'HEAD']);
  const line = r.stdout.split('\n').find((l) => l.trim());
  if (r.status !== 0 || !line) die(`${repo} 의 ${commit || 'HEAD'} 를 찾지 못했다\n${r.stderr.trim()}`);
  commit = line.split(/\s/)[0];
}
const dir = srcPath(repo, commit, history);
const touch = () => writeFileSync(usedMarker(dir), new Date().toISOString() + '\n');
if (existsSync(dir)) { touch(); console.log(dir); process.exit(0); }

mkdirSync(dirname(dir), { recursive: true });
const tmp = `${dir}.tmp-${process.pid}`;
const step = (a, cwd) => { const r = git(a, cwd); if (r.status !== 0) { spawnSync('chmod', ['-R', 'u+w', tmp]); rmSync(tmp, { recursive: true, force: true }); die(`git ${a.join(' ')}: ${r.stderr.trim()}`); } };
mkdirSync(tmp);
step(['init', '-q'], tmp);
step(['remote', 'add', 'origin', url], tmp);
step(history ? ['fetch', '-q', 'origin'] : ['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', commit], tmp);
step(['-c', 'advice.detachedHead=false', 'checkout', '-q', commit], tmp);
spawnSync('chmod', ['-R', 'a-w', tmp]);
try { renameSync(tmp, dir); } catch {
  // 그사이 다른 실행이 같은 것을 먼저 받았다. 그쪽을 쓴다.
  spawnSync('chmod', ['-R', 'u+w', tmp]); rmSync(tmp, { recursive: true, force: true });
  if (!existsSync(dir)) die(`${dir} 로 옮기지 못했다`);
}
touch();
console.log(dir);
