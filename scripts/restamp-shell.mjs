#!/usr/bin/env node
// board 문서에 박힌 셸의 <style> 과 <script> 를 지금의 assets/deck-shell.html 것으로 바꾼다.
//   node scripts/restamp-shell.mjs research/<slug> [research/<slug> ...]
//   node scripts/restamp-shell.mjs --all [--check]
// 문서는 셸의 CSS 와 JS 를 제 안에 담고 나간다(오프라인에서 열려야 한다). 셸을 고치면 이미 나간 문서는 옛 셸
// 그대로라, 이 스크립트가 그 두 덩어리만 갈아 끼운다. 작성자가 쓴 나머지는 한 바이트도 바꾸지 않는다.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HELP = `사용법: node scripts/restamp-shell.mjs research/<slug> [research/<slug> ...]
       node scripts/restamp-shell.mjs --all [--check]

board 문서(<html data-format="board">)의 셸 <style> 블록과 <script> 블록을 assets/deck-shell.html 의
것으로 바꾼다. 바꾸는 것은 그 두 블록뿐이다.

규칙:
  board-only     <html data-format="board"> 가 없는 문서는 거절한다. 옛 셸 문서는 셸이 달라 손대지 않는다
  one-block      문서에 <style> 과 <script> 가 하나씩만 있어야 한다. 더 있으면 어느 것이 셸인지 모르니 거절한다
  content-same   두 블록을 뺀 문서가 바꾸기 전과 바이트까지 같은지 확인한 뒤에만 쓴다

옵션:
  --all          research/ 아래 board 문서 전부. board 가 아닌 문서는 건너뛴다(거절이 아니다)
  --check        쓰지 않고, 셸과 다른 문서를 적고 하나라도 있으면 1 로 끝난다`;

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(args.length ? 0 : 1); }
const all = args.includes('--all'), check = args.includes('--check');
const unknown = args.filter((a) => a.startsWith('--') && !['--all', '--check'].includes(a));
if (unknown.length) { console.error(`모르는 옵션: ${unknown.join(' ')}\n\n${HELP}`); process.exit(1); }

const STYLE = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const isBoard = (html) => /<html\b[^>]*\sdata-format=["']board["']/i.test(html);
const blocks = (html) => ({ style: html.match(STYLE) || [], script: html.match(SCRIPT) || [] });
const strip = (html) => html.replace(STYLE, '<style/>').replace(SCRIPT, '<script/>');

const shell = readFileSync(join(ROOT, 'assets', 'deck-shell.html'), 'utf8');
const sb = blocks(shell);
if (sb.style.length !== 1 || sb.script.length !== 1) { console.error('assets/deck-shell.html 에 <style> 과 <script> 가 하나씩 있어야 한다'); process.exit(1); }

const fileOf = (t) => (t.endsWith('.html') ? t : join(t, 'index.html'));
let targets;
if (all) {
  const dir = join(ROOT, 'research');
  targets = readdirSync(dir).map((d) => join(dir, d, 'index.html')).filter((f) => existsSync(f) && isBoard(readFileSync(f, 'utf8')));
} else targets = args.filter((a) => !a.startsWith('--')).map(fileOf);

let refused = 0, changed = 0, same = 0;
for (const f of targets) {
  const rel = f.startsWith(ROOT) ? f.slice(ROOT.length + 1) : f;
  if (!existsSync(f)) { console.error(`거절 ${rel}: 파일이 없다`); refused++; continue; }
  const html = readFileSync(f, 'utf8');
  if (!isBoard(html)) { console.error(`거절 ${rel}: board 문서가 아니다 (<html data-format="board"> 없음)`); refused++; continue; }
  const b = blocks(html);
  if (b.style.length !== 1 || b.script.length !== 1) { console.error(`거절 ${rel}: <style> ${b.style.length}개, <script> ${b.script.length}개다. 하나씩이어야 한다`); refused++; continue; }
  // 바꿀 글에 $ 가 있어도 그대로 들어가도록 함수로 넘긴다
  const out = html.replace(STYLE, () => sb.style[0]).replace(SCRIPT, () => sb.script[0]);
  if (strip(out) !== strip(html)) { console.error(`거절 ${rel}: 두 블록 밖의 내용이 달라진다`); refused++; continue; }
  if (out === html) { same++; console.log(`같음 ${rel}`); continue; }
  changed++;
  if (check) { console.log(`다름 ${rel}`); continue; }
  writeFileSync(f, out);
  console.log(`바꿈 ${rel}`);
}
console.log(`${check ? '셸과 다른' : '바꾼'} 문서 ${changed}개, 이미 같은 문서 ${same}개${refused ? `, 거절 ${refused}개` : ''}`);
process.exit(refused || (check && changed) ? 1 : 0);
