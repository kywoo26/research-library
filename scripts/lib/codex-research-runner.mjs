// Runs one Codex researcher thread to a verified PR. The launcher owns the worktree and profile.
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const readJson = (path) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errorText = (error) => typeof error === 'string' ? error :
  [error?.message, error?.codex_error_info, error?.codexErrorInfo, error?.code].filter(Boolean).join(' ');

export function jobStatus(worktree) {
  const job = readJson(join(worktree, '.research', 'codex-job.json'));
  if (!job) return { state: 'missing', worktree };
  if (job.state === 'running' || job.state === 'retrying') {
    let alive = false;
    try { process.kill(job.supervisorPid, 0); alive = true; } catch (error) { alive = error.code === 'EPERM'; }
    const last = Date.parse(job.updatedAt || '');
    if (!alive) return { ...job, state: 'stale', reason: '감독 프로세스가 없다' };
    if (!Number.isFinite(last) || Date.now() - last > 90000)
      return { ...job, state: 'stalled', reason: 'heartbeat 가 끊겼다. 감독 프로세스를 확인한다' };
  }
  return job;
}

export function shippedResult(worktree, prLookup = (branch) => {
  const r = spawnSync('gh', ['pr', 'view', branch, '--json', 'url,headRefName,state,isDraft'], { cwd: worktree, encoding: 'utf8' });
  return r.status === 0 ? JSON.parse(r.stdout) : null;
}) {
  const active = readJson(join(worktree, '.research', 'active.json'));
  if (active?.state !== 'shipped' || !active.slug)
    return { ok: false, reason: `연구 run 이 ship 되지 않았다${active?.reason ? `: ${active.reason}` : ''}` };
  const dir = join(worktree, '.research', active.slug);
  const run = readJson(join(dir, 'run.json'));
  const hooks = readJson(join(dir, 'notes', 'hooks.json'));
  const required = ['check-doc', 'check-prose', 'check-claims'];
  if (!run?.ship?.branch || required.some((name) => run.ship.gates?.[name] !== true))
    return { ok: false, reason: 'ship 게이트가 통과하지 않았다' };
  const shippedAt = Date.parse(active.shippedAt || '');
  const gatedAt = Date.parse(hooks?.gates?.at || '');
  if (!Number.isFinite(shippedAt) || !Number.isFinite(gatedAt) || gatedAt < shippedAt ||
      required.some((name) => hooks.gates.results?.[name]?.pass !== true))
    return { ok: false, reason: 'ship 뒤 종료 hook 게이트가 통과하지 않았다' };
  const doc = join(worktree, 'research', active.slug, 'index.html');
  if (!run.ship.docSha || !existsSync(doc) || createHash('sha256').update(readFileSync(doc)).digest('hex') !== run.ship.docSha)
    return { ok: false, reason: 'ship 뒤 문서 내용이 달라졌다' };
  let pr;
  try { pr = prLookup(run.ship.branch); } catch {}
  if (!pr?.url || pr.headRefName !== run.ship.branch || pr.state !== 'OPEN' || !!pr.isDraft !== !!run.ship.draft)
    return { ok: false, reason: '열린 PR 을 확인하지 못했다' };
  return { ok: true, pr: pr.url, slug: active.slug, draft: !!pr.isDraft, branch: run.ship.branch };
}

