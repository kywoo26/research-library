# Drawing the document

A diagram earns its place when it shows a structure that sentences would make the reader
assemble in their head: what contains what, what sits on what, what is compared on which
axis, which value moved. Write its one line in the plan first: what it shows. Then pick the
form for that relationship. A box with an arrow to the next box is one form among several,
and the right one only when the relationship is a sequence or a cause.

## Choose the form for the relationship

| The reader needs to see | Form | Specimen |
|---|---|---|
| the parts of a system, what each holds, what refers to what | a structure map in SVG: groups for containment, dashed lines for reference, an arrow only for what actually travels | `structure-svg` |
| layers, where each part sits and what each layer depends on | layers drawn as bands, or a board with lanes | `mechanism-layers` |
| several things on the same attributes | a table, or a matrix with marks | |
| options or tasks along a level, cost or time | a ruler: the level as the axis, items hung on it | `decision-ruler` |
| steps in order, with a loop | numbered steps in one lane and the returning edge | `procedure-steps` |
| a measured value across a condition, or several systems on one metric | `figure.plot` from a data table | `result-plot` |
| the source's own architecture, a screenshot, a sample output | the source's figure itself, with a caption on what to look at | |
| one instance walked end to end in code | a `<pre>` trace or diff | `trace-pre` |
| a reason, an interpretation, a condition | sentences: `<div class="explanation">` | `explanation` |

Before drawing, ask what structure the subject actually has. A system usually has parts and
data. A method usually has a before and an after. A market or ecosystem has positions. Draw
that. A row of boxes that repeats the chapter titles, or a chain of claim sentences joined by
arrows, shows nothing the table of contents does not.

An arrow means a transition, a dependency or a cause the source supports, never "read next".
Draw a branch with its condition and a loop with a returning edge. Check the normal and the
exception path against the source; a tidy row of boxes can hide their difference. Cut prose
that only repeats the labels, and keep the reason, the worked case and the interpretation the
picture does not carry.

## Write the aria-label first

Every diagram carries an `aria-label`, written before you draw: a sentence saying what the
picture shows, which part the chapter rests on, which way things move. If the sentence will
not come, the diagram has no claim in it. Then check that the drawing contains everything the
sentence says.

## Drawing in SVG

A structure map is an inline `<svg role="img" aria-label="…">` inside `figure.diagram`. Use
the shell's classes so it follows light and dark themes: `.d-box` (add a tone such as `t-key`
for the part the chapter is about), `.d-group` for containment, `.d-label` and `.d-sub` for
text, `.d-line` with `.d-dash` for references, and a marker for arrowheads. Keep text at 12px
or more and labels short; a label that needs a sentence belongs in the caption. Set a
`viewBox` and let the width follow the page, then check the 390px render, because a wide
picture shrinks there.

## Boards

A board (`.board`) lays out cards in named cells (`data-col`, `data-lane`) and the shell draws
the arrows. It suits steps, rulers and layers. A card is a bold name, one to three short lines
and a gray `.ev` line with whose claim it is. Tones mean the same everywhere: `t-key` the card
the chapter argues for (one per board), `t-good` what improves, `t-warn` a caution, `t-bad`
what worsens, `t-person` what a person does, `t-quiet` background. A practitioner's reaction
to a claim is a `.card.react` right after the card it changes, with who said it, where, and
the verdict from checking it against the source (`holds`, `contra`, `open`).

## The source's own figures

| The figure is | Do |
|---|---|
| a table, or a chart whose values are printed | retype it as `table.plot-data`; the shell draws it and the numbers stay selectable |
| the source's architecture or mechanism diagram | embed it when it explains; redrawing asserts a shape you did not verify |
| a sample, a screenshot, a rendered output | embed it |
| a plot whose point is one crossing or one gap | redraw that part, and say the source's plot holds more |

Values come from the chart's `aria-label`, the SVG text or the table, never from bar length.
Embed only a figure you opened and read (`notes/figures.md`). Put it in `.plate` as a `data:`
URI, which keeps a white background under a light figure in dark mode; `alt` says what it
shows, and the caption carries the source's identifier (`논문 Figure 3`) and what to look at.
The file has 1 MB, so when a figure will not fit, redraw the part that carries the point.

## Check it

Run `node scripts/render.mjs research/<slug>`, which fails on the shell's layout warnings.
Then open the screenshots and read each diagram against its aria-label and its line in the
plan. A diagram can pass every gate and still say less than the chapter claims.

## Do not

- Invent a part or a step to make the picture symmetric. A four-stage mechanism drawn as five
  boxes is a fabricated claim with a picture around it, and it passes every gate.
- Draw what the chapter does not claim.
- Point at what only resolves in the source: `식 (10)` sends the reader away. Name the thing.
