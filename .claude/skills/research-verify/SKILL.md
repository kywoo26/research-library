---
name: research-verify
description: Adversarially reviews a finished research document draft. Two lenses read
  it in separate contexts and in parallel (the number and quote checker, and a reader who
  tests whether the document answers its question), claims are extracted from the
  sentences that shipped, check-claims.mjs verifies them against the pinned corpus, and
  check-doc.mjs carries the structural checks.
when_to_use: Invoked by the researcher agent after research-doc, or on a fix to an existing
  document. In any other session, hand the job to the research skill.
---

# Adversarial review of a research document

The report is Korean. Read
`../research-doc/references/prose-ko.md` before writing it.

## Three rules that shape everything below

**Review the draft, not the working notes.** A reversed direction, a misread unit and a
dead anchor exist only once sentences do, so `claims.jsonl` is extracted from the draft
and the verifier reads the text the reader will.

**Run the lenses as separate subagents that cannot see the author's context.** A context
that wrote a sentence re-reads it by the same route and reaches the same conclusion. B and
A run in parallel, blind to each other and to the author.

**A finding makes a claim in the document wrong, stops the reader from doing what its
`purpose` promises, or, for the reader lens, costs the reader the point: a title, `h2` or `.lead`
that misleads a scanning reader, or material the reader could skip.** Things that would be nice to add, sources that could also be read,
and wording you would have chosen differently are not findings: one line each under 메모,
or leave them out.

## Where this runs

A document edited by hand or reviewed after the fact goes through the same steps; one never
verified looks exactly like one that passed.

## Procedure

### 1. Establish the target

Open the draft `research/<slug>/index.html`, its `meta.json`, whose `purpose` says what the
document was meant to do, and `.research/<slug>/sources.jsonl`, which may be absent.

`sources.jsonl` fixes what the numbers are checked against: `repo` + `commit` for code,
`arxiv_id` + `version` for papers, and no local paths. `../research-source/SKILL.md` owns
that rule, and here a path that leaked in is a finding.

**If `sources.jsonl` is missing, run a reduced review instead of stopping.**

- `check-doc.mjs` runs unchanged, since it needs only the document.
- Lens A (reader) runs. That the sources exist only inside the document is itself worth
  reporting.
- Lens B (numbers) cannot run, because there is nothing to check against. If `meta.json` has
  `source.url`, reconstruct from it and say so; otherwise state plainly that numbers were not
  verified.
- `check-claims.mjs` cannot run either, so state that too.

Say what was skipped at the top of the report, before the findings.

### 2. Launch the lenses

Launch `lens-numbers` (B) and `lens-reader` (A) by name in the same message, in the
foreground (`run_in_background: false`) so both reports come back to you, each with the
values its agent definition asks for; give `lens-reader` the question and the angle the
request named, when it named them.
Spawning them is the step; asking permission for it is not. If they cannot be spawned, run
what you can and declare the gap at the top of the report, as a missing `sources.jsonl` is
declared.

Structure (headings, the chapter grammar, references, the title copies) is `check-doc.mjs`'s job.

### 3. Extract claims from the shipped sentences, while the lenses run

Walk the visible text of `research/<slug>/index.html`, skipping CSS and JS, and write
`.research/<slug>/claims.jsonl`. Include cards and their `.ev` lines, notes, figcaptions and table cells, where qualifiers like
"the paper does not make this comparison" live. One claim per line:

```json
{"id":"c1","kind":"numeric","text":"Ours 전체 AC 62.6 으로 baseline 56.3 을 앞선다",
 "verdict":"confirmed","scope":"arXiv:2601.00000v1 표 1 기준",
 "evidence":[{"source":"p1","locator":"Table 1",
              "quote":"Ours 69.1 54.8 47.5 62.6 / Baseline 66.0 51.2 44.8 56.3"}]}
```

`check-claims.mjs --help` gives the forms of `locator`, `quote`, `verdict` and `kind`.
`locator` follows the source's own notation, in Latin as printed (`Table 1`, not `표 1`;
`path:line` in a repository); `scope` beside it is prose and stays Korean. `quote` is the
sentence or table row that carries the claim; a paragraph pins nothing.

**Extract numbers, comparisons, causal claims, anything the reader's task rests on,
calculations the source did not make, absence claims and conditional behavior claims.** Skip
background, term definitions, navigation text and common knowledge. Drop a sentence too
ambiguous to pin down, and leave each one whole; one sentence per claim is where a
verifier's confidence peaks.

