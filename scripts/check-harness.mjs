#!/usr/bin/env node
// 두 harness(Claude Code, Codex)의 연구 체인 정의가 한 원본을 가리키는지 본다. 정적 검사이고,
// 실제로 돈다는 증명은 아니다.
//   node scripts/check-harness.mjs [--words[=<git ref>]] [--versions]
import { existsSync, readFileSync, lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROLES, REVIEWERS, TIER, MODEL, EFFORT } from './lib/roles.mjs';

const HELP = `사용법: node scripts/check-harness.mjs [--words[=<git ref>]] [--versions]

규칙(막는 것):
  skill-link       .claude/skills/<이름> 은 .agents/skills/<이름> 을 가리키는 symlink 다. 복사본이 아니다
  skill-fields     SKILL.md frontmatter 는 Agent Skills 표준 필드(name, description, license, compatibility,
                   metadata, allowed-tools)만 쓴다. name 은 디렉터리 이름과 같고 description 은 1024자 이하다
  roles            두 harness 가 같은 역할(researcher, lens-numbers, lens-reader, recheck)을 정의한다
                   (Codex 의 researcher 는 harness/codex/research.config.toml 의 profile 이다)
  loader           정의마다 본문 파일 하나를 가리키고, 그 파일이 있고, 같은 역할은 두 harness 가 같은 파일을 가리킨다
  loader-only      정의의 본문(Codex 는 developer_instructions)은 "Read <본문 파일> and follow it." 한 문장뿐이다.
                   researcher 는 "(harness=<이름>)" 과, Codex profile 의 "This session is the researcher (harness=codex); agents it starts are not." 만 더한다.
                   역할의 행동은 본문 파일 한 곳에만 쓴다
  role-matcher     Codex profile 의 SubagentStart·SubagentStop matcher 가 scripts/lib/roles.mjs 의 REVIEWERS 와 같다
  role-model       검토 역할의 정의가 쓰는 모델이 scripts/lib/roles.mjs 의 등급(TIER)과 harness 별 모델(MODEL)과 같다
  role-effort      모든 역할의 정의(Codex researcher 는 profile)가 쓰는 effort 가 scripts/lib/roles.mjs 의 harness 별 EFFORT 와 같다
  profile-state    저장소의 Codex profile 에 hook trust 기록([hooks.state])이 없다. 그것은 사용자 CODEX_HOME 의 복사본에만 쌓인다
  description      같은 역할의 description 이 harness 사이에 같다(Codex profile 은 description 이 없다)
  hook-scripts     Claude 정의와 Codex profile 의 hook 명령이 가리키는 스크립트가 있고 --harness 가 맞다
  --words          두 harness 가 실제로 읽는 지침의 단어 수를 센다. =<ref> 를 주면 그 ref 와 비교한다(일회성 확인용)
  --versions       설치된 Claude Code·Codex 버전을 docs/harness-parity.md 가 확인한 버전과 비교한다. 다르면 다시 볼
                   대응표 행을 알린다. 막지는 않는다`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(HELP); process.exit(0); }
const root = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout.trim() || process.cwd();
process.chdir(root);
const SKILLS = ['research', 'research-source', 'research-doc', 'research-verify'];
const STD = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
const errors = [];
const err = (rule, msg) => errors.push(`[${rule}] ${msg}`);
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const fm = (text) => { const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text || ''); return m ? { head: m[1], body: m[2] } : { head: '', body: text || '' }; };
const field = (head, key) => { const m = new RegExp(`^${key}:\\s*([\\s\\S]*?)(?=\\n[A-Za-z_-]+:|$)`, 'm').exec(head); return m ? norm(m[1]) : null; };
const loaderOf = (text) => (/`?(\.agents\/skills\/[^\s`'"]+\.md)`?/.exec(text || '') || [])[1] || null;

// skills
for (const s of SKILLS) {
  const link = join('.claude', 'skills', s);
  try {
    if (!lstatSync(link).isSymbolicLink()) err('skill-link', `${link} 가 symlink 가 아니다`);
    else if (realpathSync(link) !== realpathSync(join('.agents', 'skills', s))) err('skill-link', `${link} → ${readlinkSync(link)} 가 .agents/skills/${s} 가 아니다`);
  } catch { err('skill-link', `${link} 가 없다`); }
  const { head } = fm(read(join('.agents', 'skills', s, 'SKILL.md')));
  if (!head) { err('skill-fields', `.agents/skills/${s}/SKILL.md 가 없거나 frontmatter 가 없다`); continue; }
  for (const k of head.split('\n').map((l) => (/^([A-Za-z_-]+):/.exec(l) || [])[1]).filter(Boolean)) if (!STD.includes(k)) err('skill-fields', `${s}: 표준이 아닌 필드 ${k}`);
  if (field(head, 'name') !== s) err('skill-fields', `${s}: name 이 디렉터리 이름과 다르다`);
  if ((field(head, 'description') || '').length > 1024) err('skill-fields', `${s}: description 이 1024자를 넘는다`);
}

// 정의 읽기
const defs = { claude: {}, codex: {} };
for (const r of ROLES) {
  const c = read(join('.claude', 'agents', `${r}.md`));
  if (c) { const { head, body } = fm(c); defs.claude[r] = { head, desc: field(head, 'description'), loader: loaderOf(body), instr: body, text: c }; }
  const x = read(join('.codex', 'agents', `${r}.toml`));
  const xi = (/^developer_instructions\s*=\s*"((?:[^"\\]|\\.)*)"/m.exec(x || '') || [])[1];
  if (x) defs.codex[r] = { desc: norm((/^description\s*=\s*"((?:[^"\\]|\\.)*)"/m.exec(x) || [])[1]), loader: loaderOf(xi), instr: xi, text: x };
}
const profile = read(join('harness', 'codex', 'research.config.toml'));
const pi = (/^developer_instructions\s*=\s*"((?:[^"\\]|\\.)*)"/m.exec(profile || '') || [])[1];
if (profile) defs.codex.researcher = { desc: null, loader: loaderOf(pi), instr: pi, text: profile };