export async function runResearch({ worktree, request, codexArgs, command = 'codex', maxRetries = 2,
  retryDelayMs = 15000, prLookup, freshThread = false, report = (line) => console.log(line) }) {
  const dir = join(worktree, '.research');
  mkdirSync(dir, { recursive: true });
  const jobPath = join(dir, 'codex-job.json');
  const eventPath = join(dir, 'codex-events.jsonl');
  const observed = jobStatus(worktree);
  if (['running', 'retrying', 'stalled'].includes(observed.state) && observed.supervisorPid !== process.pid)
    throw new Error(`이 worktree 의 연구가 이미 실행 중이다: ${jobPath}`);
  const previous = readJson(jobPath);
  const active = readJson(join(dir, 'active.json'));
  if (previous?.state === 'shipped' || active?.state === 'shipped')
    throw new Error(`이 worktree 의 연구는 이미 ship 했다. 새 요청은 새 worktree 에서 시작한다: ${worktree}`);
  if (previous?.state !== 'shipped' && previous?.request && previous.request !== request)
    throw new Error(`이 worktree 에는 다른 연구 요청이 남아 있다: ${jobPath}`);
  if (freshThread && previous?.state !== 'failed')
    throw new Error(`새 연구자 맥락은 실패한 연구에서만 연다: ${jobPath}`);
  if (freshThread && (previous.freshThreadStarts || 0) >= 1)
    throw new Error(`새 연구자 맥락은 이미 한 번 열었다. 오류를 소유자에게 보고한다: ${jobPath}`);
  const freshPrompt = freshThread
    ? `${request}\n\nA previous researcher stopped in this worktree: ${worktree}. The error was: ${previous.lastError || 'unknown'}. Its final report was: ${previous.lastAgentMessage || 'none'}. Start a fresh researcher context. Inspect the current draft and ledgers, continue unfinished work, and follow the research skills through verification and shipping.`
    : request;
  const job = { request, worktree, state: 'starting', startedAt: previous?.startedAt || new Date().toISOString(),
    threadId: freshThread ? null : previous?.threadId || null,
    attempts: previous?.attempts || 0, freshThreadStarts: (previous?.freshThreadStarts || 0) + Number(freshThread),
    supervisorPid: process.pid, updatedAt: new Date().toISOString() };
  const save = () => {
    job.updatedAt = new Date().toISOString();
    const tmp = `${jobPath}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(job, null, 1) + '\n');
    renameSync(tmp, jobPath);
  };
  save();
  for (let retry = 0; retry <= maxRetries; retry++) {
    const prompt = job.threadId
      ? 'The previous turn stopped. Inspect the current worktree and run records. Continue only unfinished work from the original request. Do not repeat completed external actions. Finish the research chain and report its PR or the blocking error.'
      : freshPrompt;
    const argv = ['exec', '--json', ...codexArgs,
      ...(job.threadId ? ['resume', job.threadId, prompt] : [prompt])];
    job.attempts++;
    job.state = 'running';
    job.lastError = null;
    save();
    report(`Codex 연구 turn ${job.attempts} 시작: ${worktree}`);
    const turn = await new Promise((resolve) => {
      const expectedThreadId = job.threadId;
      let terminal = null;
      let error = null;
      let stderr = '';
      let settled = false;
      const child = spawn(command, argv, { cwd: worktree, stdio: ['ignore', 'pipe', 'pipe'] });
      job.pid = child.pid || null;
      save();
      const heartbeat = setInterval(save, 30000);
      child.stdout && createInterface({ input: child.stdout }).on('line', (line) => {
        appendFileSync(eventPath, line + '\n');
        let event;
        try { event = JSON.parse(line); } catch { return; }
        if (event.type === 'thread.started' && event.thread_id) {
          if (expectedThreadId && event.thread_id !== expectedThreadId) {
            error = `재개한 thread 가 바뀌었다: ${expectedThreadId} → ${event.thread_id}`;
            child.kill();
          } else { job.threadId = event.thread_id; save(); }
        }
        if (event.type === 'turn.completed' || event.type === 'turn.failed') {
          terminal = event.type;
          if (event.error) error = event.error;
        }
        if (event.type === 'error') error = event.error || event.message || event;
        if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
          job.lastAgentMessage = String(event.item.text || '').slice(0, 2000);
          save();
          report(`연구자: ${job.lastAgentMessage.slice(0, 400)}`);
        }
      });
      child.stderr && child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-4000); });
      child.on('error', (e) => { error = e; });
      child.on('close', (code, signal) => {
        if (settled) return;
        settled = true;
        clearInterval(heartbeat);
        delete job.pid;
        save();
        resolve({ terminal, error, stderr, code, signal });
      });
    });
    if (turn.terminal === 'turn.completed' && turn.code === 0) {
      const result = shippedResult(worktree, prLookup);
      if (result.ok) {
        Object.assign(job, { state: 'shipped', completedAt: new Date().toISOString(), result });
        save();
        report(`RESEARCH_RESULT ${JSON.stringify(result)}`);
        return result;
      }
      job.lastError = result.reason;
      break;
    }
    job.lastError = errorText(turn.error) || turn.stderr.trim() ||
      `${turn.terminal || '종료 이벤트 없음'}; exit=${turn.code}; signal=${turn.signal || '없음'}`;
    // codex exec JSON currently exposes the failure message, while app-server also exposes
    // codexErrorInfo. Recognize the observed capacity wording as well as structured codes.
    const transient = /server_overloaded|at capacity|temporarily overloaded|rate.?limit|too many requests|request_timeout|server_error/i.test(job.lastError);
    if (!transient || retry === maxRetries || !job.threadId) break;
    job.state = 'retrying';
    save();
    report(`일시 오류로 ${retryDelayMs * (retry + 1) / 1000}초 뒤 같은 thread 를 재개한다: ${job.lastError}`);
    await sleep(retryDelayMs * (retry + 1));
  }
  job.state = 'failed';
  job.completedAt = new Date().toISOString();
  save();
  throw new Error(`${job.lastError}\n연구 worktree: ${worktree}\n상태 기록: ${jobPath}`);
}
