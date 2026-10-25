// 원본 저장소 cache 의 자리. scripts/source.mjs, scripts/prune.mjs, check-claims.mjs 가 같은 규칙으로 찾는다.
// 커밋이 이름에 들어가므로 어느 worktree 에서 고치든 같은 자리를 본다. 작업 공간 밖이라 원본 안의
// CLAUDE.md, .claude/skills/ 가 researcher 의 지침으로 섞여 들지 않는다.
import { join } from 'node:path';
import { homedir } from 'node:os';

export const cacheRoot = () => join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'research-library', 'src');
export const srcPath = (repo, commit, history = false) =>
  join(cacheRoot(), `${repo.replace('/', '__')}@${commit}${history ? '+history' : ''}`);
// 마지막 사용 시각은 읽기 전용 트리 밖의 옆 파일에 둔다.
export const usedMarker = (dir) => `${dir}.used`;
