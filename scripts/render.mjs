#!/usr/bin/env node
// 문서를 headless Chrome 으로 열어 장마다 스크린샷을 찍는다.
//   node scripts/render.mjs research/<slug> [--out=<dir>] [--scan] [--width=1280] [--tile=1200]
// 정적 게이트를 통과한 것과 화면에서 바르게 보이는 것은 다른 일이라, 렌더링을 봤는지 말하려면
// 실제로 찍은 화면이 있어야 한다. 의존성은 없다. Node 의 내장 WebSocket 과 fetch 로 DevTools
// 프로토콜을 직접 부르고, Playwright 가 받아 둔 chrome-headless-shell 을 쓴다.

import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

const HELP = `사용법: node scripts/render.mjs research/<slug> [옵션]

장마다 스크린샷을 <out>/chNN-K.png 로, 장 목록과 높이를 <out>/manifest.json 으로 쓴다.
긴 장은 --tile 높이로 나눠 찍는다(읽는 모델이 큰 그림을 줄여 보지 않도록).

옵션:
  --out=<dir>     출력 위치. 기본은 /tmp/render-<slug>
  --scan          표지와 요약은 그대로, 나머지 장은 eyebrow·h2·.key 만 남긴 훑기 화면을 찍는다
  --width=<px>    창 너비. 기본 1280
  --tile=<px>     한 장의 최대 높이. 기본 1200

manifest.json 에는 장마다 제목, 높이, 가로로 넘치는 요소 수(scrollers)가 들어간다. 페이지 전체가
가로로 넘치면 overflowX 가 true 다. 연속 읽기 모드가 없는 옛 덱 셸은 장을 하나씩 띄워 찍는다.
브라우저는 ~/.cache/ms-playwright 의 chrome-headless-shell 을 찾는다(npx playwright install chromium).`;

const args = process.argv.slice(2);
if (args.some((a) => a === '--help' || a === '-h') || !args.length) { console.log(HELP); process.exit(args.length ? 0 : 1); }
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const target = args.find((a) => !a.startsWith('--'));
const file = target.endsWith('.html') ? target : join(target, 'index.html');
if (!existsSync(file)) { console.error(`그런 문서가 없다: ${file}`); process.exit(1); }
const slug = basename(target.endsWith('.html') ? resolve(target, '..') : target);
const outdir = opt.out || `/tmp/render-${slug}`;
const WIDTH = Number(opt.width || 1280);
const TILE = Number(opt.tile || 1200);

let shell = '';
try { shell = execSync('find ~/.cache/ms-playwright -name chrome-headless-shell -type f 2>/dev/null | sort | tail -1').toString().trim(); } catch {}
if (!shell) { console.error('chrome-headless-shell 을 찾지 못했다. npx playwright install chromium 으로 받는다'); process.exit(1); }

mkdirSync(outdir, { recursive: true });
const PORT = 9300 + (process.pid % 500);
const chrome = spawn(shell, ['--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code) => { chrome.kill(); process.exit(code); };
process.on('exit', () => chrome.kill()); // DevTools 호출이 throw 해도 브라우저를 남기지 않는다

let page;
for (let i = 0; i < 50 && !page; i++) {
  await sleep(200);
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!page) { console.error('브라우저가 페이지를 열지 않았다'); done(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const waiters = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { ok, ko } = pending.get(m.id); pending.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result); }
  else if (m.method) for (const w of waiters) if (w.method === m.method) w.ok(m.params);
});
const send = (method, params = {}) => new Promise((ok, ko) => { const id = ++seq; pending.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });
const evalJSON = async (body) => JSON.parse((await send('Runtime.evaluate', { expression: `JSON.stringify((()=>{${body}})())`, returnByValue: true })).result.value);
const shot = async (clip, name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } });
  writeFileSync(join(outdir, name), Buffer.from(data, 'base64'));
  return name;
};
const tiles = async (x, y, w, h, prefix) => {
  const names = [];
  for (let k = 0, top = 0; top < h; k++, top += TILE) {
    const hh = Math.min(TILE, h - top);
    if (hh < 40) break;
    names.push(await shot({ x, y: y + top, width: w, height: hh }, `${prefix}-${k + 1}.png`));
  }
  return names;
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: false });
const loaded = new Promise((ok) => waiters.push({ method: 'Page.loadEventFired', ok }));
await send('Page.navigate', { url: 'file://' + resolve(file) });
await loaded;
await sleep(400);

const article = readFileSync(file, 'utf8').includes('body[data-mode="article"]');
const setup = await evalJSON(`
  const st = document.createElement('style'); st.id = 'render-style';
  st.textContent = '.hud{display:none!important}';
  document.head.appendChild(st);
  const S = [...document.querySelectorAll('section.slide')];
  if (${article}) {
    document.body.setAttribute('data-mode', 'article');
    S.forEach((s) => { s.setAttribute('data-active', 'true'); s.setAttribute('aria-hidden', 'false'); });
  }
  if (${Boolean(opt.scan)}) {
    st.textContent += '.render-scan .slide-inner > *:not(.eyebrow):not(h2):not(.key){display:none!important}';
    S.forEach((s, i) => { if (i >= 2) s.classList.add('render-scan'); });
  }
  return { count: S.length };
`);

// 한 장의 위치와 크기, 그리고 가로로 넘치는 요소 수. 옛 덱 셸이면 그 장만 보이게 한 뒤 잰다.
const measure = (i) => evalJSON(`
  const S = [...document.querySelectorAll('section.slide')];
  if (!${article}) {
    S.forEach((s, k) => s.style.cssText = k === ${i}
      ? 'display:block!important;opacity:1!important;visibility:visible!important;transform:none!important;position:relative!important;inset:auto!important'
      : 'display:none!important');
  }
  const s = S[${i}], r = s.getBoundingClientRect();
  const h2 = s.querySelector('h2');
  const scrollers = [...s.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible').length;
  return { title: (h2 ? h2.textContent : ${i} === 0 ? '표지' : '').trim().replace(/\\s+/g, ' '),
           x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, scrollers,
           overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth };
`);

const manifest = { file, width: WIDTH, tile: TILE, shell: article ? 'article' : 'deck', scan: Boolean(opt.scan), chapters: [] };
if (opt.scan && article) {
  const first = await measure(0), last = await measure(setup.count - 1);
  manifest.tiles = await tiles(first.x, first.y, first.w, last.y + last.h - first.y, 'scan');
} else {
  for (let i = 0; i < setup.count; i++) {
    const m = await measure(i);
    const names = await tiles(m.x, m.y, m.w, m.h, `ch${String(i + 1).padStart(2, '0')}`);
    manifest.chapters.push({ n: i + 1, title: m.title, height: Math.round(m.h), scrollers: m.scrollers, tiles: names });
    manifest.overflowX = manifest.overflowX || m.overflowX;
  }
}
writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 1));
const n = manifest.tiles ? manifest.tiles.length : manifest.chapters.reduce((a, c) => a + c.tiles.length, 0);
const wide = manifest.chapters.filter((c) => c.scrollers).map((c) => c.n);
console.log(`${outdir}: ${manifest.shell} 셸, ${manifest.tiles ? '훑기 화면' : `장 ${manifest.chapters.length}개`}, 그림 ${n}장` +
  (manifest.overflowX ? ', 페이지가 가로로 넘친다' : '') + (wide.length ? `, 가로 스크롤 요소가 있는 장: ${wide.join(', ')}` : ''));
ws.close();
done(0);