for (const r of ROLES) {
  for (const h of ['claude', 'codex']) if (!defs[h][r]) err('roles', `${h} 에 ${r} 정의가 없다`);
  const loaders = Object.entries(defs).map(([h, d]) => [h, d[r]?.loader]).filter(([, l]) => l !== undefined);
  for (const [h, l] of loaders) if (!l) err('loader', `${h}/${r}: 본문 파일을 가리키지 않는다`); else if (!existsSync(l)) err('loader', `${h}/${r}: ${l} 가 없다`);
  if (new Set(loaders.map(([, l]) => l).filter(Boolean)).size > 1) err('loader', `${r}: harness 마다 다른 본문을 가리킨다 (${loaders.map(([h, l]) => `${h}=${l}`).join(', ')})`);
  const descs = Object.entries(defs).map(([h, d]) => [h, d[r]?.desc]).filter(([, d]) => d);
  if (new Set(descs.map(([, d]) => d)).size > 1) err('description', `${r}: description 이 harness 사이에 다르다 (${descs.map(([h]) => h).join(', ')})`);
}

// 본문은 loader 한 문장뿐이다
for (const [h, d] of Object.entries(defs)) for (const [r, x] of Object.entries(d)) {
  const t = norm(x.instr).replace(/^This session is the researcher \(harness=codex\); agents it starts are not\.\s*/, '');
  const m = /^Read `?([^\s`]+)`? and follow it(?: \(harness=(claude|codex)\))?\.$/.exec(t);
  if (!m) err('loader-only', `${h}/${r}: 본문이 loader 한 문장이 아니다: "${t.slice(0, 80)}"`);
  else if (m[2] && (r !== 'researcher' || m[2] !== h)) err('loader-only', `${h}/${r}: harness=${m[2]} 가 맞지 않는다`);
}

// Codex profile 의 lens matcher
for (const ev of ['SubagentStart', 'SubagentStop']) {
  const m = new RegExp(`\\[\\[hooks\\.${ev}\\]\\]\\s*\\nmatcher\\s*=\\s*"([^"]*)"`).exec(profile || '');
  if (!m) err('role-matcher', `codex profile: ${ev} 등록이 없다`);
  else if (m[1] !== `^(${REVIEWERS.join('|')})$`) err('role-matcher', `codex profile: ${ev} matcher ${m[1]} 가 REVIEWERS 와 다르다`);
}

for (const [r, tier] of Object.entries(TIER)) {
  const want = { claude: MODEL.claude[tier], codex: MODEL.codex[tier] };
  const got = { claude: field(defs.claude[r]?.head || '', 'model'), codex: (/^model\s*=\s*"([^"]+)"/m.exec(defs.codex[r]?.text || '') || [])[1] };
  for (const h of ['claude', 'codex']) if (got[h] !== want[h]) err('role-model', `${h}/${r}: 모델 ${got[h] || '없음'} 가 등급 ${tier} 의 ${want[h]} 와 다르다`);
}
const codexEffort = (t) => (/^model_reasoning_effort\s*=\s*"([^"]+)"/m.exec(t || '') || [])[1];
for (const r of ROLES) {
  const got = { claude: field(defs.claude[r]?.head || '', 'effort'), codex: codexEffort(r === 'researcher' ? profile : defs.codex[r]?.text) };
  for (const h of ['claude', 'codex']) if (got[h] !== EFFORT[h][r]) err('role-effort', `${h}/${r}: effort ${got[h] || '없음'} 가 ${EFFORT[h][r]} 와 다르다`);
}
if (/^\[hooks\.state\]/m.test(profile || '')) err('profile-state', 'harness/codex/research.config.toml 에 [hooks.state] 가 있다. 지운다(시작 스크립트가 CODEX_HOME 의 복사본에 둔다)');

