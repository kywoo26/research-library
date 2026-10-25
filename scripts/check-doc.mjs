#!/usr/bin/env node
// 문서 디렉터리가 저장소 규칙을 지키는지 검사한다.
//   node scripts/check-doc.mjs research/2026-08-05-llm-wiki-retrieval-as-reasoning
//   node scripts/check-doc.mjs            # 인자가 없으면 전체 검사
//   node scripts/check-doc.mjs --help     # 규칙 목록
//
// 통과 아니면 차단이다. 경고 등급은 없다. 경고를 만들면 전부 경고로 흘러가고
// 아무도 고치지 않는다. 예외가 필요하면 --allow=<rule-id> 로 명시적으로 끈다.
//
// 정적 검사일 뿐이다. 통과했다고 화면이 제대로 나온다는 뜻은 아니다.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESEARCH_DIR = join(ROOT, 'research');

const VOID = new Set([
  'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'path', 'line',
  'circle', 'rect', 'use', 'area', 'col', 'embed', 'track', 'wbr', 'polygon',
  'polyline', 'ellipse', 'stop', 'param',
]);

const SIZE_LIMIT = 1024 * 1024;

// 모든 문서에 있어야 하는 eyebrow. 문서 골격의 최소 뼈대다.
const REQUIRED_EYEBROWS = ['index', 'tl-dr', 'critique', 'sources'];

// 제작 과정 서술. 독자에게 정보를 주지 않는다.
// 원문에 없는 계산을 캡션에 표시하는 것은 예외이므로 여기 넣지 않는다.
const PROCESS_NARRATION = [
  /이\s*(자료|문서)\s*[는은][^.]{0,40}(정리했|만들었|작성했)/,
  /원문을\s*직접\s*(읽|확인)/,
  /모든\s*수치[는를을][^.]{0,30}(표에서|직접)/,
  /소개글이\s*아니/,
];

// board 셸은 날짜가 아니라 <html data-format="board"> 표시로 가른다. 2026-10-25 문서 둘은 같은 slug 로
// 다시 쓰이므로 날짜로 가를 수 없다. 표시 없이 쓸 수 있는 마지막 날은 2026-10-25 다.
const BOARD_FROM = '2026-10-26';
const MAX_LEAD_SENTENCES = 2;
// 상자는 이름, 한두 줄, 근거 줄이다. 상자 안에 문단이 들어가면 판이 글 벽이 된다.
const CARD_TITLE = 50, CARD_LINE = 120, CARD_LINES = 4;
const BOARD_CARDS = 14, BOARD_EDGES = 8;
const VERDICTS = ['holds', 'contra', 'open'];
// 그림 값의 단위. 셸 스크립트(assets/deck-shell.html)의 NUM 과 같은 목록이다
const PLOT_UNITS = ['%p', '%', 'pt', 'ms', 's', '초', '분', '시간', '일', '건', '개', '번', '회', '명', '배', 'x', '×', '원', '달러'];

