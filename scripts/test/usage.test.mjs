#!/usr/bin/env node
// job 사용량에서 ccusage 에 넘기기 전 단계를 시험한다: 어떤 기록이 job 에 속하는지, ccusage JSON 을 어떻게 줄이는지.
//   node scripts/test/usage.test.mjs
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { jobFiles } from '../lib/usage/claude.mjs';
import { fromRoles, claudeRole, usageTable } from '../lib/usage.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) pass++; else { fail++; console.log(`FAIL  ${name}\n      ${got}`); } };

// researcher r 와 그 자손(lens l, recheck c, l 이 띄운 x), 같은 세션의 다른 subagent o 와 그 자식 oc
const dir = mkdtempSync(join(tmpdir(), 'usage-test-'));
const agent = (id, meta) => { writeFileSync(join(dir, `agent-${id}.jsonl`), '{}\n'); writeFileSync(join(dir, `agent-${id}.meta.json`), JSON.stringify(meta)); };
agent('r', { agentType: 'researcher' });
agent('l', { agentType: 'lens-numbers', parentAgentId: 'r' });
agent('c', { agentType: 'recheck', parentAgentId: 'r' });
agent('x', { agentType: 'general-purpose', parentAgentId: 'l' });
agent('o', { agentType: 'researcher' });
agent('oc', { agentType: 'lens-reader', parentAgentId: 'o' });
const got = jobFiles(dir, 'r').sort();
ok('researcher 와 그 자손만 고른다', JSON.stringify(got) === JSON.stringify(['agent-c.jsonl', 'agent-l.jsonl', 'agent-r.jsonl', 'agent-x.jsonl']), got);

const role = (models, input, cw, cr, out, usd) => ({ models, input, cache_write: cw, cache_read: cr, output: out, usd });
const u = fromRoles({ researcher: role(['claude-opus-5-5'], 1, 2, 3, 4, 1.004), 'lens-numbers': role(['claude-sonnet-5-5'], 10, 0, 0, 0, 0.234) });
ok('역할별 값으로 합계를 낸다', u.tokens === 20 && u.usd === 1.24 && u.roles.researcher.usd === 1 && u.roles['lens-numbers'].usd === 0.23, JSON.stringify(u));
const table = usageTable(u).split('\n');
ok('표는 금액이 큰 역할부터, 끝에 합계', table[2].startsWith('| researcher |') && table[3].startsWith('| lens-numbers |') && table[4] === '| 합계 | | 11 | 2 | 3 | 4 | $1.24 |', table.join('\n'));
ok('ccusage claude session 을 역할 값으로', JSON.stringify(claudeRole({ modelsUsed: ['m'], inputTokens: 1, cacheCreationTokens: 2, cacheReadTokens: 3, outputTokens: 4, totalCost: 0.5 })) === JSON.stringify(role(['m'], 1, 2, 3, 4, 0.5)), 'x');
const m = fromRoles({ researcher: role(['gpt-6.1-sol'], 1, 0, 2, 3, 0.5), recheck: role(['gpt-6.1-sol'], 1, 0, 0, 1, null) });
ok('금액 모르는 역할이 있으면 합계 금액도 null', m.usd === null && m.tokens === 8 && m.roles.recheck.usd === null && usageTable(m).includes('| 미확인 |'), JSON.stringify(m));
ok('셀 수 없을 때', usageTable(null) === '셀 수 없었다', usageTable(null));
ok('역할이 없으면 null', fromRoles({}) === null, 'x');

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
