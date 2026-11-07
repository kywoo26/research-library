# Reading a paper for the document

A paper pulls the document back toward its own section order. Take from it what the asks need
and let the order go. Derivations the reader will not reuse go in the fold.

## Numbers

Read every number from the tables, not from the text or a summary: papers restate their
numbers loosely in prose, and the table is what got reviewed. Take table values from the
LaTeX source (`../../research-source/SKILL.md` §6), and cite `arxiv_id` with `version`,
because a revision changes numbers.

## Ablations

The ablation is usually where the paper's claim gets tested, and summaries drop it. Read it,
and use it beside the mechanism claim it tests. Check that it varied one thing: a traversal
ablation that also cut the budget cannot answer a budget objection, because two things moved.

## Limits

Separate what the paper admits from what you assert. Without a marker such as `논문이 이 점을
명시한다`, the reader cannot tell who is accountable for a reservation. Papers rarely volunteer
these, so look for them:
- conditions not controlled across a comparison;
- unreported cost;
- a benchmark the authors built;
- whether anyone outside the group has reproduced the result.

When a study reports a contrary result, find it and weigh it on its evidence and conditions.

## Series

When a second paper extends the first, write a separate document only if the two are different
in kind, such as a methods paper and a systems paper. Connect them with the same `series` in
`meta.json`, a line in each `p.src`, and `../<slug>/#p<N>` links. When the later paper settles
something the earlier document left open, link from that spot, or readers keep the stale
conclusion.