const RULES = {
  'meta-json': 'meta.json 을 읽을 수 있고 title 과 date 가 있는가',
  'meta-date': 'meta.json 의 date 가 YYYY-MM-DD 인가',
  'meta-seq': 'meta.json 의 seq 가 1 이상의 정수인가 (같은 날짜 안의 목록 순서)',
  'seq-unique': 'seq 를 다른 문서와 겹쳐 쓰지 않는가',
  'meta-summary': 'meta.json 에 summary 가 있는가 (목록 설명이 비면 안 된다)',
  'title-subject': 'title 이 대상 이름을 담고 있는가 (slug 의 주제어와 대조한다)',
  'dir-name': '디렉터리 이름이 YYYY-MM-DD-slug 인가',
  'dir-date': '디렉터리 날짜와 meta.json date 가 같은가',
  'index-html': 'index.html 이 있는가',
  size: `파일이 ${SIZE_LIMIT / 1024}KB 이하인가 (내장 이미지를 압축할 것)`,
  doctype: '<!doctype html> 이 있는가 (없으면 quirks mode)',
  charset: '<meta charset="utf-8"> 가 있는가',
  lang: '<html> 에 lang 속성이 있는가',
  viewport: 'viewport meta 가 있는가',
  'title-tag': '<title> 이 있는가',
  'dark-theme': 'prefers-color-scheme: dark 대응이 있는가',
  external: '외부 리소스를 불러오지 않는가 (오프라인에서 열려야 한다)',
  'img-alt': '모든 <img> 에 alt 텍스트가 있는가',
  'tag-balance': '태그가 균형 잡혀 있는가',
  'dup-script': '<script> 블록이 하나뿐인가',
  'rail-count': '.rail-item 이 손으로 있으면 .slide 수와 같은가 (없으면 셸이 장에서 만든다)',
  'anchor-range': '#pN 앵커가 대상 문서의 슬라이드 수 안인가',
  'lineage-link': '../<slug>/ 링크가 실제로 존재하는 디렉터리인가',
  'series-backlink': '같은 series 문서끼리 서로 링크하는가',
  'eyebrow-set': `필수 eyebrow 가 다 있는가 (${REQUIRED_EYEBROWS.join(', ')}). board 문서는 chapter-roles 가 대신한다`,
  'svg-label': '모든 <svg> 에 role="img" 와 aria-label 이 있는가',
  'stat-sub': '모든 .stat 에 .sub 가 있는가 (단독 숫자 금지)',
  'em-dash': '본문에 em dash 가 없는가',
  'process-narration': '문서를 어떻게 만들었는지 쓰지 않았는가',
  'meta-purpose': `meta.json 의 purpose 가 ${'comparison / explainer / walkthrough'} 중 하나인가 (${'2026-09-30'} 이후 문서)`,
  'section-grammar': '표지 뒤 모든 장에 h2 와 .key 가 있는가 (sources 장은 .key 없이 된다. 2026-09-30 이후 문서. .dek 는 그 전 문서의 이름). board 문서는 chapter-grammar 가 대신한다',
  'heading-form': '제목, h2, .key(board 문서는 .lead) 가 라벨과 콜론·마침표, 쉼표 목록, 개수 세기, 문서의 자기 언급으로 시작하거나 이뤄지지 않았는가 (2026-10-14 이후 문서와 board 문서)',
  'title-copies': 'meta.json title, <title>, og:title, 표지 h1 이 같은 문자열인가 (2026-10-14 이후 문서)',
  'chapter-count': '장이 20개 이하인가 (2026-10-14 이후 문서)',
  'cover-length': '표지의 답이 공백을 뺀 280자 이하인가. board 문서는 p.answer 만 센다. 메커니즘의 단계는 표지 흐름 판으로 간다 (2026-10-14 이후 문서와 board 문서)',
  'cover-source': '표지에 출처 줄(p.src)이 있고 비어 있지 않은가. 누가 낸 어떤 자료인지가 첫 화면에 있어야 한다 (2026-10-25 이후 문서와 board 문서)',
  // ── board 문서. <html data-format="board"> 가 있는 문서에만 적용한다. 이 표시가 있으면 eyebrow-set 과
  //    section-grammar 대신 아래 규칙이 장 문법을 본다.
  'board-format': `${BOARD_FROM} 이후 문서는 board 셸(<html data-format="board">)로 쓰였는가`,
  'chapter-roles': 'board 문서: 첫 장이 data-role="cover" 이고 data-role="critique" 와 data-role="sources" 장이 있는가 (eyebrow-set 대신)',
  'chapter-grammar': `board 문서: 표지 뒤 모든 장에 h2, p.lead(${MAX_LEAD_SENTENCES}문장 이하), 본문(.board, figure.plot, table, pre, .plate, ul.points 중 하나)이 있는가. sources 장은 h2 만. 표지에는 p.answer 와 .board 가 있는가 (section-grammar 대신)`,
  'board-refs': 'board 문서: 상자의 data-col/data-lane 이 판의 data-cols/data-lanes 안에 있는가, .edge 의 data-from/data-to 가 같은 판의 상자 id 인가, 판에 aria-label 이 있는가, id 가 문서 안에서 겹치지 않는가',
  'card-length': `board 문서: 상자 제목(b)이 공백 뺀 ${CARD_TITLE}자, 줄(p, li) 하나가 ${CARD_LINE}자 이하이고, 줄이 ${CARD_LINES}개 이하인가. 문단은 상자에 넣지 않는다`,
  'board-size': `board 문서: 판 하나에 상자 ${BOARD_CARDS}개, 화살표 ${BOARD_EDGES}개, 주장 상자(t-key) 1개 이하인가`,
  'plot-data': `board 문서: table.plot-data 의 열 번호(data-series, data-x, data-y, data-cat)가 표 안에 있고, 그 열의 값이 숫자로 읽히며(앞에 약 ~ + - $, 뒤에 k M B 와 단위 ${PLOT_UNITS.join(' ')}), data-ref 의 행 id 와 data-emph 의 이름이 표에 있는가`,
  'cover-links': 'board 문서: 표지의 #pN 링크가 있는 장을 가리키고, 목록 링크 글 「N · 이름」 의 N 과 이름이 그 장의 번호와 data-label 과 같은가',
  'react-target': 'board 문서: 반응 상자(.card.react)가 data-on 으로 같은 판의 상자를 가리키고 그 상자 바로 뒤에 있으며, .who, .check 와 .verdict(holds|contra|open)를 갖는가',
};

// 장 문법과 purpose 는 2026-09-30 부터 쓴 문서에만 요구한다. 그 전 28편은 .dek 와 무목적으로
// 발행됐고, 다시 쓰지 않는 한 그대로 둔다.
const NEW_GRAMMAR_FROM = '2026-09-30';
// 제목 형태와 장 수는 2026-10-13 인터뷰에서 정한 것이라 그 뒤 문서에만 요구한다
// (docs/harness-doctor-2026-10-13.md). 그 전 문서의 장 제목은 29% 가 라벨 꼴이다.
const NEW_FORM_FROM = '2026-10-14';
const MAX_CHAPTERS = 20;
// 문장 수로 세면 문장이 길어져 피해 간다(2026-10-14 Meta 재작성). 한글만 세면 영어 기술 용어가 빠진다.
// 그래서 공백을 뺀 글자로 센다. prose-ko.md 의 모범 표지가 226자다.
const MAX_COVER_CHARS = 280;
// 출처 줄은 2026-10-25 표지 실험에서 정한 것이라 그 뒤 문서에만 요구한다.
const COVER_SOURCE_FROM = '2026-10-25';

// 제목 자리에서 독자가 기계가 쓴 글로 읽는 형태. 본문은 막지 않고 검토자가 본다.
const decode = (t) => t.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const textOf = (h) => decode(h.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
// 코드 안의 콜론과 쉼표는 형태가 아니다. 코드 조각은 자리표시 하나로 바꿔 놓고 본다.
const formTextOf = (h) => textOf(h.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, 'X'));
function headingForms(text, { heading }) {
  const found = [];
  const label = /^([^:：]{1,40})[:：]\s/.exec(text);
  if (label && !/^\d+$/.test(label[1].trim())) found.push('라벨과 콜론');
  if (heading && /^[가-힣A-Za-z]{1,8}( ?\d+)?\.\s/.test(text)) found.push('라벨과 마침표');
  if (heading && (text.match(/(?<!\d)[,，](?!\d)|·/g) || []).length >= 2) found.push('쉼표 목록');
  if (/(\d+|두|세|네|다섯)\s?가지/.test(text) || /(은|는|이|가)\s(둘|셋|넷|다섯)(이다|뿐이다|이\s있다|\.|$)/.test(text)
    || /(은|는|이|가)\s(\d+|두|세|네|다섯)\s?(개|곳)(이다|다|뿐이다)/.test(text)) found.push('개수 세기');
  if (/(^|[^가-힣])(이|본)\s(문서|글|보고서|장)(은|는|이|가|에서는|의)\s/.test(text)) found.push('자기 언급');
  return found;
}
const PURPOSES = ['comparison', 'explainer', 'walkthrough'];

