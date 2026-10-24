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

[도식: …] 은 svg 의 aria-label, [그림: …] 은 img 의 alt, [접힌 내용: …] 은 details 의 summary 다.`;

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
const body = html.slice(html.indexOf('<body')).replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
const sections = body.split(/(?=<section\s+class="slide)/).slice(1).map((s) => s.split('</section>')[0]);
const text = sections.map((s, i) => {
  const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(s);
  const title = h2 ? clean(h2[1]) : i === 0 ? '표지' : '';
  const head = `===== 장 ${i + 1}: ${title} =====`;
  return scan && i >= 2 ? `${head}\n[${part(s, 'eyebrow')}] ${part(s, 'key')}` : `${head}\n${clean(s)}`;
}).join('\n\n');

if (out) {
  writeFileSync(out, text + '\n');
  console.log(`${out}: 장 ${sections.length}개, 공백 뺀 ${text.replace(/\s/g, '').length}자`);
} else {
  process.stdout.write(text + '\n');
}
