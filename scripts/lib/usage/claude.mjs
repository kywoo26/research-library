// Claude 의 research job = researcher subagent 와 그가 띄운 subagent 전체(lens·recheck·그 아래).
// researcher 의 worktree 이름(agent-<id>)으로 그 기록을 찾고, meta.json 의 parentAgentId 로 자손을 고른다.
// 고른 기록을 역할(agentType)마다 임시 CLAUDE_CONFIG_DIR 의 session 하나로 복사해 ccusage 에 넘긴다(ccusage 는 subagent 기록을 부모 session 으로 묶는다).
import { readdirSync, readFileSync, existsSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { ccusage, claudeRole, fromRoles } from '../usage.mjs';

// 같은 subagents 폴더에서 researcher 와 그 자손의 transcript 를 고른다.
export function jobFiles(dir, researcher) {
  const meta = (f) => { try { return JSON.parse(readFileSync(join(dir, f.replace(/\.jsonl$/, '.meta.json')), 'utf8')); } catch { return {}; } };
  const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
  const ids = new Set([researcher]);
  for (let grew = true; grew;) {
    grew = false;
    for (const f of files) {
      const id = f.replace(/^agent-|\.jsonl$/g, '');
      if (!ids.has(id) && ids.has(meta(f).parentAgentId)) { ids.add(id); grew = true; }
    }
  }
  return files.filter((f) => ids.has(f.replace(/^agent-|\.jsonl$/g, '')));
}

function findDir(projects, id) {
  for (const p of existsSync(projects) ? readdirSync(projects) : []) {
    for (const s of readdirSync(join(projects, p))) {
      const dir = join(projects, p, s, 'subagents');
      if (existsSync(join(dir, `agent-${id}.jsonl`))) return dir;
    }
  }
  return null;
}

export default function usage(root) {
  const id = (/^agent-([0-9a-z]+)$/.exec(basename(root)) || [])[1];
  if (!id) return null;
  const config = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  const dir = findDir(join(config, 'projects'), id);
  if (!dir) return null;
  const tmp = mkdtempSync(join(tmpdir(), 'research-usage-'));
  try {
    for (const f of jobFiles(dir, id)) {
      let role = 'unknown';
      try { role = JSON.parse(readFileSync(join(dir, f.replace(/\.jsonl$/, '.meta.json')), 'utf8')).agentType || role; } catch {}
      const out = join(tmp, 'projects', 'job', role.replace(/[^\w-]/g, '_'), 'subagents');
      mkdirSync(out, { recursive: true });
      copyFileSync(join(dir, f), join(out, f));
    }
    const r = ccusage(['claude', 'session', '--breakdown'], { CLAUDE_CONFIG_DIR: tmp });
    if (!r?.sessions?.length) return null;
    return fromRoles(Object.fromEntries(r.sessions.map((s) => [s.sessionId, claudeRole(s)])));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