// 제목은 목록에서 한 줄로 읽힌다. 라이브러리나 시스템 이름이 없으면 무엇에 관한
// 문서인지 열어보기 전에는 알 수 없다. slug 에 이미 대상 이름이 들어 있으므로
// 별도 필드를 두지 않고 slug 와 대조한다.
//
// 네 글자 미만은 뺀다. as, of, kv 같은 조각이 우연히 제목에 섞여 통과시키는 것을
// 막기 위해서다. 통과했다고 좋은 제목이라는 뜻은 아니다. 이건 바닥이고, 제목을
// 어떻게 쓰는지는 research-doc skill 에 있다.
function subjectTokens(slug) {
  return slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').split('-').filter((t) => t.length >= 4);
}

function stripCode(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

// 문안 규칙은 문서가 스스로 쓴 문장에만 적용한다. 원문 인용은 손대면 안 되는 자리다.
// 코드 주석에 em dash 가 있다고 인용을 고치면 그건 인용이 아니게 된다. 그래서 문안
// 검사에서만 인용 구간을 뺀다. 태그 균형 검사는 그대로 전체를 본다.
//
// 이 저장소가 인용을 담는 그릇은 <pre>/<code> 가 아니라 `.q`, `.wl`, `<cite>` 다.
// check-prose.mjs 의 visibleProse 와 같은 목록을 뺀다.
function stripQuoted(html) {
  return stripCode(html)
    .replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<code[\s\S]*?<\/code>/gi, '')
    .replace(/<(p|span|div)\b[^>]*class="[^"]*\b(?:q|wl)\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<cite\b[\s\S]*?<\/cite>/gi, ' ');
}

// ---- board 문서 ----
// 판은 div 안에 div 가 들어가므로 정규식 하나로 끝을 찾을 수 없다. 태그 깊이를 세어 요소를 나눈다.
function childrenOf(html) {
  const out = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(\/?)>/g;
  let depth = 0, cur = null, m;
  while ((m = re.exec(html))) {
    const [, close, raw, attrs, self] = m;
    const tag = raw.toLowerCase();
    if (VOID.has(tag) || self === '/') {
      if (depth === 0) out.push({ tag, attrs, inner: '', index: m.index });
      continue;
    }
    if (!close) {
      if (depth === 0) cur = { tag, attrs, index: m.index, from: re.lastIndex };
      depth++;
    } else if (depth > 0) {
      depth--;
      if (depth === 0 && cur) { cur.inner = html.slice(cur.from, m.index); out.push(cur); cur = null; }
    }
  }
  return out;
}
function walk(html, fn) {
  for (const el of childrenOf(html)) { fn(el); if (el.inner) walk(el.inner, fn); }
}
const attrOf = (attrs, name) => { const m = new RegExp(`(?:^|\\s)${name}=["']([^"']*)["']`).exec(attrs); return m ? decode(m[1]) : null; };
const classesOf = (attrs) => (attrOf(attrs, 'class') || '').split(/\s+/).filter(Boolean);
const plain = (h) => textOf(h).replace(/\s/g, '');
// 셸 스크립트의 idx 와 같은 해석: 이름, 1부터 세는 번호, a..b 범위, all
function cellIndex(spec, names) {
  if (spec == null) return [0, 0];
  if (spec === 'all') return [0, names.length - 1];
  const one = (v) => { const n = names.indexOf(v); if (n >= 0) return n; const k = parseInt(v, 10); return Number.isNaN(k) || String(k) !== v ? -1 : k - 1; };
  const [a, b] = spec.split('..').map((x) => x.trim());
  const i = one(a), j = b === undefined ? i : one(b);
  return i < 0 || j < 0 || i >= names.length || j >= names.length || j < i ? null : [i, j];
}
const PLOT_NUM = new RegExp(`^[+-]?\\$?\\d+(\\.\\d+)?[kMB]?(${PLOT_UNITS.map((u) => u.replace(/[%$]/g, '\\$&')).join('|')})?$`);
const plotNumber = (t) => PLOT_NUM.test(textOf(t).replace(/약|~|,|\s/g, ''));

