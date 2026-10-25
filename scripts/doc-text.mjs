#!/usr/bin/env node
// 문서를 읽는 순서대로 텍스트로 뽑는다. 독자 시험에서 에이전트 독자에게 주는 입력이다.
//   node scripts/doc-text.mjs research/<slug> [--scan] [--out=<file>]
// 표는 행 단위로, 도식은 aria-label 설명으로, 그림은 alt 로 넣고, 접힌 내용은 화면처럼 제목만
// 남긴다. HTML 을 그대로 읽히면 표와 도식이 줄글로 뭉개져서 도식이 많은 문서가 불리해진다.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const HELP = `사용법: node scripts/doc-text.mjs research/<slug> [옵션]

장마다 "===== 장 N: <제목> =====" 머리를 달아 텍스트를 쓴다.

옵션:
  --scan          표지와 요약은 전부, 나머지 장은 [eyebrow] 와 .key 만 쓴다
  --out=<file>    파일로 쓴다. 없으면 표준 출력

[도식: …] 은 svg 의 aria-label, [그림: …] 은 img 의 alt, [접힌 내용: …] 은 details 의 summary 다.

board 문서(<html data-format="board">)에서는 상자 제목 뒤에서 줄을 바꾸고, 화살표를
[화살표: A → B (이름)] 로, 반응 상자를 [외부 반응 → 대상 상자] 와 누가·원문 대조(판정) 줄로 쓴다.
그림 표(table.plot-data)는 다른 표처럼 행 단위다. --scan 은 [data-role] 과 .lead 를 쓴다.`;

const args = process.argv.slice(2);
if (args.some((a) => a === '--help' || a === '-h') || !args.length) { console.log(HELP); process.exit(args.length ? 0 : 1); }
const target = args.find((a) => !a.startsWith('--'));
const scan = args.includes('--scan');
const out = (args.find((a) => a.startsWith('--out=')) || '').slice(6);
const file = target.endsWith('.html') ? target : join(target, 'index.html');
if (!existsSync(file)) { console.error(`그런 문서가 없다: ${file}`); process.exit(1); }

const decode = (t) => t.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (t) => t.replace(/<[^>]+>/g, '');
const clean = (s) => decode(strip(s
  .replace(/<svg[^>]*aria-label="([^"]*)"[\s\S]*?<\/svg>/g, '\n[도식: $1]\n')
  .replace(/<svg[\s\S]*?<\/svg>/g, '\n[도식]\n')
  .replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, '\n[그림: $1]\n')
  .replace(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<\/details>/g, (_, s) => `\n[접힌 내용: ${strip(s).trim()}]\n`)
  .replace(/<\/t[hd]>\s*/g, ' | ').replace(/<\/tr>/g, '\n')
  .replace(/<br\s*\/?>/g, '\n')
  .replace(/<\/(p|li|h[1-6]|figcaption|div|pre|summary|figure|table|ul|ol)>/g, '\n')
  .replace(/<li[^>]*>/g, '- ')))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
const part = (s, cls) => {
  const m = new RegExp(`<(p|div)[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`).exec(s);
  return m ? clean(m[2]) : '';
};

const html = readFileSync(file, 'utf8');
const board = /<html\b[^>]*\sdata-format=["']board["']/i.test(html);
let body = html.slice(html.indexOf('<body')).replace(/<(script|style)[\s\S]*?<\/\1>/g, '');

// board 문서: 판은 화면에서 위치로 읽히는 것을 글로 옮겨야 한다. 상자 제목은 줄을 바꾸고,
// 화살표는 셸이 그리는 선이라 HTML 에는 id 만 있으므로 상자 제목으로 풀어 쓴다.
if (board) {
  const titles = new Map();
  for (const m of body.matchAll(/<(div|a)\b([^>]*class="[^"]*\bcard\b[^"]*"[^>]*)>([\s\S]*?)(?=<(?:div|a)\b[^>]*class="[^"]*\b(?:card|edge)\b|<span class="edge"|<\/div>\s*(?:<\/div>|<ul|<p|<details|$))/g)) {
    const id = /\sid="([^"]+)"/.exec(m[2]);
    const t = /<b\b[^>]*>([\s\S]*?)<\/b>/.exec(m[3]);
    if (id && t) titles.set(id[1], decode(strip(t[1])).replace(/\s+/g, ' ').trim());
  }
  const nameOf = (id) => titles.get(id) || id;
  // 줄 이름이나 칸 이름이 화면에 보이는 판이면 상자 앞에 [줄 / 칸] 을 붙인다. 위치가 뜻인 판이라서다.
  body = body.replace(/(<div\b[^>]*class="[^"]*\bboard\b[^"]*"[^>]*>)([\s\S]*?)(?=<div\b[^>]*class="[^"]*\bboard\b|$)/g, (_, open, rest) => {
    const at = (s, n) => (new RegExp(`\\s${n}="([^"]*)"`).exec(s) || [])[1];
    const names = (v) => (v || '').split('|').map((x) => x.trim()).filter(Boolean);
    const cols = names(at(open, 'data-cols')), lanes = names(at(open, 'data-lanes'));
    // 셸과 같은 규칙: 숫자만 쓴 이름(1|2|3)은 화면에 보이지 않는 이름이다
    const named = (ns) => ns.length > 0 && !ns.every((x) => /^\d+$/.test(x));
    const showCols = named(cols), showLanes = named(lanes);
    if (!showCols && !showLanes) return open + rest;
    const cell = (spec, ns) => {
      if (!spec) return ns[0];
      if (spec === 'all') return `${ns[0]}–${ns[ns.length - 1]}`;
      const one = (v) => (ns.includes(v) ? v : ns[parseInt(v, 10) - 1] || v);
      const [x, y] = spec.split('..');
      return y ? `${one(x.trim())}–${one(y.trim())}` : one(x.trim());
    };
    return open + rest.replace(/<(div|a)\b([^>]*class="[^"]*\bcard\b[^"]*"[^>]*)>/g, (m, t, attrs) => {
      if (/\breact\b/.test(attrs)) return m;
      const where = [showLanes ? cell(at(attrs, 'data-lane'), lanes) : null, showCols ? cell(at(attrs, 'data-col'), cols) : null].filter(Boolean);
      return `\n[${where.join(' / ')}] ${m}`;
    });
  });
  body = body
    .replace(/<span class="edge" data-from="([^"]*)" data-to="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g,
      (_, a, b, l) => `\n[화살표: ${nameOf(a)} → ${nameOf(b)}${strip(l).trim() ? ` (${strip(l).trim()})` : ''}]\n`)
    .replace(/(<div\b[^>]*class="[^"]*\breact\b[^"]*"[^>]*data-on="([^"]*)"[^>]*>)/g, (_, tag, on) => `\n[외부 반응 → ${nameOf(on)}]\n${tag}`)
    .replace(/<span class="who">([\s\S]*?)<\/span>/g, '누가: $1\n')
    .replace(/<p class="check">\s*<span class="verdict ([a-z]+)">([\s\S]*?)<\/span>/g, '<p>원문 대조($1, $2): ')
    .replace(/<span class="chip[^"]*">([\s\S]*?)<\/span>/g, '[$1] ')
    .replace(/<span class="big">([\s\S]*?)<\/span>/g, ' $1 ')
    .replace(/<\/b>(?=\s*<(p|ul|span class="big"))/g, '</b>\n')
    .replace(/(<li\b[^>]*>\s*<b\b[^>]*>[\s\S]*?<\/b>)/g, '$1\n  ')
    // 표지 흐름 판의 장 번호 칩은 셸이 href 에서 만든다. 글에서도 같은 자리에 둔다
    .replace(/(<a\b[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>)/g, (tag) => { const h = /href="#p(\d+)"/.exec(tag); return `\n${tag}${h ? `[${h[1]}장] ` : ''}`; })
    .replace(/<span class="g">\s*<\/span>/g, '')
    .replace(/<span class="g">([\s\S]*?)<\/span>/g, '[$1] ')
    .replace(/<\/a>(\s*<span class="f">)/g, '</a> · $1');
}
const sections = body.split(/(?=<section\s+class="slide)/).slice(1).map((s) => s.split('</section>')[0]);
const text = sections.map((s, i) => {
  const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(s);
  const title = h2 ? clean(h2[1]) : i === 0 ? '표지' : '';
  const head = `===== 장 ${i + 1}: ${title} =====`;
  if (scan && board && i >= 1) return `${head}\n[${(/data-role="([^"]*)"/.exec(s) || [])[1] || ''}] ${part(s, 'lead')}`;
  return scan && i >= 2 ? `${head}\n[${part(s, 'eyebrow')}] ${part(s, 'key')}` : `${head}\n${clean(s)}`;
}).join('\n\n');

if (out) {
  writeFileSync(out, text + '\n');
  console.log(`${out}: 장 ${sections.length}개, 공백 뺀 ${text.replace(/\s/g, '').length}자`);
} else {
  process.stdout.write(text + '\n');
}
