---
name: research-doc
description: Writes a single-file HTML research document in Korean from a corpus pinned
  by research-source. Defines the reader and the three document kinds (comparison,
  explainer, walkthrough), the first screen, the chapter grammar, figures and charts,
  quoting, and Korean prose that reads like a person explaining.
when_to_use: Invoked by the researcher agent after research-source, in the same context. In
  any other session, hand the job to the research skill.
---

# Writing a research document

Read before writing:

- `references/prose-ko.md`, always.
- `references/visual.md`, always: each chapter's board is chosen before its sentences.
- `references/specimens/`, the cover and the chapters whose shapes yours take. They show the
  grammar filled in; their length is an example, and your content sets yours.
- `references/paper.md`, `references/oss.md` or `references/web.md`, by what the corpus is.
- `.research/<slug>/notes/figures.md`, what the source drew or tabulated. Redraw what the
  reader needs.

## The reader, and the three kinds

The reader is a developer, not a general audience and not the audience the source was
written for. They open a document to get the point quickly and to understand the mechanism
well enough to explain it. What the document has to do for them depends on its kind, which
`research-source` chose and `new-doc.mjs` recorded as `purpose` in `meta.json`:

| Kind | The reader leaves able to | Chapters that carry it |
|---|---|---|
| `comparison` | decide adopt, trial, assess or hold, and defend the call | the alternative, what it costs to keep running, the adoption call with its grounds |
| `explainer` | predict the behavior on a case the source never shows | the mechanism at full depth, one case traced through it, where the principle stops holding |
| `walkthrough` | find the code, or the request field, and follow the path to change it | the map of what talks to what, one path traced hop by hop, where a change would land |

The adoption call belongs to the comparison. Comparisons with other systems and outside cases
go in when the request asks for them, gathered in one chapter.

Plain is the goal, and a qualifier the claim needs survives the plainness. Describe how
something was done at the depth the source gives; a step the source leaves out stays out, and
the document says it is unpublished and what that means for the reader.

## The first screen and the length

The first screen decides whether the document gets read. A reader leaves it knowing what the
subject is, what this research tells them, and whose material it rests on. Under the title,
one short paragraph, `p.answer`, at most 280 characters without spaces (`cover-length`):

- what the subject is, in a sentence of its own, so a reader who has never heard of it can
  follow the next one;
- the message: what the research means for the reader's work. Say whose judgment it is. A
  recommendation from the source carries its author ("저자는 …를 권한다"); a reading this
  document drew from the source says so in a few words. A practice the author describes does
  not become advice from the document;
- the one mechanism sentence the message needs, and the one condition that most limits it.

Numbers go on the flow cards unless one number is the message, and side facts such as
popularity or dates stay off the cover.

```
✗ Qux 는 큐 깊이에 따라 worker 를 늘린다. 그래서 짧은 부하에는 늦게 반응하고 긴 부하에는 과하게 늘어난다.
  (description only; the reader never learns what to take from it)
✗ 배포 직후에는 Qux 의 autoscale 을 꺼 두는 편이 낫다.
  (the reader does not know what Qux is yet, and the authors' practice now speaks as the document)
✓ Qux 는 큐 깊이를 보고 worker 수를 정하는 scheduler 다. 저자들은 배포 직후 몇 분은 autoscale 을
  꺼 두라고 권한다. 새 worker 가 캐시를 채우는 동안 큐가 실제보다 길어 보이기 때문이다.
```

Under the paragraph, `p.src` says in a sentence or two who produced the source (the organization
and team, or the author and their role) and what kind of material it is, with the version
pinned. A repository slug alone does not tell the reader who is behind it. How much was read
goes to the `setup` chapter.

Under `p.src`, the cover draws the document's argument as one flow board (`specimens/cover-flow.html`):
as many stages as the argument has, typically from the cause to what the reader decides, each
card linked to the chapter that shows it. Chapters off that path go in the `.toc` list under it,
one line each with the fact the reader would go there for. How the document was made has no place on the first screen: no source-to-chapter
mapping table, no reading method.

Merge chapters a reader would read as one. The order
follows the source or the research where that order carries meaning.

## The spine

`new-doc.mjs` lays out a starting set of middle chapters for the
kind; rename them after their content (`data-label="곡선"`), merge or drop them. `data-role`
names what a chapter does; `cover`, `critique` and `sources` are required.