function checkBoardDoc(html, meta, add) {
  const body = stripCode(html);
  const sections = body.split(/<section\s+class="slide\b/).slice(1).map((s) => s.split(/<\/section>/)[0]);
  const roleOf = (s) => attrOf(s.slice(0, s.indexOf('>')), 'data-role');
  const roles = sections.map(roleOf);
  if (roles[0] !== 'cover') add('chapter-roles', `첫 장의 data-role 이 cover 가 아니다 (${JSON.stringify(roles[0])}). 표지가 문서의 첫 장이다`);
  for (const need of ['critique', 'sources']) {
    if (!roles.includes(need)) add('chapter-roles', `data-role="${need}" 장이 없다`);
  }
  // 표지의 링크는 장 번호로 간다. 장을 합치거나 옮기면 번호가 밀리므로 목록 글과 대상 장을 맞춰 본다
  const labels = sections.map((s) => attrOf(s.slice(0, s.indexOf('>')), 'data-label'));
  const seenBad = new Set();
  for (const m of (sections[0] || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const href = attrOf(m[1], 'href');
    const n = href && /^#p(\d+)$/.exec(href) ? Number(href.slice(2)) : null;
    if (n === null) continue;
    if (n < 1 || n > sections.length) { if (!seenBad.has(n)) add('cover-links', `표지 링크 ${href} 가 없는 장을 가리킨다 (장 ${sections.length}개)`); seenBad.add(n); continue; }
    const t = textOf(m[2]);
    const listed = /^(\d+)\s*·\s*(.+)$/.exec(t);
    if (listed && (Number(listed[1]) !== n || listed[2].trim() !== (labels[n - 1] || '').trim())) {
      add('cover-links', `표지 목록 「${t}」 이 ${href} 를 가리키는데 그 장은 「${n} · ${labels[n - 1] || ''}」 이다`);
    }
  }
  sections.forEach((s, k) => {
    const n = k + 1;
    if (k === 0) {
      if (!/<p\b[^>]*class="[^"]*\banswer\b/.test(s)) add('chapter-grammar', '표지에 p.answer 가 없다. 질문에 대한 답 문단이 첫 화면에 있어야 한다');
      if (!/class="[^"]*\bboard\b/.test(s)) add('chapter-grammar', '표지에 논증 흐름 판(.board)이 없다');
      return;
    }
    const lacks = [];
    if (!/<h2\b/.test(s)) lacks.push('h2');
    if (roles[k] !== 'sources') {
      const lead = /<p\b[^>]*class="[^"]*\blead\b[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(s);
      if (!lead) lacks.push('p.lead');
      else {
        const sentences = textOf(lead[1]).split(/(?<=[.?!])\s+/).filter((x) => x.trim());
        if (sentences.length > MAX_LEAD_SENTENCES) add('chapter-grammar', `${n}장 p.lead 가 ${sentences.length}문장이다 (상한 ${MAX_LEAD_SENTENCES}). 숫자와 사실은 판의 상자로 보낸다`);
      }
      const hasBody = /class="[^"]*\bboard\b/.test(s) || /<figure\b[^>]*class="[^"]*\bplot\b/.test(s) || /<table\b/.test(s)
        || /<pre\b/.test(s) || /class="[^"]*\bplate\b/.test(s) || /<ul\b[^>]*class="[^"]*\bpoints\b/.test(s);
      if (!hasBody) lacks.push('본문(.board, figure.plot, table, pre, .plate, ul.points)');
    }
    if (lacks.length) add('chapter-grammar', `${n}장에 ${lacks.join(', ')} 가 없다`);
  });

  // id 는 화살표와 반응이 상자를 찾는 이름이라 문서 안에서 하나여야 한다
  const ids = new Map();
  walk(body, (el) => { const id = attrOf(el.attrs, 'id'); if (id) ids.set(id, (ids.get(id) || 0) + 1); });
  for (const [id, c] of ids) if (c > 1) add('board-refs', `id "${id}" 가 ${c}번 쓰였다`);

  let bi = 0;
  walk(body, (el) => {
    const cls = classesOf(el.attrs);
    if (cls.includes('board')) {
      bi++;
      const name = attrOf(el.attrs, 'aria-label') || `${bi}번째 판`;
      if (!attrOf(el.attrs, 'aria-label')) add('board-refs', `${bi}번째 판에 aria-label 이 없다. 판이 무엇을 보여 주는지 한 문장으로 쓴다`);
      const cols = (attrOf(el.attrs, 'data-cols') || '').split('|').map((x) => x.trim()).filter(Boolean);
      const lanes = (attrOf(el.attrs, 'data-lanes') || '').split('|').map((x) => x.trim()).filter(Boolean);
      const kids = childrenOf(el.inner);
      const cards = kids.filter((c) => classesOf(c.attrs).includes('card'));
      const edges = kids.filter((c) => classesOf(c.attrs).includes('edge'));
      const cardIds = new Map(cards.map((c, i) => [attrOf(c.attrs, 'id'), i]).filter(([id]) => id));
      const title = (c) => { const b = /<b\b[^>]*>([\s\S]*?)<\/b>/.exec(c.inner) || /class="who"[^>]*>([\s\S]*?)<\/span>/.exec(c.inner); return (b ? textOf(b[1]) : textOf(c.inner)).slice(0, 30); };
      if (cards.length > BOARD_CARDS) add('board-size', `판 「${name.slice(0, 40)}」 에 상자가 ${cards.length}개다 (상한 ${BOARD_CARDS}). 판을 둘로 나눈다`);
      const keys = cards.filter((c) => classesOf(c.attrs).includes('t-key')).length;
      if (keys > 1) add('board-size', `판 「${name.slice(0, 40)}」 에 t-key 상자가 ${keys}개다. 장이 주장하는 상자 하나만 t-key 로 둔다`);
      if (edges.length > BOARD_EDGES) add('board-size', `판 「${name.slice(0, 40)}」 에 화살표가 ${edges.length}개다 (상한 ${BOARD_EDGES}). 이웃한 칸 사이와 되돌아가는 화살표만 남긴다`);
      cards.forEach((c, i) => {
        const col = attrOf(c.attrs, 'data-col'), lane = attrOf(c.attrs, 'data-lane');
        const isReact = classesOf(c.attrs).includes('react');
        if (!(isReact && col == null) && cellIndex(col, cols.length ? cols : ['1']) === null) add('board-refs', `판 「${name.slice(0, 40)}」 의 상자 「${title(c)}」 data-col="${col}" 이 data-cols 에 없다`);
        if (!(isReact && lane == null) && cellIndex(lane, lanes.length ? lanes : ['1']) === null) add('board-refs', `판 「${name.slice(0, 40)}」 의 상자 「${title(c)}」 data-lane="${lane}" 이 data-lanes 에 없다`);
        // 상자 글의 길이
        const b = /<b\b[^>]*>([\s\S]*?)<\/b>/.exec(c.inner);
        if (b && plain(b[1]).length > CARD_TITLE) add('card-length', `상자 제목 「${textOf(b[1]).slice(0, 40)}」 이 ${plain(b[1]).length}자다 (상한 ${CARD_TITLE})`);
        const lines = [...c.inner.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2]).filter((t) => !/^\s*(<span class="chip">[^<]*<\/span>\s*)+$/.test(t));
        if (lines.length > CARD_LINES) add('card-length', `상자 「${title(c)}」 에 줄이 ${lines.length}개다 (상한 ${CARD_LINES})`);
        for (const t of lines) if (plain(t).length > CARD_LINE) add('card-length', `상자 「${title(c)}」 의 한 줄이 ${plain(t).length}자다 (상한 ${CARD_LINE}): ${textOf(t).slice(0, 40)}…`);
        if (isReact) {
          const on = attrOf(c.attrs, 'data-on');
          if (!on || !cardIds.has(on)) add('react-target', `반응 상자 「${title(c)}」 의 data-on="${on}" 이 같은 판의 상자가 아니다`);
          else if (cardIds.get(on) !== i - 1) add('react-target', `반응 상자는 그것이 바꾸는 상자(${on}) 바로 뒤에 쓴다`);
          if (!/class="[^"]*\bwho\b/.test(c.inner)) add('react-target', `반응 상자 「${title(c)}」 에 .who(누가, 어디서, 언제)가 없다`);
          if (!/class="[^"]*\bcheck\b/.test(c.inner)) add('react-target', `반응 상자 「${title(c)}」 에 .check(원문과 맞춰 본 결과)가 없다`);
          const v = /class="verdict\s+([a-z]+)"/.exec(c.inner);
          if (!v || !VERDICTS.includes(v[1])) add('react-target', `반응 상자 「${title(c)}」 의 .verdict 가 ${VERDICTS.join(' / ')} 중 하나가 아니다`);
        }
      });
      for (const e of edges) {
        for (const end of ['data-from', 'data-to']) {
          const id = attrOf(e.attrs, end);
          if (!id || !cardIds.has(id)) add('board-refs', `판 「${name.slice(0, 40)}」 의 화살표 ${end}="${id}" 가 이 판의 상자 id 가 아니다`);
        }
      }
    }
    if (el.tag === 'table' && cls.includes('plot-data')) {
      const head = /<thead\b[\s\S]*?<\/thead>/.exec(el.inner);
      const ncol = head ? [...head[0].matchAll(/<th\b/g)].length : 0;
      const rows = [...el.inner.replace(/<thead\b[\s\S]*?<\/thead>/, '').matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g)]
        .map((m) => ({ attrs: m[1], cells: [...m[2].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1]) }));
      const fig = attrOf(el.attrs, 'data-kind') === 'bars' ? 'bars' : 'line';
      const where = `plot-data 표(${rows[0] ? textOf(rows[0].cells[0] || '') : '빈 표'}…)`;
      if (rows.length < 2) add('plot-data', `${where} 에 행이 ${rows.length}개다`);
      const colAttr = (name, required) => {
        const v = attrOf(el.attrs, name);
        if (v == null) { if (required) add('plot-data', `${where} 에 ${name} 이 없다`); return []; }
        const ks = v.split(/\s+/).filter(Boolean).map(Number);
        for (const k of ks) if (!Number.isInteger(k) || k < 0 || k >= ncol) add('plot-data', `${where} 의 ${name}="${v}" 가 열 번호(0~${ncol - 1})가 아니다`);
        return ks.filter((k) => Number.isInteger(k) && k >= 0 && k < ncol);
      };
      const numeric = fig === 'bars' ? colAttr('data-y', true) : [...colAttr('data-x', true), ...colAttr('data-y', true)];
      const label = fig === 'bars' ? colAttr('data-cat', false) : colAttr('data-series', true);
      const notNumbers = [];
      for (const r of rows) {
        if (r.cells.length !== ncol) add('plot-data', `${where} 의 한 행에 칸이 ${r.cells.length}개다 (머리 ${ncol}칸)`);
        for (const k of numeric) if (r.cells[k] != null && !plotNumber(r.cells[k])) notNumbers.push(textOf(r.cells[k]));
      }
      if (notNumbers.length) add('plot-data', `${where} 의 값 ${notNumbers.length}개를 숫자로 읽을 수 없다 (첫 값 「${notNumbers[0]}」). 숫자와 단위(%, k, M, 건, 분)만 쓴다`);
      const names = new Set(rows.map((r) => textOf(r.cells[label.length ? label[0] : 0] || '')));
      for (const nm of (attrOf(el.attrs, 'data-emph') || '').split('|').map((x) => x.trim()).filter(Boolean)) {
        if (!names.has(nm)) add('plot-data', `${where} 의 data-emph 「${nm}」 가 ${fig === 'bars' ? '항목' : '계열'} 열에 없다`);
      }
      if (fig === 'line') {
        const rowIds = new Set(rows.map((r) => attrOf(r.attrs, 'id')).filter(Boolean));
        for (const id of (attrOf(el.attrs, 'data-ref') || '').split(/\s+/).filter(Boolean)) {
          if (!rowIds.has(id)) add('plot-data', `${where} 의 data-ref 행 「${id}」 가 표에 없다`);
        }
      }
    }
  });
}

