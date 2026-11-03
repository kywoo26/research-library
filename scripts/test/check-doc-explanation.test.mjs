import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// 실제 CLI를 격리해 실행한다. 저장소의 같은 slug를 검사하는 것으로 대체되지 않게 한다.
test('설명 문단은 본문이지만 빈 그릇이나 접힌 원문은 본문을 대신하지 않는다', () => {
  const root = mkdtempSync(join(tmpdir(), 'explanation-gate-'));
  try {
    const slug = '2026-11-04-queue';
    const doc = join(root, 'research', slug);
    mkdirSync(doc, { recursive: true });
    mkdirSync(join(root, 'scripts'));
    copyFileSync(resolve('scripts/check-doc.mjs'), join(root, 'scripts/check-doc.mjs'));
    const title = 'Queue의 작업 재시도';
    writeFileSync(join(doc, 'meta.json'), JSON.stringify({ title, date: '2026-11-04', seq: 1, summary: '응답 유실과 중복 처리', purpose: 'explainer' }));
    const shell = readFileSync('assets/deck-shell.html', 'utf8')
      .replaceAll('{{TITLE}}', title).replaceAll('{{SUMMARY}}', '응답 유실과 중복 처리').replaceAll('{{SLUG}}', slug);
    const run = (body) => {
      const chapters = `<section class="slide" data-role="cover"><h1>${title}</h1><p class="answer">Queue는 작업을 전달한다.</p><p class="src">가상의 형식 시험이다.</p><div class="board" data-cols="a" aria-label="작업 전달"><div class="card" id="a" data-col="a"><b>작업</b></div></div></section>
        <section class="slide" data-role="mechanism"><h2>응답을 잃으면 같은 작업을 다시 보낼 수 있다</h2><p class="lead">완료 응답으로 작업을 지운다.</p>${body}</section>
        <section class="slide" data-role="critique"><h2>가상의 동작으로 형식을 확인한다</h2><p class="lead">실제 제품의 동작을 주장하지 않는다.</p><ul class="points"><li>형식 시험이다.</li></ul></section>
        <section class="slide" data-role="sources"><h2>출처</h2></section>`;
      writeFileSync(join(doc, 'index.html'), shell.replace(/<main>[\s\S]*?<\/main>/, `<main>${chapters}</main>`));
      return spawnSync(process.execPath, [join(root, 'scripts/check-doc.mjs'), `research/${slug}`], { encoding: 'utf8', cwd: root });
    };
    const prose = '<div class="explanation"><p>worker가 완료 응답을 보내기 전에 연결을 잃으면 큐에 작업이 남는다. 그래서 같은 작업이 다시 전달될 수 있다.</p></div>';
    for (const body of [prose, '<pre>작업 → 응답 유실 → 재시도</pre>']) {
      const r = run(body);
      assert.equal(r.status, 0, r.stdout + r.stderr);
    }
    for (const body of ['<div class="explanation"><p> </p></div>', '<div class="explanation"></div>', `<details class="orig"><summary>원문</summary>${prose}</details>`]) {
      const r = run(body);
      assert.notEqual(r.status, 0);
      assert.match(r.stdout + r.stderr, /chapter-grammar/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
