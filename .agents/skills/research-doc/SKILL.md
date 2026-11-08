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
- `references/prose-ko.md`;
- `references/visual.md`;
- the reading guide for your corpus (`references/paper.md`, `oss.md` or `web.md`);
- the specimens your chapters will look like;
- your own `notes/analysis.md` and `notes/figures.md`.

## The reader

The reader is the owner who asked for the document. They want to understand the subject well
enough to explain it, judge it and use it. They read Korean and know software, but they did not
read the source, and they will not read anything because a rule demanded it. So the document
answers the request in `run.json` (`request` and `asks`), in the order and at the depth the owner
asked for. Plain is the goal, and a qualifier a claim needs survives the plainness.

## 1. Plan, and have the plan reviewed

Before the first chapter, write `.research/<slug>/notes/plan.md`:
- **Message**: one sentence the owner could repeat. It says what the subject is for and what the
  research found.
- **Chapters**, in reading order. For each: its name, what it explains in one sentence, which
  asks it answers, and its main form.
- **Pictures**: for each, one line on what it shows and its form (`visual.md`).
- **Where the document goes past the source**, as the asks need it: what you ran, compared or
  found in the reception, and which interpretations are yours.
- **What cannot be answered**, and where the document says so.

Record each ask's chapters in `run.json` as `asks[].chapters`, using the chapters' `data-label`.
Several asks can share a chapter; a chapter per ask fragments the document.

Then launch `plan-review` as a new agent with the plan and the run record, and wait for its
report. Fix what it reports, or rework the plan when it says `다시 짜야 함`, and write once it
says `진행 가능`. Changing course costs a paragraph now and a rewrite later.

## 2. The first screen

The first screen decides whether the document gets read. Under the title:
- **`p.answer`**, one short paragraph: what the subject is, then the message.
  Say whose judgment it is. A recommendation from the source carries its author (`저자는 …를 권한다`).
- **`p.src`**: who produced the source (the organization and team, or the author and role), what
  kind of material it is, and the pinned version.
- **The one picture that carries the message**, when the subject has one: a structure map, a
  table, or the source's own figure.
- **The chapter list**, one line per chapter on what the reader gets there.

`prose-ko.md` shows a first screen. How the document was made has no place on it.

## 3. Chapters

A chapter explains one part of the answer, and the next builds on it. Merge chapters a reader
would read as one; six solid chapters beat eighteen fragments that repeat each other. A chapter is
`<section class="slide" data-role="…" data-label="…">` with an `h2`, then the explanation and the
picture that carries its structure, then, optionally, `details.orig` with the source's own words and
locators. The fold takes no claim the visible part has not made. The `h2` says what the chapter
shows, as a sentence or a phrase a reader would recognize.

A condition that changes what a claim means stays beside the claim. Limits of the research as a
whole go in one place, stated once and tied to what the reader can do. A worked case is welcome
when it makes the mechanism concrete; mark an invented one as an illustration. A failure case
belongs where it changes what the owner would do.

The title names the subject and what it is or does, in a phrase a reader would search for.

## 4. Quoting the source and code locators

Attribute source-dependent claims clearly (`prose-ko.md`). Verbatim source text goes in the fold
with its locator, inside `.q`, `.wl` or `<cite>`. The body names things in Korean. A code locator
or identifier appears in the body only when the reader needs it to find or change something.

```html
✓ <p>migration guide 는 between_tools 가 low, medium, high 에서만 받아들여지고 xhigh 나 max 에서는
  400 을 낸다고 설명한다. 그래서 effort 를 high 이하로 둔다.</p>
  <details class="orig"><summary>원문</summary><p>guide 「Turn off up-front thinking」:
  <span class="q">“It's accepted at low, medium, and high effort. At xhigh or max, it returns a 400 error.”</span></p></details>
```

A comparison the source never made, by overlaying tables or setting it against other writing, is
allowed and often the most useful thing in the document. Say where it starts
(`논문에는 이 비교가 없다`), so the reader does not take it for the source's position.

## 5. Producing the file

`new-doc.mjs` stamps the shell; write chapters into its `<main>` and leave its CSS and script
alone. Retrieval times, hashes and rendering checks stay out of the document; they go
in `sources.jsonl`, `run.json` and the PR body. The sources chapter lists the sources and says
briefly what was read and what was left unopened.

Write chapter by chapter from the plan. Render as you go (`node scripts/render.mjs research/<slug>`).
The script fails on layout warnings. Then open the screenshots and read each picture against its
aria-label and its line in the plan.

## 6. The read pass

Once `check-doc.mjs` and `check-prose.mjs` pass and the pages render, read the whole document
once from the first screen down, as the owner would, against the plan's message and the passages
in `prose-ko.md`. Fix:
- a sentence you had to read twice;
- a paragraph that repeats an earlier one;
- a list that should be sentences, or sentences that should be a list;
- a picture that does not show what its line says.

## Hand off

Invoke `research-verify` without asking, in this same session.
