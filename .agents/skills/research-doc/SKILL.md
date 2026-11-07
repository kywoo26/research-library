---
name: research-doc
description: Writes a single-file HTML research document in Korean from a corpus pinned by
  research-source. Plans the document against the owner's request and has the plan reviewed
  before writing, then writes the first screen, the chapters, the diagrams and the source's
  own figures, the quoting, and Korean prose that reads like a person explaining. Invoked by
  the researcher agent after research-source, in the same context. In any other session, hand
  the job to the research skill.
---

# Writing a research document

Read before writing:

- `references/prose-ko.md`, always.
- `references/visual.md`, always: choose the form that shows the relationship.
- `references/paper.md`, `references/oss.md` or `references/web.md`, by what the corpus is.
- `references/specimens/`, for the shapes your chapters take.
- `.research/<slug>/notes/analysis.md` and `notes/figures.md`: what you worked out, and what
  the source drew.

## The reader

The reader is the owner who asked for the document. They want to understand the subject well
enough to explain it, judge it and use it: what it is, why it matters, how it works, what is
known about it and what is not. They read Korean and know software, but they did not read
the source. They will not read anything because a rule demanded it.

So the document answers the request in `run.json` (`request` and `asks`), in the owner's
order of interest, at the depth the request asks for. Plain is the goal, and a qualifier a
claim needs survives the plainness. Describe how something was done at the depth the source
gives; a step the source leaves out stays out, and the document says what that means for the
reader.

## 1. Plan, and have the plan reviewed

Before the first chapter, write `.research/<slug>/notes/plan.md`:

- **Message**: one sentence the owner could repeat. It says what the subject is for and what
  the research found, and it would not fit another document on the subject.
- **Chapters**, in reading order. For each chapter: its name, what it explains in one
  sentence, which `asks` it answers, and its main form (prose, a diagram, a table, a source
  figure, a trace).
- **Diagrams**: for each, one line on the structure it shows and its form (`visual.md`). The
  cover gets one figure of the subject's whole structure.
- **What the analysis adds**: what you ran, what you compared it against, what reception you
  found, which interpretations are yours (`notes/analysis.md`).
- **What cannot be answered**: any ask the corpus cannot answer, and where the document says so.

Record the chapter for each ask in `run.json` as `asks[].chapters`, using the chapters'
`data-label` values. `ship.mjs` checks that every ask has a chapter that exists.

Then launch the `plan-review` agent by name, in the foreground, with the plan path and the
run record. It reads the plan in a context that did not write it. Fix what it reports, and
revise the plan when it says `다시 짜야 함`. Write only after it says `진행 가능`, or after a
second review once its findings are fixed. Changing course costs a paragraph now and a
rewrite later.

## 2. The first screen

The first screen decides whether the document gets read. Under the title:

- `p.answer`, at most 280 characters without spaces: what the subject is, in a sentence of its
  own, then the message. Say whose judgment it is. A recommendation from the source carries its
  author (`저자는 …를 권한다`), and a reading this document drew says so in a few words.
- `p.src`: who produced the source (the organization and team, or the author and role), what
  kind of material it is, and the pinned version. A repository slug alone does not say who is
  behind it.
- One figure of the subject's structure, from the plan: the parts and how they relate, drawn
  in SVG or taken from the source when its own figure explains it. The chapter list goes under
  it, one line per chapter with what the reader gets there.

```
✗ X 는 유용하지만 한계도 있어 도입 전 검토가 필요하다.
  (fits any document; the reader learns nothing about X)
✓ X 는 사내 DB 스키마를 업무 용어 사전으로 바꿔, agent 가 SQL 을 쓸 때 그 사전을 근거로 삼게 하는
  NVIDIA 의 오픈소스다. 사전을 만드는 일은 LLM 이 하고 사람은 검토만 하며, 공개된 성과는 사전 생성
  시간 단축 하나라 SQL 정확도에 주는 효과는 아직 알 수 없다.
```

How the document was made has no place on the first screen.

## 3. Chapters

A chapter explains one part of the answer, and the next chapter builds on it. Merge chapters
a reader would read as one; a document of six solid chapters beats eighteen fragments that
repeat each other. A chapter is `<section class="slide" data-role="…" data-label="…">`:

```
h2            what the chapter shows, as one sentence a reader can take away
p.lead        optional: the condition the chapter needs, or how to read it
body          explanatory paragraphs and the visual that carries the structure
ul.notes      optional, one line each: provenance, a value read off a chart, what is missing
details.orig  optional: the source's own words and locators behind the chapter, folded
```

The fold takes no claim the visible part has not already made. `data-role` is free except for
`cover` and `sources`, which are required. Limits go in one place, stated once and tied to
what the reader can do about them, in a short limits chapter or with the claim they change.

Keep the chapter on the explanation. A worked case is welcome when it makes the mechanism
concrete; mark an invented one as an illustration. A failure case belongs where it changes
what the owner would do, and it does not become the spine of the document unless the owner
asked for one.

Name the subject and what it is or does in the title, in a phrase a reader would search for,
and use the same string in `meta.json` `title`, `<title>`, `og:title` and the cover `h1`.
`✗ Bar: 그래프 갈래를 하나 더 두는 컨텍스트 인프라` (a label and a colon) ·
`✓ Bar 의 그래프 경로 검색`.

## 4. Quoting the source and code locators

Attribute source-dependent claims clearly (`prose-ko.md`), and keep the attribution clear
across the passage. Verbatim source text goes in the fold, inside `.q`, `.wl` or `<cite>`,
with its locator. The body names things in Korean. A code locator or identifier appears in
the body only when the reader needs it to find or change something, and a trace shown on
purpose stays visible in `<pre>`.

```html
✓ <p>migration guide 는 between_tools 가 low, medium, high 에서만 받아들여지고 xhigh 나
  max 에서는 400 을 낸다고 설명한다. 그래서 effort 를 high 이하로 둔다.</p>
  <details class="orig"><summary>원문</summary><p>guide 「Turn off up-front
  thinking」: <span class="q">“It's accepted at low, medium, and high effort. At xhigh or
  max, it returns a 400 error.”</span></p></details>
✗ <p>between_tools 는 low, medium, high 에서 받고 xhigh 나 max 에서는 400 을 낸다.</p>
```

Overlaying two tables, or setting the source against other writing to make a comparison the
source never made, is allowed and often the most useful thing in the document. Say where the
comparison starts (`논문에는 이 비교가 없다`), so a reader does not take it for the source's position.

## 5. Producing the file

`new-doc.mjs` stamps the shell from `assets/deck-shell.html`; write chapters into its `<main>`
and leave the shell's CSS and script as they are. Ids are unique across the document.
Production records stay out of the document: retrieval times, hashes, rendering checks and
file counts go to `sources.jsonl`, `run.json` and the PR body. The sources chapter lists the
sources and says briefly what was read and what was left unopened.

Write chapter by chapter from the plan, not in one pass. After each few chapters, render
(`node scripts/render.mjs research/<slug>`) and look at the diagrams as a reader would.

## 6. The read pass

Once `check-doc.mjs` and `check-prose.mjs` pass and the pages render, read the whole document
once from the first screen down, as the owner would. Check it against the plan's message and
the passages in `prose-ko.md`. Fix:

- a sentence you had to read twice;
- a paragraph that repeats a previous one;
- a list that should be a sentence, or a sentence that should be a list;
- a diagram that does not show what its line in the plan says.

## Hand off

Invoke `research-verify` without asking, in this same session.
