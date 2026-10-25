# Drawing the document

The reader is defined in `../SKILL.md`. A reader takes in a structure faster from a picture
than from sentences describing it, so a document here is drawn first and written second.

## Choose each chapter's form before its sentences

When a chapter's claim has a shape — parts and how they connect, steps in order, a loop,
options side by side, a quantity that rises or crosses, a decision with branches — the figure
is the chapter's body. The sentences carry only what a figure cannot: the threshold, the
reason, the exception, the source's qualifier. Prose alone is for a claim that is a judgment
or an argument with no shape.

A paragraph that walks a figure node by node is the one to cut; the reader has already
followed the arrows.

A chapter whose claim will not fit in one `.key`, or that scrolls past the fold, usually
needs this move too, along with cutting inferable background.

## Choosing a form

| The claim is | Form |
|---|---|
| steps in order | a step diagram, numbered boxes left to right; the condition for each step on its arrow |
| stages with a returning edge | a cycle, the returning edge on its own row below the forward path |
| parts and how they talk | boxes and arrows, each box a name and one line of what it does |
| one metric, several systems | bars; rank reads at a glance |
| one metric across a varying condition | a line, when the widening gap or the crossing is the claim |
| several dimensions per row | a table |
| one instance walked end to end | a `<pre>` trace; indentation is already a diagram and identifiers stay selectable |
| a decision the reader has to make | a table whose rows are the reader's situations, or a branching diagram |
| the source's own equations | a flow with the condition written on the edge, which predicts behavior better than the predicate |

Define every symbol the figure uses. Never point at what only resolves in the source: `식 (10)`
where the document numbered no equation sends the reader to the paper. Name the thing.

## Write the aria-label first

Write every `<svg>`'s `aria-label` before drawing, as a sentence describing what happens:

```
aria-label="Retry Queue의 4단계 순환. Enqueue에서 작업이 들어오고 Dispatch에서 워커에
배정된다. 성공하면 Ack에서 끝나고, 실패하면 Backoff에서 대기한 뒤 Enqueue로 되돌아가는
화살표가 있다."
```

If the sentence will not come, the figure has no claim in it. Name the returning edge, so a
reader who only hears the label learns that the loop closes. Apply `prose-ko.md` here by hand.

## The figure's text

```html
<figure>
  <p class="fig-title">…</p>   <!-- a claim, the way an h2 is. Not 표 3 -->
  <p class="fig-sub">…</p>     <!-- what this is, and where it came from -->
  <!-- svg, bars, table, or trace -->
  <figcaption>…</figcaption>   <!-- how to read it, and what it does not say -->
</figure>
```

A caption that repeats the title is wasted. One doing its job:

```
표 1(논문). 점선은 Baseline B 다. 문서 1개짜리 질문에서는 B 가 69.8 로 Ours 69.1 보다
높지만 이 차이는 통계적으로 유의하지 않다고 논문이 밝히고 있다.
```

It gives the source pin, the encoding, and the qualifier that stops a reader over-reading the
one unfavorable spot. Verifiers extract claims from captions, so a number that appears only in
a caption still needs its locator.

## Drawing it

```html
<svg class="chart" viewBox="0 0 760 300" role="img" aria-label="…">
  <rect class="box"    x="8"   y="26" width="92"  height="62" rx="8"/>
  <rect class="box-hi" x="278" y="26" width="162" height="62" rx="8"/>
  <text class="txt"   x="20" y="52">문단 x</text>
  <text class="txt-s" x="20" y="70">원본 한 조각</text>
  <path class="arw" d="M100 57 L114 57"/>
  <path class="arw" d="M107 52 L114 57 L107 62"/>   <!-- head as three points -->
</svg>
```

- A box reading only `RunPipeline` adds nothing to the heading. Highlight one node, not three.
- Three-point arrowheads avoid `<defs>` and follow the theme. Set `width:100%; height:auto`
  with a `min-width`, and `overflow-x:auto` on the wrapper.
- Render the page (`scripts/render.mjs`) and look at every figure: labels overlapping, an
  arrow crossing a box, text running out of its box are read as part of the claim.

Bars are CSS: a name, a track, a filled span at a percentage, and the printed number, starting
at zero. In a table, mark the row the chapter argues for, encode direction (`+0.8` and `−2.3`
do not read as opposites at a glance), and keep losing rows visible; a comparison where every
marked cell is a win reads as an advertisement. Route every fill and stroke through the theme
tokens and pair color with position, a sign or a label.

## The source's own figures

| The figure is | Do |
|---|---|
| a table, or a bar/line chart whose values are printed | retype it; the numbers stay selectable and the chart follows the theme |
| the source's architecture or mechanism diagram | embed it; redrawing asserts a shape you did not verify |
| a qualitative sample, a screenshot, a rendered output | embed it; there is nothing to redraw |
| a plot whose claim is one crossing or one gap | redraw that part, and say in the caption that the source's plot holds more |

**Embed only a figure you have opened and read**; `notes/figures.md` from the pinning step
holds the one-sentence descriptions. **Name the source's central figure somewhere**, in the
document or in `setup` with the reason it is absent, because a reader who has seen the source
looks for it first.

Mechanics: a `data:` URI inside `.plate`, which keeps a white background under a light-source
figure in dark mode; `alt` says what the figure shows and the caption carries the source's own
identifier (`논문 Figure 3`). The file has 1 MB and base64 is a third larger than what it
encodes, so when a figure will not fit, redraw the part that carries the claim and say so.

## Do not

- Invent a step to make a diagram symmetric. A four-stage mechanism drawn as five boxes is a
  fabricated claim with a picture around it, and it passes every gate.
- Draw what the chapter does not claim.