// Claude 정의와 Codex profile 의 hook 명령
for (const [r, d] of Object.entries(defs.claude)) {
  for (const m of d.text.matchAll(/scripts\/hooks\/([\w-]+\.mjs)"?([^\n]*)/g)) {
    if (!existsSync(join('scripts', 'hooks', m[1]))) err('hook-scripts', `claude/${r}: scripts/hooks/${m[1]} 가 없다`);
    if (m[1] !== 'model-switch.mjs' && !/--harness=claude/.test(m[2])) err('hook-scripts', `claude/${r}: ${m[1]} 에 --harness=claude 가 없다`);
  }
}
for (const m of (profile || '').matchAll(/scripts\/hooks\/([\w-]+\.mjs)([^"\n]*)/g)) {
  if (!existsSync(join('scripts', 'hooks', m[1]))) err('hook-scripts', `codex profile: scripts/hooks/${m[1]} 가 없다`);
  if (!/--harness=codex/.test(m[2])) err('hook-scripts', `codex profile: ${m[1]} 에 --harness=codex 가 없다`);
}

// 단어 수(일회성). harness 마다 실제로 읽는 지침만 센다: skill 과 references 전부, agent 정의의 description 과 본문,
// Codex 정의의 description 과 developer_instructions. hook 등록 같은 설정 줄은 모델이 읽지 않으므로 세지 않는다.
const wordsArg = args.find((a) => a.startsWith('--words'));
if (wordsArg) {
  const ref = wordsArg.includes('=') ? wordsArg.split('=')[1] : null;
  const ls = (at, p) => (at ? spawnSync('git', ['ls-tree', '-r', '--name-only', at, p], { encoding: 'utf8' }).stdout : spawnSync('git', ['ls-files', '-co', '--exclude-standard', p], { encoding: 'utf8' }).stdout).split('\n').filter(Boolean);
  const cat = (at, f) => (at ? spawnSync('git', ['show', `${at}:${f}`], { encoding: 'utf8' }).stdout : read(f) || '');
  const wc = (t) => t.split(/\s+/).filter(Boolean).length;
  const skills = (at) => [...ls(at, '.agents/skills'), ...ls(at, '.claude/skills')].filter((f) => f.endsWith('.md') && !/AUTHORING\.md$|evals\/|specimens\//.test(f));
  const mdDef = (t) => { const { head, body } = fm(t); return wc(field(head, 'description') || '') + wc(body); };
  const tomlDef = (t) => [/^description\s*=\s*"((?:[^"\\]|\\.)*)"/m, /^developer_instructions\s*=\s*"((?:[^"\\]|\\.)*)"/m].reduce((n, re) => n + wc((re.exec(t) || [])[1] || ''), 0);
  const per = (at) => {
    const shared = skills(at).reduce((n, f) => n + wc(cat(at, f)), 0);
    return {
      claude: shared + ls(at, '.claude/agents').filter((f) => f.endsWith('.md')).reduce((n, f) => n + mdDef(cat(at, f)), 0),
      codex: shared + [...ls(at, '.codex/agents'), ...ls(at, 'harness/codex')].filter((f) => f.endsWith('.toml')).reduce((n, f) => n + tomlDef(cat(at, f)), 0),
    };
  };
  const now = per(null), base = ref ? per(ref) : null;
  for (const h of Object.keys(now)) console.log(`${h} 가 읽는 지침: ${now[h]}${base ? ` (${ref}: ${base[h]}, 차이 ${now[h] - base[h]})` : ''}`);
}

// 버전(일회성 알림). docs/harness-parity.md 의 ```json verified 블록이 확인한 버전이다.
if (args.includes('--versions')) {
  const doc = read(join('docs', 'harness-parity.md')) || '';
  let verified = {};
  try { verified = JSON.parse((/```json verified\n([\s\S]*?)```/.exec(doc) || [])[1] || '{}'); } catch {}
  const installed = (cmd) => ((spawnSync(cmd, ['--version'], { encoding: 'utf8' }).stdout || '').match(/\d+\.\d+\.\d+/) || [null])[0];
  for (const [h, cmd] of [['claude-code', 'claude'], ['codex', 'codex']]) {
    const v = verified[h] || {}, now = installed(cmd);
    if (!now) console.log(`${h}: 설치된 버전을 읽지 못했다`);
    else if (now === v.version) console.log(`${h}: ${now} (확인한 버전과 같다)`);
    else console.log(`${h}: 설치 ${now}, 확인한 버전 ${v.version || '없음'}. docs/harness-parity.md 에서 다시 볼 행: ${(v.recheck || []).join(', ') || '전부'}`);
  }
}

if (errors.length) { console.error(errors.join('\n')); console.error(`\n${errors.length}개 위반`); process.exit(1); }
console.log('harness 정의 일치');
