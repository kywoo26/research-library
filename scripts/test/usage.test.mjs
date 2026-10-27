#!/usr/bin/env node
// job 사용량에서 ccusage 에 넘기기 전 단계를 시험한다: 어떤 기록이 job 에 속하는지, ccusage JSON 을 어떻게 줄이는지.
//   node scripts/test/usage.test.mjs
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { jobFiles } from '../lib/usage/claude.mjs';
import { fromSession, usageLine } from '../lib/usage.mjs';

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

const u = fromSession({ totalTokens: 1000, totalCost: 1.23456, modelBreakdowns: [
  { modelName: 'claude-opus-5-5', inputTokens: 1, outputTokens: 2, cacheCreationTokens: 3, cacheReadTokens: 4, cost: 1.004 },
  { modelName: 'claude-sonnet-5-5', inputTokens: 10, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 0.23 }] });
ok('합계와 모델별 값으로 줄인다', u.tokens === 1000 && u.usd === 1.23 && u.models['claude-opus-5-5'].tokens === 10 && u.models['claude-sonnet-5-5'].usd === 0.23, JSON.stringify(u));
ok('PR 한 줄', usageLine(u) === '1,000 tokens, API 환산 $1.23 (claude-opus-5-5 $1.00, claude-sonnet-5-5 $0.23)', usageLine(u));
ok('모델별 금액이 없을 때', usageLine({ tokens: 5, usd: 0.5, models: { 'gpt-6.1-sol': { tokens: 3, usd: null }, 'gpt-6-luna': { tokens: 2, usd: null } } }) === '5 tokens, API 환산 $0.50 (gpt-6.1-sol 3 tokens, gpt-6-luna 2 tokens)', 'x');
ok('셀 수 없을 때', usageLine(null) === '셀 수 없었다', usageLine(null));
ok('session 이 없으면 null', fromSession(undefined) === undefined || fromSession(undefined) === null, String(fromSession(undefined)));

console.log(`\n${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
