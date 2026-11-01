// Ask Codex for the exact current hook hashes. A saved key alone does not mean a hook is trusted.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const savedHook = (profile, key) => {
  const table = `[hooks.state.${JSON.stringify(key)}]`;
  const start = profile.indexOf(table);
  if (start < 0) return null;
  const body = profile.slice(start + table.length).split('\n[')[0];
  return {
    hash: (/^trusted_hash\s*=\s*"([^"]+)"/m.exec(body) || [])[1],
    enabled: !/^enabled\s*=\s*false/m.test(body),
  };
};

export async function checkHookTrust({ source, installed, previousProfile, cwd, command = 'codex' }) {
  const temp = mkdtempSync(join(tmpdir(), 'research-hook-check-'));
  const config = join(temp, 'config.toml');
  writeFileSync(config, source);
  try {
    const hooks = await new Promise((resolve, reject) => {
      const child = spawn(command, ['app-server', '--stdio'], {
        cwd, env: { ...process.env, CODEX_HOME: temp }, stdio: ['pipe', 'pipe', 'pipe'],
      });
      let done = false;
      let stderr = '';
      const finish = (error, value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        child.kill();
        error ? reject(error) : resolve(value);
      };
      const timer = setTimeout(() => finish(new Error('Codex hooks/list 응답이 15초 안에 오지 않았다')), 15000);
      child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-2000); });
      child.on('error', (error) => finish(error));
      child.on('close', (code) => { if (!done) finish(new Error(`Codex app-server 종료 ${code}: ${stderr}`)); });
      createInterface({ input: child.stdout }).on('line', (line) => {
        let msg;
        try { msg = JSON.parse(line); } catch { return; }
        if (msg.id === 1) {
          if (msg.error) return finish(new Error(JSON.stringify(msg.error)));
          child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
          child.stdin.write(JSON.stringify({ id: 2, method: 'hooks/list', params: { cwds: [cwd] } }) + '\n');
        } else if (msg.id === 2) {
          if (msg.error) return finish(new Error(JSON.stringify(msg.error)));
          finish(null, msg.result?.data || []);
        }
      });
      child.stdin.write(JSON.stringify({ id: 1, method: 'initialize',
        params: { clientInfo: { name: 'research_hook_check', version: '1.0.0' }, capabilities: { experimentalApi: true } } }) + '\n');
    });
    const entries = hooks.flatMap((item) => item.hooks || []).filter((hook) => hook.sourcePath === config);
    const expected = [...source.matchAll(/^\[\[hooks\.(\w+)\]\]/gm)].length;
    if (entries.length !== expected || hooks.some((item) => item.errors?.length))
      return { trusted: false, reason: `Codex 가 연구 hook ${entries.length}/${expected}개를 읽었다` };
    const missing = entries.filter((hook) => {
      const key = installed + hook.key.slice(config.length);
      const saved = savedHook(previousProfile, key);
      return !saved?.enabled || saved.hash !== hook.currentHash;
    }).map((hook) => hook.eventName);
    return { trusted: missing.length === 0, missing };
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
