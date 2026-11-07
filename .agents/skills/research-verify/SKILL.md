---
name: research-verify
description: Adversarially reviews a finished research document draft. Two lenses read it
  in separate contexts and in parallel (the number and quote checker, and the owner's reader
  who checks the request, the message, the prose and the diagrams), claims are extracted from the
  sentences that shipped, check-claims.mjs verifies them against the pinned corpus, and the
  author fixes and has the changed sentences reread until nothing blocking remains. Invoked by
  the researcher agent after research-doc, or on a fix to an existing document. In any other
  session, hand the job to the research skill.
---

# Adversarial review of a research document

The report is Korean; read `../research-doc/references/prose-ko.md` before writing it.

## Three rules

**Review the draft, not the working notes.** A reversed direction or a dead anchor exists only
once sentences do, so claims are extracted from the draft the reader will read.

**Reviewers start with none of the author's conversation.** A context that wrote a sentence
rereads it by the same route and reaches the same conclusion.

**A finding is something that would change the document the owner gets.** That means one of:
- a claim a reader would come away believing that the source does not support;
- an ask the document does not answer;
- a first screen or a chapter that loses the point;
- prose the owner would read as machine-written or have to read twice;
- a picture that does not show its structure, or a structure left undrawn.

A dropped qualifier is a finding only when it changes what the reader believes. Nice-to-haves and
wording preferences are not findings. A long list of small true objections buries the one that
matters, and every fix risks a new error.

## 1. The target

Open the draft `research/<slug>/index.html`, `.research/<slug>/run.json` (`request` and `asks`)
and `.research/<slug>/sources.jsonl`. A document from before 2026-11-08 has `purpose` in
`meta.json` instead of `asks`. If `sources.jsonl` is missing, the numbers cannot be checked:
run the reader lens and the structural checks, reconstruct from `meta.json` `source.url` if it has
one, and say at the top of the report what was skipped.

## 2. Launch the lenses

Once the draft passes `check-doc.mjs` and `check-prose.mjs`, renders, and you have read it
through, launch `lens-numbers` (B) and `lens-reader` (A) as new agents, together, each with the
values its reference file asks for. `lens-reader` gets the run record and the render directory.
Leave the document and its ledgers as they are until both reports are back; extract claims in the
meantime. Launching them is the step; asking permission is not.

## 3. Extract claims from the shipped sentences

Walk the visible text, cards, notes, captions and table cells of the draft, and write
`.research/<slug>/claims.jsonl`, one claim per line:

```json
{"id":"c1","kind":"numeric","text":"Ours 전체 AC 62.6 으로 baseline 56.3 을 앞선다",
 "verdict":"confirmed","scope":"arXiv:2601.00000v1 표 1 기준","evidence":["e3"]}
```

Extract the following, one sentence per claim:
- numbers and comparisons;
- quotes;
- directions and causes;
- the claims the message rests on;
- calculations the source did not make;
- absence claims;
- behaviour the reader would act on.

Skip background, definitions and navigation. A span already in `evidence.jsonl` goes in by its
`id`. `check-claims.mjs --help` gives the field forms.

## 4. Machine checks

Run `check-claims.mjs` (with `--repo <owner/name>=<path>` for a repository) and `check-doc.mjs`.

## 5. Report

Merge the lens reports and the script output into one Korean report:

```
## 고쳐야 하는 것
- [렌즈B] 장 3: 표 4 의 격차는 좁아지는데 문서는 넓어진다고 썼다. 해석까지 얹혀 있어 문단을 다시 써야 한다.
- [렌즈A] 요청 a3(사용자 평가)을 다루는 장이 없다.

## 판단이 필요한 것
- [렌즈A] 장 5 와 장 6 이 같은 한계를 되풀이한다.

## 검증하지 못한 것
- 행동 주장 5건: 코드만 읽었고 실행하지 않았다.
```

The last section is never empty. A report that lists only findings reads as "everything else
checked out".

## 6. Fix, then reread what changed

Findings are the author's to resolve without asking, including retitling, merging, cutting or
adding a chapter and reopening the corpus. Record each call in `run.json` under `decided` with the
reason. Only two things go under `needs_owner`: a request that reads two ways with different
answers, and something only the owner can supply.

**Fix by cutting or narrowing first.** A wrong or overstated sentence is fixed by removing what the
source does not support, not by stacking qualifiers on it. Add text when an ask is unanswered, and
then give it the weight the owner gave it: rework the chapter or add one, rather than tucking it
into a note or the fold.

After fixing, rerun the machine checks, and have a new `recheck` read what the edits touched. Repeat
until a recheck finds nothing blocking (`meaning: true` or `impact: "understanding"`). Each later
pass touches only the sentences the recheck names, and its recheck reads only those and their
neighbours. Wording items go under `unfixed` without another pass. A run allows five rechecks; what
the fifth still finds goes under `unfixed`, so no change ships that only the author has read.

Record each unfixed item as `{"item", "meaning", "impact"}`:
- `meaning: true` when a reader would come away believing what the source does not support;
- `impact: "understanding"` when the owner cannot follow the explanation or an ask goes unanswered;
- `impact: "wording"` for a phrasing preference.

Record `rendered` (whether you looked at the rendered pages after the fixes) and `unverified` too.
Keep the lens reports in the notes, and give recheck the reader findings for the changed chapters.

## Hand off

When the last recheck is done, go back to `../research/references/researcher.md` to ship.
