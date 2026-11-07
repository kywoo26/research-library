# Drawing the document

A picture earns its place when it shows a structure that sentences would make the reader
assemble in their head: what contains what, what sits on what, what differs on which
attribute, which value moved. Before drawing, ask what structure the subject actually has. A
system has parts and data. A method has a before and an after. An ecosystem has positions.
Draw that. Then write one line in the plan saying what the picture shows, and pick the form.

## Choose the form for the relationship

| The reader needs to see | Form | Specimen |
|---|---|---|
| the parts of a system, what each holds, what refers to what | a structure map in SVG: groups for containment, dashed lines for reference, an arrow for what actually travels | `structure-svg` |
| layers and what each depends on | bands, or a board with lanes | `mechanism-layers` |
| several things on the same attributes | a table, or a matrix with marks | |
| options along a level, cost or time | a ruler with the items hung on it | `decision-ruler` |
| steps in order, with a loop | numbered steps and the returning edge | `procedure-steps` |
| a measured value across a condition | `figure.plot` from a data table | `result-plot` |
| the source's architecture, a screenshot, a sample output | the source's own figure, with a caption on what to look at | |
| one instance walked through code | a `<pre>` trace or diff | `trace-pre` |
| a reason, an interpretation, a condition | sentences | `explanation` |

An arrow means a transition, a dependency or a cause the source supports, never "read next".
Draw a branch with its condition and a loop with its returning edge, and check the exception
path against the source; a tidy row of boxes hides the difference. A row of boxes that repeats
the chapter titles, or a chain of claim sentences joined by arrows, shows nothing. Cut prose
that only repeats the labels, and keep the reason and the interpretation the picture cannot carry.

## The aria-label first

Every picture carries an `aria-label` written before it is drawn: one sentence on what it shows
and which way things move. If the sentence will not come, the picture shows nothing yet. Once
it is drawn, check that everything the sentence says is in the picture.

## SVG and boards

Draw a structure map as inline SVG inside `figure.diagram`. Use the shell's classes so it
follows light and dark themes; the `structure-svg` specimen shows them. Keep text at 12px or
more, put long explanations in the caption, and check the 390px render, where a wide picture
shrinks. A board (`.board`) lays out cards in named cells and the shell draws the arrows. Use
it for steps, rulers and layers; the specimens show the cells and tones.

## The source's own figures

| The figure is | Do |
|---|---|
| a table, or a chart whose values are printed | retype it as `table.plot-data` |
| the source's architecture or mechanism diagram | embed it when it explains; a redraw asserts a shape you did not verify |
| a sample, a screenshot, a rendered output | embed it |
| a plot whose point is one crossing or one gap | redraw that part, and say the original holds more |

Values come from the chart's `aria-label`, its SVG text or its table, never from bar length.
Embed only a figure you opened and read (`notes/figures.md`), as a `data:` URI in `.plate`. The
`alt` says what it shows, and the caption carries the source's identifier (`논문 Figure 3`)
and what to look at. The file limit is 1 MB, so when a figure will not fit, redraw the part
that carries the point.

## Do not

Do not invent a part or a step to make the picture symmetric. A four-stage mechanism drawn as
five boxes is a fabricated claim with a picture around it, and it passes every gate. Do not
point at what only resolves in the source: `식 (10)` sends the reader away. Name the thing.