function checkTagBalance(html) {
  const body = stripCode(html).replace(/<!doctype[^>]*>/gi, '');
  const stack = [];
  const problems = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(body))) {
    const [, closing, rawTag, selfClose] = m;
    const tag = rawTag.toLowerCase();
    if (VOID.has(tag) || selfClose === '/') continue;
    if (!closing) {
      stack.push(tag);
    } else if (stack.length === 0) {
      problems.push(`짝 없는 닫는 태그 </${tag}>`);
    } else if (stack[stack.length - 1] !== tag) {
      problems.push(`태그 어긋남: </${tag}> 앞에 <${stack[stack.length - 1]}> 가 열려 있음`);
      const at = stack.lastIndexOf(tag);
      if (at >= 0) stack.length = at;
    } else {
      stack.pop();
    }
  }
  if (stack.length) problems.push(`닫히지 않은 태그: ${stack.join(', ')}`);
  return problems;
}

function lineOf(html, index) {
  return html.slice(0, index).split('\n').length;
}

// 문서를 읽어 교차 검사에 필요한 정보를 뽑는다.
async function loadDoc(dir) {
  const slug = relative(ROOT, dir).split('/').pop();
  const doc = { slug, dir, meta: null, metaError: null, html: null };
  try {
    doc.meta = JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8'));
  } catch (err) {
    doc.metaError = err.message;
  }
  try {
    doc.html = await readFile(join(dir, 'index.html'), 'utf8');
  } catch {
    return doc;
  }
  doc.size = Buffer.byteLength(doc.html);
  doc.slideCount = (doc.html.match(/<section\s+class="slide\b/g) || []).length;
  doc.railCount = (doc.html.match(/class="rail-item"/g) || []).length;
  return doc;
}

function checkDoc(doc, byslug) {
  const p = [];
  const add = (rule, msg) => p.push({ rule, msg });

  if (doc.metaError) add('meta-json', `meta.json 읽기 실패: ${doc.metaError}`);
  const meta = doc.meta;
  if (meta) {
    for (const f of ['title', 'date']) {
      if (!meta[f]) add('meta-json', `meta.json 에 ${f} 없음`);
    }
    if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
      add('meta-date', `date 형식이 YYYY-MM-DD 가 아님: ${meta.date}`);
    }
    // date 는 하루 단위라 같은 날 넣은 문서를 구분하지 못한다. seq 가 없으면 목록
    // 순서가 slug 알파벳순으로 밀리고, 그건 아무도 정하지 않은 순서다.
    if (meta.seq === undefined) {
      add('meta-seq', 'meta.json 에 seq 없음. 기존 최댓값 + 1 을 넣을 것');
    } else if (!Number.isInteger(meta.seq) || meta.seq < 1) {
      add('meta-seq', `seq 는 1 이상의 정수여야 한다: ${JSON.stringify(meta.seq)}`);
    } else {
      const clash = [...byslug.values()]
        .filter((o) => o.slug !== doc.slug && o.meta?.seq === meta.seq)
        .map((o) => o.slug);
      if (clash.length) {
        add('seq-unique', `seq ${meta.seq} 를 ${clash.join(', ')} 와 함께 쓴다. 순서가 정해지지 않는다`);
      }
    }
    if (!meta.summary) add('meta-summary', 'meta.json 에 summary 없음');
    if (meta.date >= NEW_GRAMMAR_FROM && !PURPOSES.includes(meta.purpose)) {
      add('meta-purpose', `purpose 가 ${PURPOSES.join(' / ')} 중 하나가 아니다: ${JSON.stringify(meta.purpose)}. 독자가 이 문서로 무엇을 하는지가 장 구성을 정한다`);
    }

    if (meta.title) {
      const want = subjectTokens(doc.slug);
      const lower = meta.title.toLowerCase();
      if (want.length && !want.some((t) => lower.includes(t))) {
        add('title-subject',
          `title 에 대상 이름이 없다: "${meta.title}". slug 의 ${want.join(', ')} 중 하나는 들어가야 한다`);
      }
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(doc.slug)) {
    add('dir-name', `디렉터리 이름이 YYYY-MM-DD-slug 형식이 아님: ${doc.slug}`);
  }
  if (meta?.date && !doc.slug.startsWith(meta.date)) {
    add('dir-date', `디렉터리 날짜(${doc.slug.slice(0, 10)})와 meta.json date(${meta.date})가 다름`);
  }

  const html = doc.html;
  if (html === null) {
    add('index-html', 'index.html 없음');
    return p;
  }

  // board 셸 표시. 있으면 장 문법은 board 규칙이 본다. 없으면 아래 옛 규칙이 그대로 돈다.
  const board = /<html\b[^>]*\sdata-format=["']board["']/i.test(html);
  if (!board && meta?.date >= BOARD_FROM) {
    add('board-format', `${meta.date} 문서인데 board 셸 표시(<html data-format="board">)가 없다. node scripts/new-doc.mjs 가 만든 셸로 쓴다`);
  }

  if (doc.size > SIZE_LIMIT) {
    add('size', `파일이 ${(doc.size / 1048576).toFixed(2)}MB 다 (한도 ${SIZE_LIMIT / 1024}KB). 내장 이미지를 압축할 것`);
  }

  if (!/^\s*<!doctype html>/i.test(html)) add('doctype', '<!doctype html> 없음');
  if (!/<meta\s+charset=["']?utf-8/i.test(html)) add('charset', '<meta charset="utf-8"> 없음');
  if (!/<html[^>]*\slang=/i.test(html)) add('lang', '<html> 에 lang 속성 없음');
  if (!/name=["']viewport["']/i.test(html)) add('viewport', 'viewport meta 없음');
  if (!/<title>/i.test(html)) add('title-tag', '<title> 없음');
  if (!/prefers-color-scheme:\s*dark/i.test(html)) add('dark-theme', '다크 테마 대응 없음');

  const loads = [
    ...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi),
    ...html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi),
    ...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi),
    ...html.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/gi),
  ].map((m) => m[1]);
  const external = loads.filter((u) => /^(https?:)?\/\//i.test(u));
  if (external.length) {
    add('external', `외부 리소스를 불러온다: ${[...new Set(external)].join(', ')}`);
  }

  const noAlt = [...html.matchAll(/<img\b[^>]*>/gi)]
    .filter((m) => !/\salt=["'][^"']+["']/i.test(m[0]));
  if (noAlt.length) {
    add('img-alt', `alt 텍스트가 없거나 빈 <img> ${noAlt.length}개 (첫 번째: ${lineOf(html, noAlt[0].index)}행)`);
  }

  for (const msg of checkTagBalance(html)) add('tag-balance', msg);

  // --- 덱 구조 ---
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)];
  if (scripts.length > 1) {
    add('dup-script', `<script> 블록이 ${scripts.length}개다 (${scripts.map((m) => lineOf(html, m.index) + '행').join(', ')}). 덱 스크립트는 하나여야 한다`);
  }
  if (doc.railCount && doc.slideCount !== doc.railCount) {
    add('rail-count', `.slide ${doc.slideCount}개인데 .rail-item 은 ${doc.railCount}개다`);
  }

  // --- 문서 간 링크 ---
  const crossLinks = new Map(); // slug -> Set(anchor number | null)
  for (const m of html.matchAll(/href="\.\.\/([^"/]+)\/(#p(\d+))?/g)) {
    const [, target, , n] = m;
    if (!crossLinks.has(target)) crossLinks.set(target, new Set());
    if (n) crossLinks.get(target).add(Number(n));
  }
  for (const [target, anchors] of crossLinks) {
    const other = byslug.get(target);
    if (!other) {
      add('lineage-link', `../${target}/ 는 존재하지 않는 디렉터리다`);
      continue;
    }
    for (const n of anchors) {
      if (n < 1 || n > other.slideCount) {
        add('anchor-range', `../${target}/#p${n} 은 범위 밖이다 (그 문서는 슬라이드 ${other.slideCount}개)`);
      }
    }
  }

  if (meta?.series) {
    for (const other of byslug.values()) {
      if (other.slug === doc.slug) continue;
      if (other.meta?.series !== meta.series) continue;
      if (!crossLinks.has(other.slug)) {
        add('series-backlink', `같은 series(${meta.series}) 인 ${other.slug} 로 가는 링크가 없다`);
      }
    }
  }

  // --- 슬라이드 문법 ---
  if (!board) {
  const eyebrows = new Set(
    [...html.matchAll(/<p class="eyebrow">([^<]*)</g)].map((m) => m[1].trim())
  );
  const missing = REQUIRED_EYEBROWS.filter((e) => !eyebrows.has(e));
  if (missing.length) {
    add('eyebrow-set', `필수 eyebrow 누락: ${missing.join(', ')}`);
  }
  if (meta?.date >= NEW_GRAMMAR_FROM) {
    const sections = html.split(/<section\s+class="slide\b/).slice(2);   // 표지는 h1 과 요약이라 뺀다
    sections.forEach((s, k) => {
      const lacks = [];
      if (!/<h2\b/.test(s)) lacks.push('h2');
      // sources 장은 주장이 없어 .key 를 요구하지 않는다. 요구하면 채우기용 문장이 생긴다.
      const isSources = /<p class="eyebrow">\s*sources\s*</.test(s);
      if (!isSources && !/class="key"/.test(s)) lacks.push('.key');
      if (lacks.length) add('section-grammar', `${k + 2}장에 ${lacks.join(', ')} 가 없다. 제목 아래 핵심 한두 문장이 있어야 훑는 독자가 주장을 만난다`);
    });
  }
  } else {
    checkBoardDoc(html, meta, add);
  }

  if (meta && (meta.date >= NEW_FORM_FROM || board)) {
    const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html);
    const title = /<title>([\s\S]*?)<\/title>/.exec(html);
    const og = /<meta\s+property="og:title"\s+content="([^"]*)"/.exec(html);
    const copies = [meta.title, h1 && textOf(h1[1]), title && textOf(title[1]), og && decode(og[1])].filter((x) => x != null);
    if (new Set(copies.map((x) => x.trim())).size > 1) {
      add('title-copies', `제목 사본이 서로 다르다: ${[...new Set(copies)].map((x) => `「${x}」`).join(' / ')}`);
    }
    const spots = [];
    if (meta.title) spots.push(['문서 제목', meta.title, true]);
    for (const m of html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)) spots.push([`${lineOf(html, m.index)}행 h2`, formTextOf(m[1]), true]);
    for (const m of html.matchAll(/<p class="key"[^>]*>([\s\S]*?)<\/p>/g)) spots.push([`${lineOf(html, m.index)}행 .key`, formTextOf(m[1]), false]);
    if (board) for (const m of html.matchAll(/<p class="lead"[^>]*>([\s\S]*?)<\/p>/g)) spots.push([`${lineOf(html, m.index)}행 .lead`, formTextOf(m[1]), false]);
    for (const [where, text, heading] of spots) {
      const forms = headingForms(text, { heading });
      if (forms.length) add('heading-form', board
        ? `${where} 「${text.slice(0, 60)}」 이 ${forms.join(', ')} 꼴이다. 제목, h2, .lead 는 라벨이나 목록, 개수 세기 꼴 없이 문장으로 쓴다 (prose-ko.md)`
        : `${where} 「${text.slice(0, 60)}」 이 ${forms.join(', ')} 꼴이다. 제목은 장이 담은 것을 가리키는 짧은 말로, 주장은 .key 에 쓴다 (prose-ko.md)`);
    }
    const coverRaw = html.split(/<section\s+class="slide\b/)[1] || '';
    const cover = coverRaw.slice(coverRaw.indexOf('>') + 1);   // 여는 태그의 나머지 속성은 본문이 아니다
    const coverProse = textOf(cover.replace(/<details\b[\s\S]*?<\/details>/g, '').replace(/<h1\b[\s\S]*?<\/h1>/g, '')
      .replace(/<p class="eyebrow">[\s\S]*?<\/p>/g, '').replace(/<[^>]*class="[^"]*\b(sub|src|meta)\b[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g, ''));
    // board 문서의 표지는 답 문단과 흐름 판이다. 판의 상자는 장마다 사실 하나라 답의 길이에 넣지 않는다.
    const answer = board ? /<p\b[^>]*class="[^"]*\banswer\b[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(cover.split(/<\/section>/)[0]) : null;
    const coverChars = (board ? (answer ? textOf(answer[1]) : '') : coverProse).replace(/\s/g, '').length;
    if (coverChars > MAX_COVER_CHARS) {
      add('cover-length', board
        ? `표지의 답(p.answer)이 공백을 뺀 ${coverChars}자다 (상한 ${MAX_COVER_CHARS}). 무엇인지, 핵심 하나, 가장 중요한 차이 하나만 두고 단계는 흐름 판의 상자로 보낸다`
        : `표지의 답이 공백을 뺀 ${coverChars}자다 (상한 ${MAX_COVER_CHARS}). 무엇인지, 핵심 하나, 가장 중요한 차이 하나만 두고 단계는 tl-dr 로 보낸다`);
    }
    if (meta.date >= COVER_SOURCE_FROM || board) {
      const src = /<p class="src"[^>]*>([\s\S]*?)<\/p>/.exec(cover.split(/<\/section>/)[0]);
      const srcText = src ? textOf(src[1]).trim() : '';
      if (!srcText || /^TODO\b/.test(srcText)) {
        add('cover-source', '표지에 출처 줄(p.src)이 없거나 비었다. 누가 낸 어떤 자료인지(조직과 팀, 또는 저자와 역할)와 고정한 판을 한두 문장으로 쓴다');
      }
    }
    if (doc.slideCount > MAX_CHAPTERS) {
      add('chapter-count', `장이 ${doc.slideCount}개다 (상한 ${MAX_CHAPTERS}). 독자가 한 장으로 읽을 장은 합친다`);
    }
  }

  for (const m of html.matchAll(/<svg\b[^>]*>/gi)) {
    const tag = m[0];
    const lacks = [];
    if (!/\brole=["']img["']/i.test(tag)) lacks.push('role="img"');
    if (!/\baria-label=["'][^"']+["']/i.test(tag)) lacks.push('aria-label');
    if (lacks.length) {
      add('svg-label', `${lineOf(html, m.index)}행 <svg> 에 ${lacks.join(', ')} 없음. 그림이 무엇을 보여주는지 문장으로 쓸 것`);
    }
  }

  for (const m of html.matchAll(/<div class="stat\b[^"]*">([\s\S]*?)<\/div>/g)) {
    if (!/class="sub"/.test(m[1])) {
      add('stat-sub', `${lineOf(html, m.index)}행 .stat 에 .sub 가 없다. 숫자는 비교 기준과 함께 써야 한다`);
    }
  }

  // --- 문안 ---
  const prose = stripQuoted(html);
  const emIdx = prose.indexOf('—');
  if (emIdx >= 0) {
    const around = prose.slice(Math.max(0, emIdx - 40), emIdx + 40).replace(/\s+/g, ' ');
    add('em-dash', `em dash 를 쓴다. 쉼표나 문장 분리로 바꿀 것: ...${around}...`);
  }
  for (const re of PROCESS_NARRATION) {
    const hit = prose.match(re);
    if (hit) add('process-narration', `제작 과정을 서술한다: ${hit[0].replace(/\s+/g, ' ')}`);
  }

  return p;
}

// ---- CLI ----

const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log('사용법: node scripts/check-doc.mjs [research/<slug>] [--allow=rule,rule]\n');
  console.log('통과 아니면 차단이다. 경고 등급은 없다.\n');
  console.log('규칙:');
  const width = Math.max(...Object.keys(RULES).map((k) => k.length));
  for (const [id, desc] of Object.entries(RULES)) {
    console.log(`  ${id.padEnd(width)}  ${desc}`);
  }
  console.log('\n예외를 두려면:  --allow=size,dup-script');
  process.exit(0);
}

const allowArg = argv.find((a) => a.startsWith('--allow='));
const allowed = new Set(
  allowArg ? allowArg.slice('--allow='.length).split(',').map((s) => s.trim()).filter(Boolean) : []
);
for (const id of allowed) {
  if (!RULES[id]) {
    console.error(`알 수 없는 규칙 id: ${id}\n--help 로 목록을 볼 것.`);
    process.exit(2);
  }
}

const target = argv.find((a) => !a.startsWith('-'));

// 교차 검사가 있으므로 항상 전체를 읽고, 출력만 대상으로 좁힌다.
const names = (await readdir(RESEARCH_DIR).catch(() => []))
  .filter((n) => !n.startsWith('.'))
  .sort();
const all = [];
for (const n of names) {
  const d = join(RESEARCH_DIR, n);
  if ((await stat(d)).isDirectory()) all.push(await loadDoc(d));
}
const byslug = new Map(all.map((d) => [d.slug, d]));

let selected = all;
if (target) {
  const want = target.replace(/\/+$/, '').split('/').pop();
  selected = all.filter((d) => d.slug === want);
  if (!selected.length) {
    console.error(`그런 문서가 없다: ${target}`);
    process.exit(2);
  }
}

if (!selected.length) {
  console.log('검사할 문서가 없다.');
  process.exit(0);
}

let failed = 0;
for (const doc of selected) {
  const problems = checkDoc(doc, byslug);
  const blocked = problems.filter((x) => !allowed.has(x.rule));
  const waived = problems.filter((x) => allowed.has(x.rule));
  const mark = blocked.length ? 'FAIL' : 'OK  ';
  console.log(`${mark}  research/${doc.slug}`);
  for (const x of blocked) console.log(`      [${x.rule}] ${x.msg}`);
  for (const x of waived) console.log(`      허용됨  [${x.rule}] ${x.msg}`);
  if (blocked.length) failed++;
}

if (failed) {
  console.log(`\n${failed}개 문서가 막혔다. 고치거나 --allow= 로 명시적으로 넘길 것.`);
  process.exit(1);
}
console.log('\n통과. 정적 검사만 한 것이므로 브라우저에서 화면도 확인할 것.');