| Chapter (`data-role`) | Holds |
|---|---|
| `cover` | The title, the answer, the source line, the argument flow and the list of other chapters |
| the kind's middle | `references/paper.md`, `references/oss.md` and `references/web.md` say how each fills |
| `result` | Results, redrawn from the source's own charts and tables (`visual.md` §The source's own figures) |
| `critique` | Limits, with attribution, stated once: what is self-reported, unconfirmed or unread, and what that means for the reader |
| `setup` | Near the end and short: what was read, what was run, what was left unopened |
| `sources` | Sources |

Production records stay out of the document: retrieval times, archive attempts, hashes,
rendering checks and file-count arithmetic go to `sources.jsonl`, `run.json` and the PR body.

**Split a chapter that carries two claims**; neither gets checked while they share one.

## The title

Name the subject and what it is or does, in a phrase a reader would search for, and use the
same string in `meta.json` `title`, `<title>`, `og:title` and the cover `h1`.

- ✓ Bar 의 그래프 경로 검색 / ✓ Sonnet 5.5 로 옮길 때 400 을 받는 요청
- ✗ Bar: 그래프 갈래를 하나 더 두는 컨텍스트 인프라 (a label and a colon)
- ✗ 그래프는 RAG 위에 얹히고, 벤치마크는 저장소에 없다 (a finding; it goes to `summary`)

## The chapter grammar

The shell (`<html data-format="board">`) numbers the chapters and builds the contents. A
chapter is `<section class="slide" data-role="…" data-label="…">`, and inside it, in order:

```
h2            the claim, one sentence (Opus 5.5 의 통과율은 low 에서 medium 으로 갈 때 가장 크게 오른다)
p.lead        at most two sentences: the condition the claim needs, and how to read the body
body          the board visual.md picks; every number the chapter uses is here
ul.notes      optional. One line each: provenance, a value read off coordinates, what is missing
p.so          optional. 그래서: what follows for the reader
details.orig  optional. The source's own words behind the claims, folded
```

The visible part carries the claim and what the reader needs to act on it. **The fold takes no
claim the visible part has not already made.** What each kind keeps visible:

| Kind | Visible |
|---|---|
| walkthrough | the diff or the path, the result codes, what to check with it |
| explainer | the mechanism as a board, one case in numbers, where it stops holding |
| comparison | the call with its condition, the reader's situations on a ruler or in a table, the numbers that move the call, how to back out |

Documents before the board shell use an `.eyebrow`, `.key` and `details.more`; leave them in
that grammar when you fix one.

## Quoting the source

The visible text says in Korean what the source says and names who says it; the source's own
words go in the fold, inside `.q`, `.wl` or `<cite>`. A source sentence reworded into Korean with
nobody named is the source's claim wearing yours, and an English passage in the middle of a
Korean paragraph stops the reader. In a trace the quoted line is the hop itself, so it stays
visible in the `<pre>` with its locator.

```html
✓ <p>migration guide 는 between_tools 가 low, medium, high 에서만 받아들여지고 xhigh 나
  max 에서는 400 을 낸다고 설명한다. 그래서 effort 를 high 이하로 둔다.</p>
  <details class="orig"><summary>원문</summary><p>guide 「Turn off up-front
  thinking」: <span class="q">“It's accepted at low, medium, and high effort. At xhigh or
  max, it returns a 400 error.”</span></p></details>
✗ <p>between_tools 는 low, medium, high 에서 받고 xhigh 나 max 에서는 400 을 낸다.</p>
```

## Calculations the source did not make

Overlaying two tables to build a comparison the source never printed is allowed and often
the most useful thing in the document. Label it in a note (`논문에는 이 비교가 없다`),
so a reader who looks for it in the original does not come up empty.

## Producing the file

`new-doc.mjs` stamps the shell from `assets/deck-shell.html`; write chapters into its `<main>`
and leave the shell's CSS and script as they are. Ids are unique across the document. A
document stamped before an older shell carries its own hand-written `.rail-item` list; there,
add and renumber the items with the chapters, and do not delete them, or the rail goes empty.

## The read pass

Once `check-doc.mjs`, `check-prose.mjs` and `render.mjs` pass, read the
document once from the first screen down, as the reader would, against the passages in
`prose-ko.md`. This read is the one place prose is judged for its own sake.

## Hand off

Invoke `research-verify` without asking, in this same session.
