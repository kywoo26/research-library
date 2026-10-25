# Drawing the document

The reader is defined in `../SKILL.md`. A reader takes in a structure faster from a picture
than from sentences describing it, so a chapter here is a claim and a board: the heading says
what is true, and the board shows it. The specimens in `specimens/` are the pattern; this file
says how to choose and fill one.

## Choose the board before the sentences

Ask what shape the claim has, then pick:

| The claim is | Board (specimen) |
|---|---|
| the whole document's argument | flow on the cover, as many stages as the argument has (`cover-flow`) |
| a mechanism: a cause passing through parts to an effect | columns of layers, arrows between neighbors (`mechanism-layers`) |
| options or tasks placed along a level, cost or time | a ruler: the level as the axis, cards hung in its columns, spans for what holds across several (`decision-ruler`) |
| steps in order, with a loop | numbered cards in one lane, the returning edge below (`procedure-steps`) |
| one metric across a varying condition | `figure.plot` from a data table; bars of the step sizes beside it when those are the point (`result-plot`) |
| one metric, several systems | `table.plot-data data-kind="bars"` |
| several dimensions per row | a table |
| one instance walked end to end | a `<pre>` trace or diff |
| a list of limits or judgments with no shape | `ul.points` |

A sentence that walks the board card by card is the one to cut.

Rows (`data-lanes`) and columns (`data-cols`) carry meaning: phases, actors, levels. Name a
card's cell (`data-col="high..max" data-lane="1"`); the shell computes the layout, routes the
arrows and reflows the board into one column on a phone. Never write coordinates.

## Write the aria-label first

Every board and `<svg>` carries an `aria-label` written before the cards, as a sentence
saying what happens: which way the arrows run, which card the claim rests on, and where the
loop closes. If the sentence will not come, the board has no claim in it.

## A card

A bold name, one to three short lines, then a gray `.ev` line with the evidence: whose claim,
which section, which run. `card-length` blocks prose poured into a card. A number card names
its subject and unit (`Qux v2, p99 지연 120 → 85ms`), because claims are extracted from the
card's text without the board around it.

Tones mean the same thing in every document: `t-key` the card the chapter argues for (one per board), `t-good` what improves,
`t-warn` a caution, `t-bad` what worsens, `t-person` what a person does, `t-quiet` background.

Arrows (`span.edge`) run forward along the reading order with no card in between, or back as a
return edge. A label on an arrow is the
condition for taking it (`통과`, `걸림`), in a word or two.

A practitioner's reaction to a claim is a `.card.react` right after the card it changes: who
said it, where and when, what they said, and the verdict from checking it against the source
(`holds`, `contra`, `open`). It never stands alone.

## The source's own figures

| The figure is | Do |
|---|---|
| a table, or a bar/line chart whose values are printed | retype it as `table.plot-data`; the shell draws it and the numbers stay selectable |
| the source's architecture or mechanism diagram | embed it; redrawing asserts a shape you did not verify |
| a qualitative sample, a screenshot, a rendered output | embed it; there is nothing to redraw |
| a plot whose claim is one crossing or one gap | redraw that part, and say in a note that the source's plot holds more |

Values come from the chart's `aria-label`, the SVG text or the table, never estimated from bar
length; a value read off coordinates says so in the plot's figcaption. **Embed only a figure you have
opened and read**; `notes/figures.md` holds the descriptions. **Name the source's central
figure somewhere**, because a reader who has seen the source looks for it first.

Mechanics: a `data:` URI inside `.plate`, which keeps a white background under a light-source
figure in dark mode; `alt` says what the figure shows and the figcaption carries the source's own
identifier (`논문 Figure 3`). The file has 1 MB and base64 is a third larger than what it
encodes, so when a figure will not fit, redraw the part that carries the claim and say so.

## Check it

Run `scripts/render.mjs`; it fails on the shell's layout warnings. Look at the pictures as well; a board can pass and still say less
than the chapter claims.

A hand-drawn `<svg>` is for the rare shape no board holds. It needs `role="img"`, the
`aria-label`, theme colors through CSS custom properties, and the same render check.

## Do not

- Invent a step to make a board symmetric. A four-stage mechanism drawn as five cards is a
  fabricated claim with a picture around it, and it passes every gate.
- Draw what the chapter does not claim.
- Point at what only resolves in the source: `식 (10)` sends the reader to the paper. Name the thing.
