#!/usr/bin/env node
// Stop hook. 손대고 있는 문서가 있으면 게이트를 돌려 notes/hooks.json 에 남기고, 막히면 세션이 끝나지 못하게 한다.
// 게이트 결과가 에이전트의 "통과했다"가 아니라 스크립트가 본 사실이 되게 하려는 것이다.
// 같은 실패로 한 번 더 멈추려 하면 놓아 주고 사용자에게 알린다. 고칠 수 없는 실패에 세션이 맴돌지 않게.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readInput, repoRoot, docsInProgress, updateHooks } from './docs.mjs';

const input = readInput();
const root = repoRoot(input.cwd);
if (!root) process.exit(0);
const slugs = docsInProgress(root);
if (!slugs.length) process.exit(0);

const tail = (s, n = 8) => (s || '').trim().split('\n').slice(-n).join('\n');
const failures = [];
for (const slug of slugs) {
  const doc = `research/${slug}`;
  const claims = join(root, '.research', slug, 'claims.jsonl');
  const hasClaims = existsSync(claims) && readFileSync(claims, 'utf8').split('\n').some((l) => l.trim().startsWith('{'));
  const gates = [['check-doc', ['scripts/check-doc.mjs', doc]], ['check-prose', ['scripts/check-prose.mjs', doc]],
    ...(hasClaims ? [['check-claims', ['.claude/skills/research-verify/scripts/check-claims.mjs', doc]]] : [])];
  const results = {};
  for (const [name, args] of gates) {
    const r = spawnSync('node', args, { cwd: root, encoding: 'utf8' });
    results[name] = { pass: r.status === 0, ...(r.status === 0 ? {} : { tail: tail(r.stdout + r.stderr) }) };
    if (r.status !== 0) failures.push(`${slug} ${name}:\n${results[name].tail}`);
  }
  const usage = input.agent_transcript_path ? tokenUsage(input.agent_transcript_path) : null;
  updateHooks(root, slug, (run) => {
    run.gates = { at: new Date().toISOString(), session: input.session_id || null, results };
    if (usage) run.usage = usage;
  });
}
if (!failures.length) process.exit(0);

const text = failures.join('\n\n');
const last = join(root, '.research', slugs[0], 'notes', '.gates-last');
const same = existsSync(last) && readFileSync(last, 'utf8') === text;
mkdirSync(join(root, '.research', slugs[0], 'notes'), { recursive: true });
writeFileSync(last, text);
if (input.stop_hook_active && same) {
  console.log(JSON.stringify({ systemMessage: `게이트가 막힌 채로 멈췄다. 같은 실패가 되풀이돼 놓아 주었다.\n${text}` }));
  process.exit(0);
}
console.log(JSON.stringify({ decision: 'block', reason: `게이트가 막혔다. 고친 뒤에 멈춘다. 사람이 정해야 하는 일이면 그 내용을 보고에 올리고 멈춘다.\n\n${text}` }));

// researcher 와 그가 띄운 렌즈·재검증의 기록에서 메시지별 토큰을 모델별로 합산한다. 금액은 남지 않는다.
// 중첩 subagent 의 기록은 같은 subagents 폴더에 놓이므로, researcher 가 시작한 뒤에 쓰인 것만 센다.
function tokenUsage(transcript) {
  const dir = dirname(transcript);
  const AGENTS = ['researcher', 'lens-numbers', 'lens-reader', 'recheck'];
  let since = 0;
  try { since = statSync(transcript).birthtimeMs || 0; } catch {}
  const byAgent = {}, total = {}, seen = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.jsonl'))) {
    const path = join(dir, f);
    let type = 'unknown';
    try { type = JSON.parse(readFileSync(path.replace(/\.jsonl$/, '.meta.json'), 'utf8')).agentType || type; } catch {}
    if (path !== transcript && (!AGENTS.includes(type) || statSync(path).mtimeMs < since)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      let m; try { m = JSON.parse(line); } catch { continue; }
      const msg = m.type === 'assistant' && m.message;
      if (!msg?.usage || !msg.model || msg.model.startsWith('<') || seen.has(msg.id)) continue;
      seen.add(msg.id);
      for (const bucket of [((byAgent[type] ||= {})[msg.model] ||= {}), (total[msg.model] ||= {})]) {
        for (const k of ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens']) bucket[k] = (bucket[k] || 0) + (msg.usage[k] || 0);
      }
    }
  }
  return { at: new Date().toISOString(), total, byAgent };
}