### 4. Machine checks

Run `check-claims.mjs` (with `--repo <owner/name>=<path>` for a repository) and
`check-doc.mjs`. `check-claims.mjs` confirms each quote appears at its locator in the pinned commit, which is
stricter than confirming the file exists and the line is in range. Both scripts are pass or
fail, and `--help` lists their rules.

### 5. Report

Merge the lens reports and the script output into one Korean report:

```
## 고쳐야 하는 것
- [렌즈B] 장 11: 표 4 격차가 6.2/5.1/3.4 로 좁아지는데 문서는 넓어진다고 썼다.
  해석까지 얹혀 있어 문단 전체를 다시 써야 한다.
- [check-claims] c14: quote 가 validators.py 안에 있으나 200행 ±15 밖이다.

## 판단이 필요한 것
- [렌즈A] 도입 판단 장에 라이선스가 없다. 실물은 AGPLv3 인데 문서가 언급하지 않는다.

## 검증하지 못한 것
- 부재 주장 3건 중 재실행 검색 명령이 있는 것 1건.
- 행동 주장 5건: 코드만 읽었고 실행하지 않았다.
- callee 를 열지 않은 채 쓴 주장 2건.
- references/ 12개 파일 미확인 (setup 장).
```

The last section is never empty. It always carries the first three counts (or 해당 없음),
because a report listing only findings reads as "everything else
checked out". Leave out what passed and give a count if the scale matters.

One finding, three ways:

> ✗ 이제 수치 검증 결과를 살펴보겠습니다. 흥미롭게도, 여러 수치들 중에서 일부에 대한
> 확인이 이루어진 결과, 표 4 와 관련된 부분에 있어서 문제가 발견되어졌다고 말할 수
> 있을 것 같습니다.
>
> ✗ 표 4 틀림.
>
> ✓ 수치 42개를 원문과 대조해 1건이 어긋난다. 장 11 에서 표 4 의 격차가 6.2/5.1/3.4 로
> 좁아지는데 문서는 넓어진다고 썼다. 거기에 "작은 모델이 구조에서 더 이득을 본다"는
> 해석까지 얹혀 있어서 방향을 고치면 그 문단 전체를 다시 써야 한다.

### 6. Fix, then re-verify what changed

Findings go back to the author, who fixes them, and the changed chapters, not the document,
go through the lenses again.

**Must-fix items are the author's to resolve without asking.** A wrong number, a flipped
direction, a truncated quote and a dead cross-reference each have one correct answer.

**Needs-judgment items are the author's too.** The owner handed over the whole job, so
retitling, cutting, merging or adding a chapter and reopening the corpus are yours to decide:
make the call, and record it in `run.json` under `decided` with the reason, where the owner
reviews it in the pull request. A fix that needs a chapter that is not there gets the chapter,
because a line with no chapter behind it is what the next round finds. Only two things go under
`needs_owner`: a request that reads two ways with different answers, and something only the
owner can supply.

Re-run the machine checks after fixing, and have the `recheck` agent re-read the chapters the
edits touched. Stop when a round turns up no new must-fix item; two rounds at most. After the
last round's fixes `recheck` reads the touched chapters once more, and what it finds goes under
`unfixed` rather than into another edit, so no change ships that only the author has read.
Record each as `{"item", "meaning"}`: `meaning: true` when the sentence says what the source does
not, which keeps the pull request a draft; `false` for wording, recorded and left alone, because
each pass rewrites the document toward the gate and away from the reader. Record in `run.json` `rendered` (whether you looked
at the rendered page after the fixes), `unverified` and `unfixed`.

**A fact lens A reports missing goes into the chapter whose claim it supports**, as a
card, a note or in the fold; that is support, not a second claim. When no chapter's claim
covers it, it needs a chapter, and that is a needs-judgment item rather than a line squeezed
into the nearest one. What lens A reports the reader could skip is the author's to cut or fold
when it is a paragraph, a caveat or process talk, unless a claim in `claims.jsonl` rests on
it; cutting a whole chapter is a needs-judgment item.

**A caveat moved out of the body keeps its claim honest.** When a fix moves a condition to the
limits chapter, the claim's `scope` in `claims.jsonl` still carries it, and the sentence
left in the body is one the source supports without it.
