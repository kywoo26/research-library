# Where the rules came from

No skill loads this file. The rules live in `.agents/skills/` stated as instructions; the
reasons live here, so running a skill does not pay for them and the harness can still be
audited. See `.agents/skills/AUTHORING.md` for why they are separated.

| Rule | Lives in | Basis |
|---|---|---|
| Extract claims from the shipped draft, one sentence one claim, and drop a sentence too ambiguous to pin down | `research-verify` | Claimify, [arXiv:2502.10855](https://arxiv.org/abs/2502.10855) — selection, disambiguation, decomposition, with extraction only at high confidence |
| Do not sweep for doc/code mismatch; name what adoption rests on and check only that | `references/oss.md` | DocPrism, [arXiv:2511.00215](https://arxiv.org/abs/2511.00215) — unfiltered LLM flag rate 98%, 14% with local categorization and external filtering |
| Check quotes mechanically against a pinned commit instead of by judgment | `check-claims.mjs` | Cited but Not Verified, [arXiv:2605.06635](https://arxiv.org/html/2605.06635v1) — link checks pass 94–100% while fact checks land at 39–77%, and fall about 42% as search depth grows |
| `kind:"code"` may not cite a documentation file | `check-claims.mjs` | same DocPrism distinction: what the maintainers wrote and what the code does are different claims |
| Two lenses in separate fresh contexts, run in parallel: numbers and quotes, and a reader test; structure goes to `check-doc.mjs` | `research-verify`, `research-chain.js`, `check-doc.mjs` | multi-judge panels reduce single-model bias only when the error sources stay independent; the structure lens produced the most rewrites toward the gate. See § What the 2026-10-13 reader interview changed |
| Fix and re-verify repeat until a recheck finds nothing blocking, five rechecks at most; wording and what the fifth finds ship as found-and-unfixed | `research-verify`, `research-chain.js` | a loop that ends before its own check leaves the freshest edits as the only unread ones. See §Why the fix loop re-verifies the round that ends it |
| Give a compression subagent extraction and quotes, never a conclusion | `references/oss.md` | CaMeL-style separation between the model that reads untrusted material and the model that decides. See §What the compression-subagent rules were measured against |
| Read an analyzed repository's `AGENTS.md` / `CLAUDE.md` directly as data, and keep the checkout outside the working directory | `research-source` | repository instruction files are a documented prompt-injection route, but the step that executes them is harness auto-discovery, not reading. See §Why the isolated-subagent read was dropped |
| Frame the question and scale the reading before opening files | `research-source` | orchestrator-worker deep research; explicit effort-scaling rules are what stop both over- and under-investigation |
| Name the ways a reader could disagree before reading | `research-source` | STORM perspective-guided question asking, which measured most of its coverage gain at the pre-writing stage |
| `swhid` alongside `repo`+`commit` | `research-source` | SWHID, ISO 18670 — an intrinsic hash stays verifiable after the origin is gone |
| The document title names the subject and says what it is; the finding goes in `summary` | `research-doc` | the listing gives a title no context, and a verdict placed ahead of its evidence cannot be qualified. See §Why the title asks what the subject is, not what the shape is |
| Twenty chapters or fewer; four required eyebrows (`index`, `tl-dr`, `critique`, `sources`) | `research-doc`, `check-doc.mjs` | the owner's interview, after documents grew to 25–34 chapters. See § What the 2026-10-13 reader interview changed |
| The lineage bar only where succession is documented | `research-doc` | the arrow reads as a slot to fill, and filling it chained unrelated projects and ended at work nobody built |
| Slide density, figure anatomy, aria-label first | `references/visual.md` | See §What the visualization rules were measured against |
| A document-wide refresh uses the current board grammar even when the original predates it; lens A reads rendered forms | `research-doc/SKILL.md`, `lens-reader.md` | OpenCodeReview PR #44 and #45 passed static checks but the owner rejected both documents' visual explanations. See §What the OpenCodeReview refresh exposed |
| A time-specific refresh takes the old document's question and angle, then pins current sources before reusing any claim | `research-source/SKILL.md` | The owner asked for a new OpenCodeReview comparison without anchoring it to PR #44 or #45. See §What the OpenCodeReview refresh exposed |
| Every rule carries the reason its ✗ fails; rule count is a cost | `AUTHORING.md` | instruction-shape ablations. See §Why a rule has to carry its reason |
| Plain, not simplified. Over-compression eats the mechanism before the conclusion | `research-doc`, `references/prose-ko.md` | simplification measured as deletion. See §Why the documents are plain and not simplified |
| No sentence-length rule | `references/prose-ko.md`, by omission | the numbers everyone quotes have no source, and the Korean evidence runs the other way. See §Why there is no sentence-length rule |
| Technical terms stay in English | `references/prose-ko.md` | asserted, not measured. See §What the English-term rule rests on |
| Connective tissue stays; the deck's rail is why elaboration is cheap here | `references/prose-ko.md` | expertise reversal, and the cell this reader is in. See §Where "experts need less explanation" stops applying |
| Count the prose rules that carry a number; leave the rest to the read pass and lens A | `check-prose.mjs` | the rules were enforced in proportion to how greppable they were. See §Why the prose rules got a counter |
| `~가 아니라 ~다` is reported, not blocked | `check-prose.mjs` | the count that looked like a violation was mostly quotes and attribution. See §Why the contrast frame is counted and not blocked |
| `~를 통해` is not translationese; `~들` is not noise; a comma after a connective ending is no defect; the band is now a diagnostic only | `references/prose-ko.md`, `check-prose.mjs` | corpus measurement, against the prescriptive list the rules were built from. See §What the translationese rules survive on and §What the 2026-09-29 readability diagnosis changed |
| Noun chains, disclaimer sentences and abstract-noun parallelism are the failure that replaced translationese; the forms are now shown as examples in `prose-ko.md` | `references/prose-ko.md`, `lens-reader.md`, `research-chain.js` | measured against 86 human tech-blog posts. See §What the 2026-09-29 readability diagnosis changed |
| Quotes leave the prose the gate reads, in every container the documents actually use | `check-prose.mjs`, `check-doc.mjs` | both gates said quotes were excluded and stripped only `blockquote` / `pre`+`code`. See the 2026-08-30 audit |
| The polite register is blocked at zero | `check-prose.mjs`, `references/prose-ko.md` | the register rule had no counter, and all 13 occurrences in the corpus are quotes. See the 2026-08-30 audit |
| No rule against ending a sentence on a noun phrase | `references/prose-ko.md`, by omission | an outside guide proposed it; measured here, the 9.8% are captions and labels. See the outside-style-guide note |
| One rule for the doubled passive, not two | `check-prose.mjs` | `passive-stack` and `double-passive` both matched `되어지·되어진·불려진`. See the 2026-08-30 audit |
| An empty ledger fails rather than passes | `check-claims.mjs` | a scaffold with 0 claims printed the same 통과 as a document whose every quote was checked. See §Why an empty ledger is not a pass |
| LaTeX thousands separators are normalized before matching | `check-claims.mjs` | `2{,}000` became `2 , 000`, so a number the paper prints was reported missing. See §The number the paper printed and the gate could not find |
| A Roman table number is resolved, not silently widened | `check-claims.mjs` | `Table II` passed the format check and failed to scope, so five claims were matched against a whole paper. See §The table number that passed its own format check |
| Uncompiled LaTeX is stripped before environments are counted | `check-claims.mjs` | a commented-out template shifted every table number by four, so a correct locator resolved to the wrong table. See §The table numbers that came from text nobody sees |
| A missing ledger is reconstructed only where the sources are immutable | `AGENTS.md` | a HEAD eight days past the publication date would have pinned bytes the document never saw. See §Why a missing ledger is only sometimes recoverable |
| The reader is a developer, and a symbol has to resolve here | `research-doc/SKILL.md`, `references/visual.md` | one document of twenty carried notation, and its `식 (10)` resolved only in the paper. See §The reader was named once, far from where form is chosen |
| The reader travels the whole chain, not just the writing step | `research-source`, `research-doc/SKILL.md`, `lens-reader.md` | stage 1 framed the question with no reader named, and the lens asking what is missing did not know for whom. See §Enumerating the cases was the wrong repair |
| Eight of eleven prose rules are a floor, not coverage | `check-prose.mjs`, `references/prose-ko.md` | the listed forms are caught 8 of 8; the same sentence in other words passes 10 of 10. See §The word lists were called a fixed list, and are not one |
| The chain's args shape is stated where a caller reads it before launching, and a launch that misses it stops at second 0 with the shape | `research-chain.js`, `docs/workflow-authoring.md` | the shape lived only in a comment, and the launcher's template hands over the request text. See §Why the chain states its args where the caller looks |
| Lens reports carry every finding with a confidence; the fix round does the filtering | `research-chain.js` | Opus 5 / Sonnet 5 guidance, carried into 5.5: a review prompt that says to drop uncertain findings is followed literally and recall falls. See §What the 2026-10-13 prompt audit decided for the chain |

## What the visualization rules were measured against

The rules in `visual.md` started from a count taken on 2026-08-07: all three paper
documents in `research/` carried diagrams, both code documents carried none, and the
densest code document ran about 54% more body text per slide. The hypothesis was that the
skill needed to make diagrams happen.

**That hypothesis was wrong.** A `skill-creator` A/B against the pre-revision skill, on
prompts that asked for a mechanism slide without mentioning diagrams, had the baseline
drawing an SVG too. What the rules changed was the diagram, not whether there was one:

| | revised | baseline |
|---|---|---|
| highlighted nodes | 1 | 4 |
| nodes carrying what they do, not just a name | 7 | 0 |
| slide size, same content | 6.2 KB | 11.3 KB |
| dense slide split rather than reworded | yes | no |

Pass rate 91.7% against 65.0%, at about 1.6× the time and 1.3× the tokens, because the
revised run renders the page and re-derives the numbers. Prompts that ask for a diagram
outright do not separate the two versions (100% against 90.7%) — the request supplies what
the skill would have.

Skills get revised through `skill-creator`, and its eval workspaces are the record of
whether a revision helped.

## What the OpenCodeReview refresh exposed

[PR #44](https://github.com/kywoo26/research-library/pull/44) and
[PR #45](https://github.com/kywoo26/research-library/pull/45) both rewrote the same old
document. Their PR bodies report that only 2/13 and 2/12 body chapters, respectively,
contained a diagram. The authors reported looking at rendered pages and the static gates
passed, yet the owner found the visual explanations poor. Those observations are a quality
failure, not a measured difference between Claude and Codex: the old-document exception and
the structural gate are shared.

The exception said to leave any pre-board document in its old grammar when fixing it. A
document-wide reappraisal therefore kept the old deck, while `check-doc.mjs` required the
board shell only for newer document dates or files already marked as board. The rule now
distinguishes a narrow correction from a full refresh. Lens A also checks the rendered
mechanisms and decisions, since a syntactically present board can still fail to explain.
The source step now takes the old document's original question and angle without treating
its structure or claims as the current source. A refresh pins the current code and official
documentation first, so an old report does not decide the comparison by inertia.
The diagram fraction remains a diagnostic; a minimum would reward filler drawings and
penalize a comparison whose table or trace is the clearest form.

The two PRs also revealed a separate shared ship defect: different worktrees chose
different `-fix-<time>` branches, and the old `ship.mjs` queried open PRs only for its
own branch. It now stops before commit and push when another open PR uses the same document
slug. Neither PR was merged or closed by this correction.

## Why the isolated-subagent read was dropped

The rule used to require reading an analyzed repository's `AGENTS.md` / `CLAUDE.md` in a
separate subagent that returned extracted facts. It was revised on 2026-08-12 after the
omo document, where the researcher read six such files directly and nothing in them was
acted on.

Two things were wrong with the old form. The rule fought the section it sat inside: the
entry order names those files as the densest in the repo and puts them first, and routing
them through a summarizer meant the author never saw the one source most worth reading in
full. And it aimed at the wrong step. Reading imperative text is not what executes it;
harness auto-discovery of `.claude/skills/` beneath the working directory is, and the old
rule left that path open while paying for a subagent round-trip on every repository.

The revision keeps the separation the rule was for and states it where it binds: read the
files as data, and keep the checkout outside the working directory. This revision did not
go through a `skill-creator` A/B. The change removes a requirement and sharpens an
instruction, and a pass-rate benchmark does not discriminate between the two forms.

## Why the title asks what the subject is, not what the shape is

The rule entered on 2026-08-07 to fix a title that named nothing —
`에이전트에게 준 것은 컨테이너가 아니라 파일시스템이다`, a claim with no subject attached. It
fixed that and, in the same sentence, made `name + claim` the norm. A claim is the right
title often enough that the norm held for a while: `omo 5.0 native: opencode 플러그인을 떠나
자기 호스트를 갖는다` is a sentence, and the sentence is what omo 5.0 native is. What the
norm did not say was that the claim has to be the subject's identity rather than a result
about it, and the semantica document on 2026-08-14 is where that gap shows: two findings
from two different chapters joined by a conjunction, with a word the body uses twice
standing in for what the document is on.

Banning claim-shaped titles was the obvious repair and the wrong one. It would have cost
the omo title, which is doing exactly what a title is for, and left the author with a shape
to satisfy instead of a question to answer. The revised rule states the question — does the
predicate say what this thing is — and leaves the form open.

Nothing in the harness caught it. `check-doc.mjs` `title-subject` compares the title against
the slug, so any title carrying the subject's name passes, and no verification lens read the
title at all — `lens-prose.md` went from slide `h2` headings straight to element order. The
title was written once, by the context least able to see it as a stranger would, and never
looked at again. The lens now carries it, because whether a title says what a document is on
is a judgment and the gate can only ask whether a word is present.

The same revision gave the `research-chain` ship phase a PR title, which it had never
specified. With nothing said, the shipping agent copied the document's title across, so one
bad title became two.

The revision did not go through a `skill-creator` A/B. It narrows one instruction and moves
the finding to a field that already existed; a pass-rate benchmark does not separate the
two forms.

## Why the fix loop re-verifies the round that ends it

The loop in `research-chain.js` was written to stop when a round turns up nothing new, with
a round cap so it terminates on cost when the document does not converge. The cap was
checked one step too early: `if (round === MAX_ROUNDS) break` sat above the re-verification
agent, not below it. Every other round was read by a context that had not made its edits.
The last one never was, whichever round that happened to be — raising the cap moved the
blind round rather than removing it.

The deepseek-harness document on 2026-08-14 is where it showed. Round 3 applied eight fixes
across five slides and the loop ended there. Re-verifying those slides afterwards found
three must-fix items: a count whose governing condition had been dropped while its wording
was corrected, a coverage note describing a state the document had since left, and a
가운뎃점 that renders at the weight of a period inside a monospace version string, fusing
two tokens into one. The third had been fixed by that same round in a different slide, so
the round both knew the defect and left another instance of it standing.

Two of the three are the signature of a late round specifically: a fix round works from a
findings list, and the edits it makes to satisfy that list are the ones no list covers.
That is an argument for reading the last round more carefully than the first, not less.

The cap itself was kept. What changed is that it now fires after the re-verification, and
that the items the re-verification confirms travel to the PR under a heading of their own.
Folding them into "not verified" would have been wrong in the other direction: they were
verified, by the step that found them, and the thing missing is the fix.

This revision did not go through a `skill-creator` A/B. It adds one rule and moves where a
branch sits; a pass-rate benchmark does not discriminate between a loop that checks its
last round and one that does not, because the difference only appears in runs that reach
the cap.

### 2026-11-07: the last finding gets one more edit, then is read again

Sending every final-recheck finding to `unfixed` turned one-word defects into owner work.
PR #53 shipped as a draft because one body sentence contradicted the next; PR #54 because
one sentence dropped "대개" and another said "이름이나 설명" where the code reacts only to a
rename. Each had one correct answer, and in each the answer was to remove or narrow words,
not to write new ones. The owner had handed over the whole job and got the PR back to finish.

The reason the list existed still holds: an edit nobody but the author has read must not ship.
So the last edit stays on the sentences the finding names, and a new recheck reads them
against the source before ship. The first version allowed only a cut or a narrowing. PR #55
showed that was too tight: the defect there was half of a contradiction the source states
(the system prompt flags a wrong role, the user prompt in the same call allows it), and only
an added sentence fixes an omission. The new recheck reads an addition against the source
the same way it reads a cut, so allowing it does not ship an unread claim; the recheck cap,
not the kind of edit, is what ends the loop. "A new recheck, not the earlier one continued"
is there because PR #54's final recheck was a resumed agent: it ran with no start record,
in the background, and its result reached the owner session instead of the author.
The hooks now refuse that route on Claude Code (`docs/harness-parity.md` row 18).

This revision did not go through a `skill-creator` A/B either, for the same reason as the
cap: the difference only appears in runs whose final recheck finds a meaning defect. The
forward test is a rerun of the PR #54 subject.

### 2026-11-08: fix and recheck until nothing blocks

One more edit was still not enough. On PR #55 the chain added the missing half of a
source contradiction, and the new recheck found that the added sentence had dropped both
of the source's conditions, so the PR came back a draft again. In four runs, every final
recheck had found at least one blocking sentence. A fixed number of passes followed by
"leave it for the owner" makes the draft the normal outcome, while the owner handed over the
job so as to receive a finished pull request.

So the loop now runs until a recheck finds nothing blocking. Each pass is kept to the
sentences named and read by a new recheck, as before. The cap of five rechecks is there to
end a loop that does not converge, not to decide quality. The instruction to carry the
source's own condition and scope into the sentence is there because that was the defect
each pass produced: the fix paraphrased the source and dropped a qualifier.

## What the compression-subagent rules were measured against

A scale probe on 2026-08-07 against `getpaseo/paseo` @ `deb5e5c`, 3,682 files of which 27
were opened. It produced no document; the target was whether the harness holds at a size
where the author cannot read the corpus.

**Extraction-only delegation held; the same delegation with a conclusion in it did not.** The
subagent read 38,289 B of a 643 KB path and returned a 10-hop trace with 14 quotes, all 14
verifying against the pinned commit. On the earlier insane-search document the same kind of
subagent returned two wrong reports, and both sat where it had drawn a conclusion rather than
copied a span. The rule's basis is CaMeL; this is the observation that matches it.

**An isolated subagent out-counted a direct grep on inventory**, 13 agent instruction files
against 11, because two were symlinks to directories with no `SKILL.md` in the name. That
structure is what the checkout-location rule aims at, met as a real repository.

One repository, one run, and the trace was read rather than executed.
## Why the prose rules got a counter

Lens B has `check-claims.mjs` behind it. Lens C had nothing, so every prose rule was enforced
by one reading of one document by one context. A count on 2026-08-27 over the 18 published
documents shows what that produced: the rules split by whether a reader could notice a
violation from a single sentence.

Reaction words, promotional adjectives and vague attribution: zero per 100k characters.
`~가 아니라 ~다`, which `prose-ko.md` argues against at greatest length: 58 per 100k, against
a stated budget of one or two per document. Catching that one means counting across a whole
document, and nobody was counting.

So the gate takes the rules that already had a number and does the counting. It invents no
threshold. Everything else prints under `--counts` and blocks nothing, because a count is not
a violation.
## What the translationese rules survive on

`prose-ko.md`'s list of translated-English tells came from the standard prescriptive
literature. An audit against the studies that counted things found part of it measured, part
unsupported, and part measured backwards.

**Measured.** 김혜영 (2009) built two balanced morph-tagged corpora of one million eojeol
each. Over-represented in translated Korean: syntactic passive, specifically `-아/어 지다` and
`-에 의하여`; second- and third-person pronouns and demonstratives; the bound nouns `것/거` and
`때문`; the genitive `-의`. Reported in
[김정우 (2012)](https://www.korean.go.kr/nkview/nklife/2012_1/22_0104.pdf). The passive and
pronoun rules stand on this.

**Measured backwards.**
[최희경 (2016)](https://journal.kci.go.kr/kats/archive/articlePdf?artiId=ART002094440) counted
normalized frequency of `~통하다` at 84.441 in non-translated Korean, 50.856 in the reference
corpus, and 42.090 in translated — Korean written without translation uses it twice as often.
`~를 통해` was on our filler list; it is now off it.

**Unsupported.** `~들` does not appear in the 김혜영 findings, and
[조의연 (2012)](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001644267)
argues that deleting it produces mistranslation. The rule is now about where the plural is
already carried, not about the marker.
## What the 2026-09-29 readability diagnosis changed

Full report: `readability-diagnosis-2026-09-29.md`. The short form: with the prose gate in
place, the counted items went to zero and three uncounted ones took their place. Against 86
human-written Korean tech-blog posts measured with the same `visibleProse`, post-gate
documents carried ~1,300 `·` noun joins and ~380 three-noun chains per 100k Hangul (humans
0), 19% negative-ending sentences (humans 2–3%), and a connective-comma rate of 17% where
humans sit at 30–38% *by this counter*. The 4–13% band below is KatFishNet's morphological
measurement and does not transfer to the eojeol approximation; the rule now holds the
repo-measured band, in both directions.

Lens C lost its prose judgment for two reasons already on this page: the ICC .091 result
below, and Kamoi et al. (TACL 2024), who find no successful self-correction from prompted-LLM
feedback without a reliable external signal. Numbers and quotes have that signal;
wording does not. The fix loop in `research-chain.js` runs one round by default and opens a
second only for findings with one correct answer.

## Why the default reading mode is a continuous page (2026-09-29)

`report-harness-survey-2026-09-29.md` looked at what the most-used research agents and
report harnesses actually emit. None of the research agents emits a deck; decks come from
presentation frameworks. Single-file HTML is common and stays. The user chose the survey's
recommendation: the same shell now opens as a continuous page with the rail as a table of
contents (`body[data-mode="article"]`), and deck mode is a toggle kept in localStorage.
Documents published before 2026-09-30 embed their own copy of the shell and are unchanged.
From that date `check-doc.mjs` requires `meta.purpose` (comparison / explainer / walkthrough)
and an `h2` plus `.key` on every section after the cover, because the survey's second
finding was that one chapter spine was being applied to three different reader tasks.

## Why a slide folds its support (2026-09-29)

The user read the rewritten Opus 5.5 document and named the remaining problem: every slide
was a wall of sentences at one weight, so the claim and its support could not be told apart.
Measured on that document, the tl-dr slide showed 672 Hangul characters and the densest
slide 1,082, with a three-sentence `.dek`, stat cards carrying two or three sentences each,
and list items of two to four sentences. Two slides were re-laid without changing a
sentence: a one-or-two-sentence `.key` under the title, one-line stat subs, a four-line fact
list, and the rest in `details.more`. Visible text fell to 316 and 382 characters with the
full text still present; the user judged this the readable shape. That is the basis for the
`.key` / `details.more` slots in `research-doc/SKILL.md`, the Fold entry in `visual.md`, and
the per-slide visible count in `check-prose.mjs --counts`. The 300–400 figure is those two
slides, not a corpus.

## The comma the documents all share

[KatFishNet (ACL 2025)](https://aclanthology.org/2025.acl-long.1030/) measured what separates
human-written from LLM-written Korean. The strongest single signal is a comma after a
connective ending: 4.10 / 4.68 / 13.27% for humans across three genres, against
19.83 / 15.57 / 28.01% for models.

Measured the same way over the 18 documents published as of 2026-08-19 — approximately, by eojeol-final
string rather than morphological analysis — the rate is **37.1%**, higher than any LLM figure
in the paper. The approximation inflates both terms of the ratio, so the absolute number does
not belong beside theirs. What survives the caveat is that every document sits in the same
band and nothing in the harness was looking at punctuation.

**A readability lens is not the repair.** Two expert-panel studies found Korean raters score
LLM Korean higher than human Korean on nearly every rubric dimension while separately
reporting that it reads like a machine, and inter-rater agreement on the one naturalness item
was ICC(A,1) = .091 ([arXiv:2601.19913](https://arxiv.org/abs/2601.19913)). Asking one more
subagent whether a document reads well would add noise, not a lens.
## Why a rule has to carry its reason

The only head-to-head ablation of instruction elements is
[Mishra et al., ACL 2022](https://aclanthology.org/2022.acl-long.244/). Average ROUGE-L gain
over a no-instruction baseline: definition +50, things-to-avoid +25, definition plus positive
examples +65. Their full instruction, which also carried the prohibitions, scored 32 against
33 for definition-plus-examples. Removing negative examples moved GPT-3 from 24 to 44.

The part worth keeping is that their human annotators rated the negative examples helpful.

**A reader asked whether a prohibition helps will say yes, and be wrong**, which is why this
weakness does not show up in review.

What carries the gain is the explanation. [TICL](https://arxiv.org/abs/2502.08972) attaches
generated failures to explanations of why they fail and reports explanations *"responsible for
up to 77% of the gains."* Rule count is its own cost:
[compliance collapses by roughly 80 simultaneous rules](https://arxiv.org/abs/2607.19257), and
adding a constraint the output already satisfies still degrades output
([arXiv:2601.22047](https://arxiv.org/abs/2601.22047)).
## Why the documents are plain and not simplified

The reader model already ruled out writing for a general audience. What the measurements add
is that the cost of simplifying for a reader who has the background is specific: it lands on
the mechanism.

In [InfoLossQA](https://arxiv.org/abs/2401.16475), three linguists marked information loss in
104 GPT-4 simplifications of medical abstracts. **41.7% of the losses fell in the Methods
section against 3.5% in the Conclusion.** The conclusion survives and the mechanism does not,
which for a document built around a traced mechanism is the whole document.

[Ellinger et al.](https://arxiv.org/abs/2507.11981) measured whether a definition still
covered a word's senses under three prompts. GPT-4o mini: 78.43% normal, 22.22% under "in
simple language", **1.31% under "like I am 5 years old"**. The gradient is the useful part —
the two instructions are not the same request.

Not measured on developers, on documentation, or in Korean.
## Why there is no sentence-length rule

Nobody should add one without reading this, because the obvious rule is the one the evidence
does not support.

**The thresholds in circulation have no source.** A full-text search of 국립국어원's 공공언어
documents returns no numeric sentence-length rule. `50자` and `20어절` trace to nothing.

**Scale makes the popular cap vacuous.** Across 9,945 textbook passages, mean characters per
sentence is 32.30 in 국어 and 41.21 in 사회
([교육과정평가연구 27(1)](https://www.ejce.org/archive/view_article?pid=jce-27-1-87)) — a
50-character cap is looser than the average middle-school sentence. And length rises with the
reader's level: 17.0 in lower elementary, 40.1 in middle school.

**In Korean, longer can be easier.**
[Hwang & Steinhauer (2011)](https://pubmed.ncbi.nlm.nih.gov/21391765/) found the garden-path
P600 *smaller* when the sentence-initial subject NP was longer. No Korean study has
manipulated sentence length alone and measured comprehension.
## What the English-term rule rests on

`prose-ko.md` keeps RAG, embedding, corpus and the rest in English on the argument that
translating them produces coinages harder to read than the original. That has not been tested.

The nearest measurement is
[조영지·백현아 (2024)](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003139706),
96 native readers: loanwords were recognized more slowly, with *"no significant difference in
sentence comprehension times."* Its stimuli were Hangul transliterations, not Latin script,
and no study of Korean text carrying Latin-script technical terms appears to exist.

The 국립국어원 loanword findings are about a readership meeting terms it does not have. This
library's reader is a developer for whom the English term is the familiar form. The rule
stands on the audience, not on a measurement.
## Where "experts need less explanation" stops applying

The rule against over-compression now has evidence, and it is not the evidence people reach
for. The expertise reversal effect is real — a 2025 meta-analysis of 60 studies puts
high-assistance instruction at d = 0.505 for low prior knowledge and d = −0.428 for high
([Tetzlaff et al.](https://www.pedocs.de/volltexte/2026/34113/pdf/Learn_and_Instr_2025_Tetzlaff_u.a._A_cornerstone_of_adaptivity.pdf)).
Three things stop it applying here.

It is asymmetric, and the authors say which way to err: *"providing novices with assistance
has a stronger effect than withholding assistance from experts."* Its effect shrinks when
prior knowledge is measured rather than proxied by grade level. And its mechanism needs the
reader to be unable to skip — these documents are decks with a rail.

**The text-coherence version reverses for this audience.**
[O'Reilly & McNamara (2007)](https://doi.org/10.1080/01638530709336895) narrowed the result
that high-knowledge readers do better with less coherent text: the benefit *"was restricted to
less skilled, high-knowledge readers, whereas skilled comprehenders with high knowledge
benefited from a high-cohesion text."* A developer who reads technical prose for a living is
in the second cell.
## What the comma rule was measured against

The rule went in on evidence from a paper and was then run through `skill-creator` against the
pre-revision skill: three prompts supplying the source facts and asking for Korean slides, so
the test isolates prose from research. Rate of a connective ending followed by a comma:

| | before | rule as written | after the repair |
|---|---|---|---|
| mean of three | **39.2%** | **0.0%** | 0.0% at a 1.38% comma rate |

Human-written Korean sits at 4.1–13.3%. **The first version overcorrected into documents with
almost no commas at all** — 0.21% of Hangul characters against 1.13% for people. Two ✗/✓ pairs
both said cut, and one prose sentence said keep it where the reader needs it. The prose
sentence did nothing.

**The repair was a ✓ where a comma survives, and the first attempt made it worse.** The keeper
read `keyword 경로에만 캐시가 있어서, …` — `있어서` is a connective ending, so the example
demonstrated the banned pattern under a ✓, and the next run copied it (`없어서,`). Replacing it
with a comma between parallel items brought the rate to 0.0% at a 1.38% comma rate, against
1.40% before the rule existed.

**An exemplar is read as a pattern to copy, so a ✓ carrying the defect teaches the defect.**
Check the good example against the gate too.
## Moving countable rules out of the prose

The same run tested whether a rule can live in the script instead of the skill. Five entries
in `prose-ko.md` — progress narration, reaction words, monologue, vague attribution,
promotional adjectives — were each a ✗/✓ pair plus a reason, 26 lines, and each is a fixed
list of words that `check-prose.mjs` blocks. They were replaced by one entry naming all five
and pointing at the gate, 8 lines.

Output did not change: zero occurrences of all five patterns before and after, and identical
assertion scores. That is weaker evidence than it looks — the pre-revision skill also
produced zero, so what this shows is that the ✗/✓ blocks were not the thing preventing them.
Either way the compressed form is safe, and `prose-ko.md` went from 273 to 258 lines while
gaining the comma rule.

The general form: **a rule the gate can count belongs in the gate, and what stays in the
skill is the reason.** Script rules cost nothing at generation time; skill rules cost tokens
on every invocation and dilute compliance with the rules around them.


## Why the contrast frame is counted and not blocked

`prose-ko.md` said of `~가 아니라 ~다`: *"Once or twice per document, not per slide."* Taken as
a budget it made this the one gate rule that fired — 179 occurrences across the 18 documents,
146 over the limit, blocking 14 of them.

Reading the 34 in the worst one settles it the other way. What the pattern catches here is
verbatim quotes (`AI 경쟁의 다음 전장은 모델이 아니라 회사의 기억입니다`, a Threads post used as
evidence), attribution corrections (`판단 자체는 원문이 아니라 DataSci Ocean 의 읽기이고`), and
the use `prose-ko.md` explicitly permits, correcting an answer the reader holds. The
decorative doubling the rule was written against is rare here.

The frame is a strong measured signal, roughly nine times more frequent in model-written
Korean. But the signal is about a register, and a regular expression cannot tell a register
from three legitimate constructions that share its shape. So it moved to `--counts`, alongside
`~에 있어서`, which failed the same test.

**A pattern whose matches in the corpus are mostly correct has no business blocking a
document.** Every rule left in the gate now blocks zero of the 19 published documents, which
is the state a regression guard should be in.

## What an outside style guide was worth here
[`snflkd/fluent-korean`](https://github.com/snflkd/fluent-korean) (MIT, `ce8683f`) diagnoses
LLM Korean as the opposite of what this repo assumes: omission rather than excess, restoration
rather than cutting. Two guides pointing opposite ways is worth a measurement, so the rules it
carries that this repo lacks were measured before adoption.

| Its rule | Measured here | Outcome |
|---|---|---|
| Do not end a sentence on a noun phrase | 534 of 5,474 sentences (9.8%) end without a 종결어미 | rejected — all sampled are figure captions, source markers, and label definitions, the category its own clause exempts |
| Do not stack 관형격 `~의` | `~의 ~의` chains across 19 documents | rejected — 0 occurrences |
| Avoid metaphor, avoid the em dash | already held by `lens-prose.md` and `check-doc.mjs` | no change |

**None of its rules were adopted.** Delivery is settled separately: output styles apply to
the main conversation only, and `research-verify` runs its lenses as subagents, so an output
style would not reach the place the Korean is written.

**Its diagnosis was.** Two things in this repository trace to reading it. The guide states
that it writes its own instruction text in the register it prescribes, to control priming —
and that is what exposed a hole here: `prose-ko.md` fixed the plain declarative for published
documents and nothing counted it, so the drift could arrive without a decision behind it.
`honorific-register` exists because of that reading, and adding it is what surfaced the 1,557
quote containers both gates were counting as the document's own prose. The sentence in
`prose-ko.md` that says an instruction primes the register it is written in is that guide's
argument, kept.

The second is its scope rule against mirroring the user's tone. This repo said the opposite —
review reports "follow the register of the conversation" — and practice had already sided with
the guide: reports here hold a conversational register while the conversation runs in 반말. A
report is a work product, so its quality should not track the conversation's temperature. The
rule now says that, with the published-document register left where it was.

## What the 2026-08-30 audit changed
The instruction corpus had only been appended to, so it was read as a whole — 4,714 lines by
five separated readers, one each for contradictions, duplication, intent defeat, stale
references, and gate/prose drift. Findings were reproduced before being acted on.

**The measurements that moved a rule:**
| Measured | Changed |
|---|---|
| The four Korean specimens the skills hand an author ran at 100 / 100 / 33 / 100% comma-after-connective, against a human band of 4.1–13.3% | All four rewritten to 0%. `visual.md` now states that `visibleProse` strips `<svg>`, so no counter reads an `aria-label` |
| 18 `derived` claims in `.research/`, against a 7-value `kind` list in `research-verify/SKILL.md` that omits it | The skill points at `check-claims.mjs --help` and explains only `derived`, which needs a decision rather than a lookup |
| The skill's one worked claim specimen failed two gate rules: `locator: 표 1` is rejected, and its quote was 28 characters against a 40 floor | Specimen corrected; the `locator` grammar is now stated where it is written |
| `text_sha256` blocks `source-identity` and appeared in 0 markdown files and neither scaffold | Documented in `research-source` with the command that produces it, and added to the scaffold |
| Three of the five word-list rules lens C was told to sweep for are blocked at zero by the counter it runs first | `lens-prose.md` no longer sweeps them |
| 4 documents ship `category: "oss"`, which `CATEGORY_LABEL` never registered, so the raw token rendered beside Korean labels | Registered; `new-doc.mjs` now emits the CLI's own type |
| 1,557 quote containers (`.q`, `.wl`, `<cite>`) were counted as the document's own prose by both gates, which each state the opposite | `visibleProse` and `stripQuoted` strip them. The register rule found 13 polite endings, every one inside a quotation |
| `passive-stack` and `double-passive` both matched `되어지·되어진·불려진`, so one sentence reported twice and a waiver needed two ids | Merged. `check-prose.test.mjs` now asserts no two rules share an alternative |
| The register rule's first form blocked `~(으)니까`, which the same file counts as an ordinary connective | Rewritten to the ㅂ-batchim condition that actually separates 합쇼체 from the connective |

**Separation paid in both directions.** Two readers independently found the `~니까` defect and
four found the missing `derived`; independent discovery is what separates a finding from one
reader's bias. Two pairs disagreed, and the disagreement was the useful part: `Three lenses` in
the table above is accurate, because lens D is deliberately handed A/B/C's reports and the
mutual-blindness rule is about those three — while the same phrasing inside a ✓ specimen was a
real defect, since `AUTHORING.md` bars repository facts from specimens. A single reader returns
one of those verdicts and stops.

**Nothing found here was a bad rule.** Each was written correctly and then left while something
beside it moved, which is invisible to a reader who starts from the rule being edited.

## Why an empty ledger is not a pass
Committing the untracked evidence turned up one document, `cerebras-kb-architecture`, whose
three ledger files hold nothing but the scaffold comments `new-doc.mjs` writes. Run against
it, `check-claims.mjs` printed:

```
OK    research/2026-08-20-cerebras-kb-architecture  (주장 0개, 근거 0개, 출처 0개)
통과. 인용이 고정 원문과 일치한다.

```
Indistinguishable from a document whose every quote was matched against a pinned commit,
which is the opposite of what the gate exists to establish. The counts are printed, but a
passing gate is what gets read.
`empty-ledger` now blocks it. The 14 ledgers in the repository carry 11 to 54 claims each, so
nothing real is affected, and a missing `claims.jsonl` was already caught by `claims-file`
rather than reported twice. A freshly scaffolded document now fails this gate, which is
correct and costs nothing: the only promise made about a fresh scaffold is that
`check-doc.mjs` passes it.

**A gate that cannot fail on absence measures presence only.** Worth checking for wherever a
count of zero is a legal input.


## The number the paper printed and the gate could not find

Retro-fitting evidence onto `wikikv-hierarchical-kb-storage` turned this up. The document
says the storage benchmark ran on a wiki of about 2,000 KV pairs. The paper says exactly
that — `a medium-sized wiki ($\sim$2{,}000 KV pairs)` — and `check-claims.mjs` could not
find it.

`delatex` replaces `{` and `}` with spaces, which is right for commands and wrong for the
one place LaTeX puts braces inside a number. `2{,}000` came out as `2 , 000`, so one value
became three tokens: `quote-match` failed on any quote containing it, and `hasNum` searched
the raw text for `2,000` and `2000` against a haystack holding neither.

Four such numbers are in that one paper (`2{,}000`, `1{,}000`, `1{,}379`, `1{,}949`) and the
document leans on two of them. `fixNums` now restores the separator between digits, before
the braces are stripped, and `hasNum` normalizes its haystack the same way.

**This is the empty-ledger defect in the other direction.** That one passed what should have
failed; this one failed what should have passed, and a false positive is the worse of the
two — `check-prose.test.mjs` opens by saying so. A rule that blocks correct work pushes the
whole gate toward `--allow`, and the exception is written once and never revisited.


## The table number that passed its own format check

`locator-form` accepts `Table II`, because IEEE papers number their tables that way.
`scopeFor` matched only `/^Table\s+(\d+)$/`, so a Roman locator fell through to the
whole-document branch. The claim was still checked, against 65,000 characters instead of one
table, and the only trace was an aggregate line at the end of the run.

Five claims across the corpus were in that state. Resolving Roman numerals dropped one
document's unscoped count from 40 of 43 to 35, and the newly narrowed claims did not pass:

| Claim | Cited | Actually in |
|---|---|---|
| the no-evolve Final A@1 cells | `Table II` | `Table III` (`tab:rq1-main`) |
| the evolved-artifact recall figures | `Table III` | `Table II` (`tab:rq2-knowledge`) |

**The document had two tables swapped**, in 15 and 3 places plus its `meta.json` summary,
and it had been merged. Nothing caught it because the wrong locator was never resolved: a
quote from Table III matched fine when the haystack was the entire paper.

The same narrowing then rejected one input of a derived claim. `41.4` was listed among the
cells being averaged, and it is not a cell — it is the body value in §VI-B that the average
is being compared against. The evidence now points at the table for the four cells and at
the section for the number they disagree with.

**A check that cannot narrow its search still reports success.** The unscoped count existed
before this and said so honestly, but it is one line at the end of a passing run, and a
passing run is what gets read.


## The table numbers that came from text nobody sees

`envAt` counts `\begin{table}` in the order it finds them, which is how LaTeX numbers
floats. It was counting them in the raw `.tex`, and an e-print carries more than what
compiles.

One paper's source still has the IEEE template inside a `\begin{comment}` block — its
example table, its "Prepare Your Paper Before Styling" sections — plus three of its own
tables commented out. Ten table environments in the file, six in the paper:

| Locator | Gate resolved to | Reader sees |
|---|---|---|
| `Table II` | `tab:evolution-jobs` (never rendered) | `tab:microbench-p50` |
| `Table IV` | `tab:nav-latency` (never rendered) | `tab:end-to-end` |

Every number was off by four, and section numbering with it: what the paper prints as §VI-B
was §VIII-B in the raw file. A locator written correctly against the published paper
resolves to the wrong table, and `quote-match` then blocks a claim that was right.

`stripUncompiled` removes `comment` environments and whole-line `%` comments before any of
this runs. The sha256 identity check is untouched — it still measures the bytes that were
pinned.

**This is the third defect the same exercise has produced**, after the LaTeX thousands
separator and the Roman table number, and all three share a shape: the gate was reading a
representation of the paper that no reader ever sees.


## Why a missing ledger is only sometimes recoverable

Retro-fitting evidence onto documents published without it worked for papers and stopped at
repositories. Re-fetching `2606.14275v1` reproduced `222b1e2a…`, the exact `text_sha256` the
ledger holds, so a paper's pin is as good written later as written at the time.

`cocoindex`, for the document published 2026-08-20, is not. Its HEAD is now a commit from
2026-08-28 — eight days after publication. Writing that sha into `sources.jsonl` asserts the
document was checked against bytes that did not exist when it was written, and no gate
separates the two: `check-claims.mjs` verifies quotes against whatever commit the ledger names.

**A later pin records what is true now, not what the document rests on.** Where the sources
moved, a coverage chapter saying the evidence was not captured is the smaller claim and the
only true one.


## The reader was named once, far from where form is chosen

`SKILL.md` called the reader "a developer deciding whether to use this thing next week."
Two things were wrong with it. Adoption is one angle on a document, not the test it has to
pass — and the person these are written for says so. And the identity appeared **once**, at
`SKILL.md:27`. Across the 943 lines an author loads while writing, `reader` occurs 44 times
and `developer` occurs in no reference file at all: not `visual.md`, which decides what form
a mechanism takes, not `paper.md`, not `prose-ko.md`. At the point where the choice between
an equation and a diagram is actually made, `the reader` was a pronoun with no referent, and
the default became the form the source used.

Nothing governed equations anywhere. One document of twenty carries notation at any density,
and a review of it from the reader's own position found the split: four places earn it —
the two gate predicates side by side, `β=0.05`, the 3×4 operator product, the predicate
checklist in the traced example — and the rest follows the paper's §IV–§V order without
changing what a reader concludes. Two symbols are never defined in the document at all, and
`식 (10)` refers to a numbering the document never introduced, so a reader has to open the
paper to read our own sentence.

So the bar is not "fewer symbols". **A symbol has to be used again and to produce a
prediction the prose then cashes**, and a reference that resolves only in the source is the
failure worth checking for, because it is checkable. `visual.md` now opens by naming the
reader, and lens C checks the two mechanical cases.


## Enumerating the cases was the wrong repair

The first attempt at the notation problem added two checks to lens C — a symbol never defined
in the document, a `식 (N)` with no numbered equation. Both are real and both are cheap, and
they were mistaken for the answer. The case space does not close: block the equation
reference and the next document cites `정리 2`, then a variable named in a figure and nowhere
else. What a script can enumerate here is a rounding error against what a reader notices.

What actually decides the output is whether the reader is present where a decision is made,
and a count over the chain says where that stopped being true. `research-source` frames the
question the document has to answer and names the reader **zero** times in 261 lines.
`lens-completeness`, whose whole job is to ask what is missing, said `reader` zero times —
missing for whom was not a question it could form. Both now carry it: one clause at the point
where scope is set, one paragraph where absence is judged.

The ⑩ rows in `paper.md` and `oss.md` gained four words. A review from the reader's position
found that the largest thing standing between that document's subject and a production system
— a person labelling roughly 480 cases by hand for the evolution loop to run — appeared
nowhere in the adoption chapter, because the chapter asked when adoption makes sense and not
what it costs to keep running.

**A rule the model cannot count has to be a fact the model holds while deciding.** That is a
different repair from a gate, and it is the only one available for most of what matters here.


## The word lists were called a fixed list, and are not one

`prose-ko.md` described five of the slop families as "a fixed list of words, so a script holds
them." Measured, that is false. Written as the gate lists them — 흥미롭게도, 정교한,
업계에서는 — all eight test sentences are caught. Written as the same move in other words —
인상적인 것은, 뛰어난, 현업에서는, 정리하자면, 가능성이 있다 — all ten pass.

Three of the eleven rules are genuinely closed, because they are grammatical forms rather than
vocabulary: the doubled passive, `~에 의해` plus a passive, and the 합쇼체 ending, which keys
on a ㅂ batchim rather than a list. The other eight hold whichever forms recurred last time.

**The damage was not the rules. It was believing them.** An earlier revision told lens C to
stop sweeping that family because "the counter blocks all five at zero", which removed the only
coverage there was and replaced it with eight strings. The instruction is now to sweep for the
move and leave the exact strings to the counter.

The other two gates are clean on this axis. `check-claims.mjs` asks only whether a thing is
present — a file, a field, a quote at a locator, a number inside a table — and presence is
closed by construction. `check-doc.mjs` is structural except for `em-dash`, which is one
character, and `process-narration`, which is four regexes over an open class and carries the
same caveat.


## What the 2026-09-29 skill cleanup moved out of the skills

The cleanup followed the two reviews of the same day (`harness-review-2026-09-29.md`,
`report-harness-survey-2026-09-29.md`). Three decisions drove it: the default document is
continuous text with a deck toggle, the reader's task depends on a document kind chosen at
the question stage, and the author's context carries fewer simultaneous rules. What the
skills lost in the process is recorded here, so the rules can still be audited.

**Kinds.** `comparison`, `explainer` and `walkthrough` replace the single "developer deciding
whether to adopt" reader. The trigger was `oss.md` saying the reader is deciding whether to
adopt while `research-doc/SKILL.md` said adoption is one angle and not the test; six files
defined the reader six ways. The survey's proposal 2 (OpenAI's brief/summary/comparison/report
choice, LangChain's per-question structure) supplied the split: what stays common is the
summary, the evidence and the limits, and chapter set and length follow the kind. The kind
names come from the user's decision, and `purpose` in `meta.json` is where the lenses read
it. The numbered spine ①–⑫ and the "⑩ rows" mentioned above are gone; chapters are named by
eyebrow, and the coverage chapter is the `setup` chapter everywhere, because "chapter 7" was
right for one document in 28.

**Chapter, not slide.** The `.key` and `details.more` grammar of the section above now sits in
`research-doc/SKILL.md` §The chapter grammar as the contract for a continuous document with a
deck toggle. The class name `slide` stayed because the shell keys on it. The 300–400
character figure was dropped from `visual.md`; it came from two chapters and the skill now
says "a few hundred", with `--counts` printing the actual count.

**Specimens that were real documents.** These were illustrations in the skill bodies and are
recorded here so the skills carry neutral versions instead:
- A direction reversal: a document called a table's gaps widening when they went
  7.5/12.8/9.6 → 5.1/10.5/16.9, and built "weaker models benefit more from structure" on it.
  It appeared in five files (`prose-ko.md`, `lens-numbers.md`, `research-verify/SKILL.md`,
  `paper.md`, and the worked example). The skills now use invented figures.
- A unit error: 2.5–3.9 was pages read per query, not tool calls, and a rebuttal rested on the
  misreading. A range error: 78–84% written 84–87%, and 0.860–0.989 written 0.93–0.99.
- An ablation that also cut the budget, so a claimed escape from a budget-asymmetry objection
  failed because two things moved.
- A coverage chapter claiming 23 of 65 files with four unread directories totalling 34.
- A reading path meant to reach the ablation whose two stops both linked the conclusion, and a
  compilation-cost gap repeated six times.
- A stale pointer: `prose-ko.md` said that file carried a ban on metaphors and
  inflated headings. No metaphor rule exists anywhere in the repository, and the inflated-
  heading rule lives in `research-doc/SKILL.md`.
- "A mature TypeScript monorepo" whose request path ran through four files of 150–250 KB each,
  the basis for the compression-subagent rule; and a 1M-context remark that a load lands in
  the middle where recall is worst.

**Prose measurements.** The skills used to state them; the reasons are in the sections above
and in `readability-diagnosis-2026-09-29.md`. Removed from the skill text: the human comma
band of 30–38% and 1.3–1.6 per 100 characters (`--counts` prints the band), instruction-tuned
models nominalizing at about twice the human rate, one sentence in five ending on a negation
against one in forty for human technical writing, and `~를 통해` appearing about twice as
often in untranslated Korean as in translated. The `--counts` output is now the reference for
each figure.

**Rule count.** The diagnosis counted about 99 bold instructions in the author's context
(and about 110 with `oss.md`), against the 80 at which compliance was reported to fall.
The cleanup merged entries that had one ✗/✓ each into one entry with several, moved
gate-enforced rules to a sentence, gave the duplicated rules one owner (the reader in
`research-doc/SKILL.md`, the trace scope there too, "do not list what passed" in
`research-verify/SKILL.md`, the four number checks in `lens-numbers.md`), dropped a
rationalizations table that repeated rules stated elsewhere, and rewrote the `X is not Y.
Z is.` contrasts in the instructions as directives with a subject and a verb.

**The claims gate.** `research-verify/SKILL.md` now states a 400-character quote cap and a
`verdict` of `confirmed`, `unverified` or `derived`, which the code side is changing
`check-claims.mjs` to enforce. The review measured a median quote of 297 characters in one
document and a maximum of 2,604 in another, so a cap was the smallest change that keeps a
quote pointing at one sentence.

## Why the scaffold takes the kind

Until 2026-09-29 `new-doc.mjs` laid out the same twelve chapters for every document, with
`adopt` (도입 판단) among them, and left `purpose` as a TODO in `meta.json`. The kind was
chosen after the chapters were already on the page. The Opus 5.5 introduction, written to
tell a developer what changes when they move from Opus 5, ended in an eleven-row adoption
checklist nobody had asked for; `research-doc/SKILL.md` had said since 2026-09-29 that
adoption is one kind's task and no other's, and the scaffold contradicted it on every run.

The scaffold now takes the kind as its third argument, writes it as `purpose`, and lays out
the middle chapters that kind needs: `compare`, `cost`, `adopt` for a comparison;
`mechanism`, `case`, `limits` for an explainer; `map`, `trace`, `change` for a walkthrough.
There is no default kind. `research-source` picks it from the words of the ask and asks
when they do not say. Lens A was renamed from `lens-adoption.md` to `lens-reader.md` at the
same time, since its task had been per-kind since the 2026-09-29 rewrite and the name still
said otherwise.

## What the 2026-09-29 second pass moved out of the skills

The prompt audit of the same day (`prompt-audit-2026-09-29.md`) found no text written for
an older model, but four pairs of files that contradicted each other, rationale padding
around rules, and reviewers with no definition of a finding. This pass rewrote the skill
set against three specimens, one chapter per kind, now in
`research-doc/references/specimens/`. What left the skills:

**Rationale for the prose families.** `prose-ko.md` used to explain each family before its
rules ("this family survives longest because every sentence in it is true"; "these arrive
assembled and read as decoration"). The rules stayed as fifteen ✗/✓ entries; the
explanations are this document and `readability-diagnosis-2026-09-29.md`. The file went
from about 2,000 words to about 800.

**The excuse table.** `research-verify/SKILL.md` carried five rows of "the excuse / why it
fails" for skipping verification. Each row restated a rule stated elsewhere in the file,
and a reader asked whether it helps says yes, which is not evidence. Dropped.

**Four limits of the procedure as prose.** The same file asked the reporter to state four
limits "beside the findings" in four paragraphs. They are now four fixed lines in the report
template under `검증하지 못한 것`, filled in or marked 해당 없음, because a fixed slot gets
filled and a paragraph of guidance gets paraphrased away.

**Lens D.** The completeness critic and the reader both asked what the reader's task was
missing. D's one distinct item was a quote that verifies while the sentence around it
widens it, plus reading the other reports. Both moved into lens A, which now runs after B
and C and reads their reports. One agent call fewer per run; `run.json` records it.

**The chapter grammar's claim slot.** `h2` was "a claim sentence, not a noun label" and
`.key` was "what the reader does with the claim". Documents written under that put the claim
in the heading, restated it in `.key`, and again in the body, which is where the 53%
framing-sentence ratio in the Sonnet 5.5 v2 document came from. Now the `h2` is a short
heading that names the content, the claim is stated once in `.key`, and `.note` is
optional. The 300–400 visible-character figure was replaced by the specimens, because the
right amount differs by kind: the walkthrough specimen shows 143 visible Hangul, the
explainer 633, the comparison 310.

**Code-specific sections of `research-doc/SKILL.md`.** Compression subagents, the trace
scope rule and "claims that reading cannot establish" moved to `oss.md`, which is loaded
only when the corpus is a repository. The author's context for a paper no longer pays for
them.

**Two stale phrasings.** `research-source/SKILL.md` cited "PR #2943" as the sign of a cut
history (a real repository's number) and gave "three or four spans … fifty" as span counts
that were "not a target"; both were replaced or removed.

**A quoting rule.** Anthropic's guidance for Fable 5.1 notes the model reproduces retrieved
passages without marking them. `research-doc/SKILL.md` now has a §Quoting the source with a
✗/✓ pair: verbatim text goes inside `.q`, `.wl` or `<cite>`, which `check-prose.mjs` already
skipped without the author being told why.

## What the first document under the rewritten skills sent back

The Sonnet 5.5 migration document was written a third time on the same corpus, by the same
model, under the rewritten skills (v3, `research/2026-09-30-claude-sonnet-5-5-migration-v3`
on the opus worktree branch). Against v2: framing sentences 40% → 30%, negative `.note`
endings 10/16 → 0/2, `것이다` 76 → 21 per 100k, one lens call fewer per round, 28 → 22
minutes. The author agent reported twelve points where the skills blocked or contradicted
it, and each became a change:

- The scaffold still put "TODO 주장문" in `h2` and a `.note` placeholder in every chapter,
  the opposite of the grammar. Placeholders now match, `.note` is absent, and `sources`
  has no `.key` (the gate exempts it; a required `.key` on a chapter with no claim
  produced a filler sentence).
- `.note` was defined three ways (optional; "gather disclaimers here"; "limits go in the
  clause"). The specimens README now says the same thing as prose-ko rule 2.
- No corpus type fit a developer guide, so `oss` hints (file:line, commit SHA) leaked into
  a web document. `new-doc.mjs` takes `web`, with its own hints.
- `check-claims.mjs` matched no web quote at all; 71 of 78 claims went through on
  `--allow=web-unchecked` although the fixed copies were on disk. It now matches quotes
  against `notes/web/<id>.txt` (or `--web id=<path>`) and reports a hash mismatch against
  `text_sha256` as a note rather than a block, since the copies are local.
- Lens B read "Coverage: the setup chapter" as its scope and checked one chapter. The line
  now says where the document states what it read, and that the review covers the whole
  document.
- Lens A's "missing" items and lens C's "one claim per chapter" collided: adding the
  missing fact drew a second-claim finding, and the whole second round was that. The verify
  skill now says a supporting fact goes into the chapter whose `.key` it supports and is
  support, not a claim; a fact no chapter covers is a needs-judgment item.
- `.q` in the shell was a block quote, so inline quoting needed document-local CSS; the
  shell now styles `span.q` inline, and the specimens use it in their folds. Text tables
  rendered right-aligned and unwrapped; `table.prose-table` in the shell fixes that.
- The round cap ("at most two") and the order of extraction versus lenses (lenses first,
  extract while they run) were in the workflow but not the skill. Now in the skill.
- prose-ko rule 15 ("a summary carries its numbers") pushed the author to count items,
  and the counts drifted after edits; the rule now says not to tally.

**Figures.** The user asked why v3 carried none of the source's four benchmark charts
(80 data points, already extracted to `notes/figures.md`). The rule existed in `visual.md`
(redraw the source's charts; name the central figure) and the pin step wrote
`notes/figures.md` for papers only; nothing in the spine, the specimens or the lenses
asked for it, and the check "no figure taken from the source" was lost when lens D folded
into A. Now: `research-source` writes `notes/figures.md` for every corpus with a chart's
data points; `research-doc` lists it among the files to read, the `result-*` row and the
body slot say the source's chart is redrawn rather than paraphrased; the specimens README
says where each kind draws; lens A checks every entry of `notes/figures.md` was redrawn or
named. v2 and v3 both have one SVG and two figures; that is the gap this closes.

## What the v4 run sent back

v4 (`research/2026-09-30-claude-sonnet-5-5-migration-v4`, same corpus, harness `876d4da`)
confirmed the figures rule: the four source charts were redrawn as effort-by-cost
scatter plots and the two tables retyped, with nothing in `notes/figures.md` left unused
(v3 had one SVG). `check-claims.mjs` matched all 99 claims against the fixed copies with
no `--allow`. The author reported eight remaining points; each became a change:

- `notes/web/` was gitignored, so the web match worked on one machine only. `.gitignore`
  now commits `notes/web/` and `run.json` while the rest of `notes/` stays ignored;
  `AGENTS.md` lists both.
- Web sources had no number check. `check-claims.mjs` now runs `numeric-match` for web
  copies as it does for papers and repositories.
- The scaffold wrote `category: "web"` and no `format`; it writes `note` and `article`.
- There was no `web.md`; there is one, and the walkthrough definition no longer assumes a
  repository.
- `table.prose-table` still used the mono font in body cells, and `ul.facts` labels were
  clipped at 3.2em; both fixed in the shell.
- The rail had to be edited by hand whenever chapters changed, and the gate counted it. The
  shell now builds the rail from the sections (`data-label` names a chapter) when the HTML
  carries none, and `rail-count` applies only to a hand-written rail.
- A fix that needed a chapter the document lacked was squeezed into a line and found again
  next round, in v3 and v4 alike. The verify skill now keeps such a fix a needs-judgment
  item.
- Lens A captured a blank page and moved on. Lens C carries the render command and the
  rule that a blank capture is not a checked rendering.

## What the Opus 5.5 rewrite sent back

The Opus 5.5 introduction was rewritten as an explainer against the user's original
2026-09-23 request (full coverage in the article's order, per-section developer actions,
numbers from opened sources), which the 2026-09-29 rewrite had narrowed into a migration
walkthrough with an adoption checklist. 34 chapters, every chart and table in
`notes/figures.md` redrawn, 183 claims matched with no `--allow`, a `reception` chapter
from HN comments fetched through the Algolia API. Three things changed in the harness:

- `notes/figures.md` is committed. Chart quotes are matched there, and an ignored file
  meant CI could not match them; the author had appended the chart points to `w1.txt`
  as a workaround.
- Lens A reads the draft after B and C's must-fix items are applied, with their reports.
  The skill had said both "fix as reports arrive" and "A reads B and C", without saying
  which draft A sees.
- The round cap left two one-line errors in a committed document. An item with one
  correct answer found by the last re-check is now fixed once more and recorded under
  `after_last_recheck`; the cap still ends rounds, not corrections.

Not changed: `check-prose.mjs` does not count `그래서` as a paragraph-initial connective.
Adding it would shift the column away from the human band it was measured against, so the
regex and the band move together or not at all.

## Why the chain states its args where the caller looks

`research-chain` failed on its first launch repeatedly, with zero agents run each time. The
2026-10-07 launch is a typical case. The launcher told the main session to call
`Workflow({ name: "research-chain", args: "<the free-text args>" })`, so the request text went
through as given (`Target: Engineering at Meta, ...`), and the guard returned
`args arrived as a string and did not parse as JSON` with zero agents run. Only reading the
script showed the required shape. It was in a comment, and nothing the caller sees before
launching (the workflow listing, the skills, `AGENTS.md`) mentioned it. The launcher's
template points the other way.

The official workflow docs give `meta` no args schema and no `argument-hint`, and do not
describe the launcher's text. The listing shows `meta.description` and `meta.whenToUse`, and
`meta` must be a pure literal, so the shape is written into `whenToUse` and again in the error
the guard returns. Both copies sit in one file with a comment tying them together; a third in
`AGENTS.md` or a skill would drift the way the comment already had.

Free text is rejected rather than read into fields. A workflow cannot ask, so a parser would
have to guess the slug, and the slug names two directories. A guessed slug costs a full run
plus a `rename`; a rejection costs one relaunch. The error lists every problem at once and
carries an example, so that relaunch is the only one needed.

`kind` came out of the shape at first, because the script never read it. That missed
`research-source`, which has no default for the kind and tells the agent to ask, and an agent
inside a workflow cannot. The second audit the same day caught it, and `kind` came back as a
required field: checked against comparison, explainer and walkthrough, and handed to phase 1.
A wrong kind costs a full run, the same argument that makes the slug a launch-time field. Unknown keys are rejected for the same reason the
error lists everything: in an unattended run, a misspelled `question` would otherwise vanish
without anyone seeing it.

## What the 2026-10-13 prompt audit decided for the chain

An agent with no history in the session ran the `claude-api` prompt-audit procedure over
everything reachable from `CLAUDE.md`, against Opus 5.5 for the main session and workflow
agents. (It also assumed a lens pinned to Sonnet 5.5; that pin had gone with 7fc7b57.) It found no dated patterns. It
found contradictions, and the owner decided the ones in the chain and `AGENTS.md`:

- The ship phase keeps the conditional draft from c31fc2e. "Do not mark it ready for review"
  predated that change and contradicted it, and it is gone.
- Lens reports no longer drop what the lens is unsure of.
- Launching the chain counts as the request to push, so the ship agent does not stall on
  "commit and push only when asked".
- A PR that adds a document links the file at its commit SHA on GitHub and gives the `og:url`
  for after merge. (A third-party renderer was used for a day and dropped on 2026-10-14 at the
  owner's request: a link should not depend on a service the repository does not control.)

The audit's skill-side findings were made against skills that `main` had rewritten in the
meantime, so they were dropped rather than ported, and the audit runs again on the current
skills.

## What the second 2026-10-13 audit changed in the chain

The audit ran again on the skills `main` had rewritten. It found no dated patterns. Most of what
it found was the workflow lagging behind decisions the skills had already recorded on
2026-09-30.

**Lens A reads the corrected draft.**
- `research-verify` has A read the draft after B and C's must-fix items are applied, so what A
  finds is what they could not see.
- The chain ran A on the unfixed draft. A pass now applies the items B and C tagged 고쳐야
  before A reads.
- A is told what that pass changed. The first fix round is told not to reapply it.

**`after_last_recheck` is implemented.**
- The skill says a one-answer item found by the last re-check is fixed once more, without a
  further round, and recorded in `run.json`.
- The chain had shipped those items as known defects. It now runs that one fix and records
  them.
- What stays open is what the re-check named as a wrong rejection.

**The lens file owns the report format.**
- Each lens received two formats, its file's and the chain's.
- The chain now adds only what the fix passes sort on: a 고쳐야 / 판단 tag and a confidence
  on each item, plus a 검증하지 못한 것 heading that is never empty.
- Lens A's "report only what blocks the task" went the same way as the earlier filter.

The skill-side edits were smaller:
- duplicates of rules `AGENTS.md` already owns;
- a `history_available` sentence that said more than `check-claims.mjs` enforces;
- lens files that told the chain's lens to hand itself to a subagent;
- trigger text that left out the web corpus most recent documents use;
- one place for the rule that a subagent's quote is a pointer, not a span.

research-doc's evals were rewritten too. The flow-diagram eval had rewarded drawing a failure
loop the pinned source does not contain, and the other two had no expectations.

The new evals ran once each against the skill before and after the revision, scored by a
separate grader: 15 of 18 expectations before, 16 of 18 after. On the flow-diagram eval both
versions reopened the pinned source and declined the loop, and only the revised one cited a
locator for every edge it drew. The revised run missed one thing that both versions' text
shared: it told the reader to delete a hand-written contents rail so the shell would rebuild
it. Twenty-nine of the thirty-one published documents carry a hand-written rail under a
shell that cannot build one, so deleting it empties the rail. research-doc now says so, and
a rerun of that eval passed all five expectations. One run per eval tells you a revision
did not break what these evals check, and nothing about the rest.

## What the 2026-10-13 reader interview changed

After the sentence-level symptoms of the 2026-09-29 diagnosis were gone, the documents still
read badly. The owner was interviewed with real sentences from the recent documents
rewritten along one axis at a time, a reader agent that knew nothing of the harness read the
rendered pages, and the harness was checked rule by rule. The full record is
`docs/harness-doctor-2026-10-13.md`; what changed in the rules is below.

The prose rules are now examples. `prose-ko.md` holds passages the owner chose, a short set of
principles with their reasons, and ✗/✓ pairs. The rules that steered toward the human band
(pronouns, `~들`, the connective-comma rate) are gone, because each revision of them
overshot the other way; `--counts` stays a diagnostic. The old ✓ examples themselves showed
the forms the owner calls machine-written (`압축이 아니라 재작성이다`, `알 수 없다`, a
`Foo 5.0: …` title), and the scaffold stamped every chapter title as `라벨: TODO`, so the
harness had been teaching those forms.

`check-doc.mjs` blocks those forms where they are cheap to fix and rarely legitimate: the
title, `h2` and `.key`, for documents from 2026-10-14. On the three most recent documents
the rule would have caught 23 to 29 titles each. The contrast frame and negative endings
are left to the reader, because a correction of what the reader actually believes is
legitimate and a gate on it moves the form into a neighbour.

Production records leave the body. Retrieval times, archive attempts, hashes and file-count
arithmetic go to the ledgers and the PR body, and the `setup` chapter becomes a short list near
the end. Caveats are stated once in the limits chapter unless one changes what the reader does
at that spot. Outside comparisons come only when `angle` asks.

Verification keeps lens B and `check-claims.mjs`, the parts with an external signal. Lens C
is retired as an agent, its mechanical checks moved to `check-doc.mjs`, and lens A became a
reader test: it reads only the first screen, the titles and the `.key` lines, says what it
took away, then reads the whole and reports where the first pass went wrong and what it could
have skipped. The fix pass before lens A, added earlier the same day for consistency with the
2026-09-30 notes, is gone with it; the two lenses now run in parallel.

The first rewrite of the Meta document under these rules (PR #54) showed the next failure. Its
cover answer ran to fourteen sentences, and a limits chapter walked through the same cases in a
paragraph, a table and paragraphs again. The owner read it as enumeration and pointed at form
rather than wording: parallel items belong in a list, comparisons in a table, a deadlock in a
figure. The interview's preference for unpacked sentences had been about a chain of causes, and
`prose-ko.md` had let it read as a rule for every paragraph, helped by a ✗ example that looked
like it condemned lists. `prose-ko.md` now picks the form by the shape of the content, the
cover answer is three or four sentences with `cover-length` blocking more than five, and lens A
reports parallel items set as prose and content said twice in a chapter.

The sentence cap did what counted caps do here. The second rewrite kept its cover to four
sentences by packing the whole correction path into one of them, and the cover still read as
the mechanism told end to end, overlapping the `tl-dr` points beneath it. `cover-length` now
counts characters without spaces (280; English terms count too) instead of sentences, and `research-doc` says what the cover is for: the
subject, the one thing to understand, the one difference that matters, with the steps left to
the points.


## Why the cover leads with what the subject is and who made the source (2026-10-25)

The owner read the five documents written after `121f868` from their first screens and could
state the answer for one of them. The sentences read well; what was missing was the message.
Covers described the source fact by fact, and the "so what" was left for the reader to infer.
Agent readers inferred it without trouble and reported a clear message for all five, so this
gap does not show up in an agent reading test and is judged by the owner.

The owner also asked for the source's standing: which organization and team produced it, and
what kind of material it is. One of the five said so on its cover.

Two rule versions were tried on the same five ledgers, rewriting only the title and the cover,
and shown to the owner side by side with the original, sides shuffled, without saying which was
new. A conclusion-first cover won 3 of 5. It lost where it opened with advice about a tool the
reader had not met yet, where the first sentence packed five numbers, and where "the author
does X" became "you should do X", which the owner read as the model's own opinion. The second
version said what the subject is first, attributed each judgment, kept numbers out of the first
sentence and moved reading scope out of the source line. It won 4 of 5 on message, standing and
preference. The owner disliked the "X는 …인데, …" joint the second version produced, so the
skill puts what the subject is in a sentence of its own.

Through `skill-creator`, the revised `research-doc` and its pre-change snapshot then rewrote two
covers outside the experiment (one repository, one paper). The revised skill won both. The owner
preferred the snapshot's title on one, which descriptively named what the tool does, so the
title rule stayed as it was.

The team or author behind a source is often absent from the ledger, and a cover cannot name what
the research did not record. `research-source` now records `by` from the source's own pages when
pinning, and `check-doc` requires a `p.src` line on covers dated from 2026-10-25. Measurement
material is in the git-ignored `_scratch/` of the machine that ran it.

## Why the chain is a script and not a workflow (2026-10-25)

The chain ran as a Claude Code workflow. A workflow script cannot run a command, so every
"gates passed", "rendered" and evidence count reached it as a boolean an agent reported; it
cannot resume a finished agent's context, so the fixer was a third context rather than the
author the verify skill assumes; and its resume works within one session, while research here
moves between machines. The official comparison places workflows at dozens to hundreds of
agents per run; the chain ran five to eight, almost in a line.

`scripts/chain.mjs` holds the same sequence over `claude -p`. The script runs check-doc,
check-prose, check-claims, build-index and the renderer itself and records their results; the
author's session is forked for each fix round; lenses run with editing and delegation tools
removed and are handed the required angle; claims are extracted while the lenses run; each call's
cost and session land in `run.json`, which is written on failure too; and the PR opens as a draft
only for a known defect (a confirmed finding left unfixed, a lens that returned nothing), because
under the workflow's rule every run opened as a draft and the owner flipped it to ready seconds
before merging. The workflow script and `docs/workflow-authoring.md` were removed so the sequence
lives in one place.

## Why research is handed to a researcher agent (2026-10-25, supersedes the section above)

The `claude -p` chain lasted one real run. On a web article about sandbox escapes, Opus 5.5's
cyber safeguard flagged the author session and Claude Code fell back to Opus 4.8 with nobody to
choose otherwise; the run died with the session that launched it; nothing showed progress; a
tool call was denied silently; the summed cost double-counted resumed sessions (`total_cost_usd`
is cumulative); and the re-check labelled three meaning errors "wording", so they shipped. Most
of that came from removing the person rather than from any one bug, and the script kept growing
to rebuild what the platform already does (background work, progress, resume, permission
prompts).

The owner works in an interactive session and hands research off from it. Settled with them,
after a survey of research harnesses (coordinators in the main conversation, as Anthropic's
`deep-research` skill and math-proof plugin do; fresh workers everywhere, forks nowhere) and an
independent design pass:

- The `research` skill only launches the `researcher` agent. The researcher is the author and
  runs verification itself; lenses and the re-check are named fresh agents it launches in the
  foreground. Forks inherit the conversation, so none are used.
- Hooks live in the agent definition. Hooks in skill frontmatter register for the whole
  session: a subagent that invoked a hooked skill left its gate on the main session, which was
  then blocked from stopping and began editing files (tested). Agent-definition hooks end with
  the agent (tested).
- No questions until the pull request: decisions go to `decided`, the owner's to `needs_owner`,
  and `scripts/ship.mjs` runs the gates and opens a draft when anything is left.
- The last fix round is re-read too. Re-running the new `recheck` on that run's last round
  caught all three shipped meaning errors for $0.19.

`isolation: worktree` branches from origin/main, not a stale local `main` (tested), and
project agents' hooks need the folder's workspace trust.

## Why `research-source` no longer prescribes retrieval routes (2026-10-26)

The skill listed `WebFetch`, `gh` and `git clone` as primary routes and the `insane-search`
plugin as the fallback for 403 / 402 / bot-wall / paywall. The owner removed the route block
and uninstalled the plugin, keeping only requirements on the outcome.

On 2026-10-25 a fresh `claude -p --safe-mode` session (no plugins, skills, hooks or CLAUDE.md,
no hint about techniques, tools limited to WebFetch, WebSearch, Read, Write and curl) was given
the 25 X, Reddit and Threads post URLs past documents used, plus the OpenAI page that once
needed `insane-search`. It retrieved all 26 in 11 minutes and found the routes itself:
`api.fxtwitter.com` for X, Reddit `.rss` with a retry on 429, the third-party proxy
`fixthreads.seria.moe` for Threads, `r.jina.ai` for the 403 page. Where the retrieved scope
matched, the text matched the quotes in `evidence.jsonl`. Threads long posts and replies came
back incomplete, and the `insane-search` engine came back just as incomplete on the two of
those posts it was tried on; past documents got those through headless-browser rendering. About 15 of 62 tool calls were trial and error.

Two findings became the outcome requirements that stayed. `WebFetch` returned reworded Threads
text; the session discarded it only because it had been told to save retrieved text, and a
paraphrased fixed copy would pass `check-claims.mjs` since quotes are taken from it. So
`notes/web/<id>.txt` must be the served text. And the working routes include third-party
relays, whose text can differ from the original, so the `sources.jsonl` entry records what the
text came through. The failure paragraph stayed as section 4, retitled, so the later section
numbers, which `research-doc/references/paper.md` cites, did not move.

## Why the chain runs the same way on Claude Code and Codex

The owner asked for the same research report from either harness (2026-10-26), with no change that has to
be made in two places. How each concept maps onto each
harness, and what to recheck when one of them changes, lives in `docs/harness-parity.md`.

- **Instructions sit in the cross-client location.** `.agents/skills/` is the Agent Skills convention for
  sharing between clients; Codex reads it natively, and Claude Code reads it through `.claude/skills/<name>`
  links, which its documentation supports. Frontmatter keeps to the standard fields. Moving the files
  changed Claude's behaviour in one place: "wait for both reports" let Claude start the lenses in the
  background once in two runs; naming the foreground restored it (3/3).
- **Agent definitions and hooks have no common format,** so each harness keeps a definition of settings
  plus one sentence pointing at the shared body. `check-harness.mjs` refuses any other sentence there, so a
  role's behaviour is written once.
- **Codex gets its researcher from a config profile and a launcher.** Its subagents inherit the caller's
  working directory and permissions, and a trusted project config would load in every Codex session, so
  the researcher is a session opened with the profile. Its sandbox keeps a linked worktree's gitdir
  read-only unless that exact path is granted, which is known only after the worktree exists.
- **Shipping fails closed on the procedure, not only on the result.** Each lens needs a start and a
  completion paired within this run, the two lenses have to overlap, and each lens's last reading has to be
  of the current document unless a recheck read it. Independent reviews found three inputs (completion
  without start, lenses one after another, one lens on an older draft) that had passed as a normal pull
  request. The researcher cannot edit the records through its tools; a shell can still forge them, which
  the chain does not defend against.
- **A model switch that is seen stops shipping; one that cannot be seen does not make a draft.** Neither
  harness gives hooks the model a subagent actually ran on. Claude's transcript and Codex's own SQLite log
  are read as auxiliary observations, each isolated with a removal condition, and the pull request says
  how many actors were observed rather than claiming no switch. Codex's official `model/rerouted` event
  exists only on its app server.

## 설명을 보존하고 독자 판정을 출고에 반영한 수정 (2026-11-04)

소유자는 Codex 산출물의 연구 관점과 한국어 설명이 미숙하다고 지적하고, 실증 자료와
HTML·시각화 스킬을 검색해 체인을 고치도록 요청했다. 검색은 요청대로 GPT-6.1 Sol의
별도 맥락 둘에 맡겼다. 아래는 체인 유지보수 조사이며 새 발행 문서가 아니다.

### 확인된 충돌과 수정

한국어 지침은 연결된 설명을 권했지만 `check-doc`의 본문 목록에는 설명 문단이 없었다.
`research-doc`은 문장 전에 board를 고르고 주장마다 장을 나누도록 했고, `recheck`는
원문과 뜻이 같으면 읽히는지를 검토 대상에서 제외했다. 따라서 인용이 맞는 카드와
주석은 남아도 그 사이의 이유가 사라질 수 있었다. 이 충돌은 Claude와 Codex 공용이다.

설명 문단을 본문으로 허용하고, 장의 질문에 답하는 주장·이유·사례를 함께 둔다.
조사 뒤에는 근거 id와 결론 사이의 논리 및 대안 해석을 짧게 정리한다. 그림은 설명할
관계를 정한 뒤 고르며 조건부 흐름을 일렬 화살표로 대신하지 않는다. 재검토도 수정한
설명이 독자 과업을 막는지 다시 읽는다. 모델, effort, agent 수는 바꾸지 않았다.

후속 검토에서 소유자는 “ASD-STE100 를 따르라는건 문장의 서술이 길어지지 않도록 하기
위함이야 한국어랑 상관없잖아”라고 지적했다. 이를 한국어에 맞지 않는 지침으로 해석해
교체한 것은 잘못이었다. ASD-STE100 준용을 복원하고, 짧은 문장·한 문장 한 진술을
유지하면서 문장 사이의 인과 연결을 보존하도록 명시했다. 연결된 설명을 허용하는 것과
문장 길이를 늘리는 것은 별개의 결정이다.

### 외부 근거의 범위

| 자료 | 실제 확인된 것 | 여기서 채택한 부분과 한계 |
|---|---|---|
| [Linderholm 외, 2000](https://doi.org/10.1207/S1532690XCI1804_4), pp.530–541, Tables 2·4 | 영어 역사 텍스트의 인과 단절·암묵적 목적을 고친 인간 독해 실험. 대학생 39명. 어려운 글의 정답 수가 12문항 중 6.75에서 8.63으로 증가(p<.01), 쉬운 글은 전체 문항 개선 없음 | 빠진 이유와 목적을 보완하고 이해 과제로 확인한다. 짧은 영어 글의 결과를 한국어 기술 문서 효과로 일반화하지 않는다 |
| [STORM v2](https://arxiv.org/html/2402.14207v2), §5.2·§6, Table 6 | 영어 Wikipedia형 글 20개 주제를 편집자 10명이 평가. oRAG 대비 조직성 평균 3.25→4.00(p=.005), 4점 이상 비율 45→70%. 커버리지 차이는 p=.084, 검증가능성은 동일 | 여러 관점의 질문에서 근거를 모아 개요를 종합하는 방법을 참고한다. 관점 수나 agent 수 증가의 효과를 입증한 것으로 읽지 않는다. 개별 사실 사이의 관계를 지어낸 실패도 보고됨 |
| [DeepResearch Bench v1](https://arxiv.org/html/2506.11763v1), §4.3, Table 2 | 중국어 50과제에서 인간 쌍별 선호와의 일치가 직접 채점 58.89%, 참조 보고서·과제별 기준을 쓰는 RACE 71.33% | 소유자가 승인한 예시와 전후 비교하는 평가를 후보로 삼는다. 평가자 일치도의 결과이며 생성 문서나 독자의 이해가 개선됐다는 실험은 아님 |
| [국립국어원 쉬운 공공언어 쓰기 길잡이](https://korean.go.kr/common/download.do?c_file_name=901b4032-ae19-4457-87b7-e0f61c04378e.pdf&file_path=etcData&o_file_name=guide.pdf), 인쇄 17–19쪽 | 문장 성분의 호응, 과도한 생략, 명사 나열과 번역투를 다루는 작성 지침 | 한국어 문장 편집의 참고. 효과 실험이 아니며 개발자가 쓰는 English 기술 용어를 일괄 번역하는 규칙은 가져오지 않음 |

### HTML·디자인 스킬 비교

소유자의 추가 기준에 따라 실험·벤치, 유의미한 평가·사용 사례, 또는 널리 채택된 저명한
프로젝트라는 근거가 있는 것만 차용 후보로 남긴다. 공개 코드가 있다는 것만으로 채택하지
않는다. 2026-11-04 GitHub API로 조회한 별 수는 아래 표와 같다. 묶음 저장소의 별 수는
개별 스킬의 평가가 아니며, 어느 별 수도 독해 개선의 실증을 대신하지 않는다.
열어 본 스킬에서 한국어 연구 문서의 독해 개선을 실증한 결과는 찾지 못했다.
설치하거나 원문 코드를 복사하지 않았다.

| 후보 | 채택 규모·평가 근거 | 판정과 차용 범위 |
|---|---|---|
| [STORM](https://github.com/stanford-oval/storm) | 31,784 stars, 위의 편집자 비교 평가 | 조사 질문과 개요 종합의 우선 후보. 검증가능성 향상으로 확대하지 않음 |
| [Anthropic frontend-design](https://github.com/anthropics/skills/blob/ca45fc49/skills/frontend-design/SKILL.md) | 공식 skills 묶음 187,023 stars, [전후 데모](https://claude.com/resources/articles/improving-frontend-design-through-skills) | 시각 계층·완성 화면 재평가 후보. 미감 데모를 독해 효과로 간주하지 않음 |
| [visual-explainer](https://github.com/nicobailon/visual-explainer/blob/3d592add/plugins/visual-explainer/SKILL.md) | 10,769 stars, 실행 [queue 예제](https://github.com/nicobailon/visual-explainer/blob/3d592add/examples/replay-job-queue.html)와 공개 A/B 절차 | 조건 분기·재시도 표현만 부분 후보. 텍스트를 캡션으로 제한하는 규칙은 제외. 평가 절차를 결과로 부르지 않음 |
| [K-Dense scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) | 묶음 55,963 stars, critical-thinking·scientific-writing 원문 확인 | 근거와 해석, 교란요인 검토의 참고 후보. 소개문의 사용 인원·validated 주장은 독립 검증 자료로 세지 않음 |
| [frontend-slides](https://github.com/zarazhangrui/frontend-slides/blob/9906a34d/SKILL.md) | 31,813 stars, 실제 template | 알려진 후보지만 도입 보류. 고정 stage 축소 방식이 모바일 장문 읽기에 부적합 |
| [GPT Researcher](https://github.com/assafelovic/gpt-researcher) | 30,466 stars, [역할별 구현 문서](https://docs.gptr.dev/docs/gpt-researcher/multi_agents/langgraph) | 구현 비교 후보. agent를 더 두면 품질이 오른다는 근거로 삼지 않음 |
| [Open Deep Research](https://github.com/langchain-ai/open_deep_research) | 12,681 stars, 조회 당시 archived | 연구 질문·수집·집필 분리의 참고 구현. 새 runtime 도입은 보류 |
| [html-artifacts](https://github.com/joshuadavidthomas/agent-skills/blob/516dee7a/html-artifacts/SKILL.md) | 묶음 62 stars, 독립 평가 미확인 | 차용 후보에서 제외. 목적 적합성만으로 우선 후보라던 초기 판단을 철회. 산문 복원은 위의 독해 연구와 저장소 자체의 규칙 충돌에 근거함 |

[Assertion–Evidence 실험](https://peer.asee.org/17510.pdf)은 동일한 녹음 설명에 서로 다른
슬라이드를 붙인 MRI 학습 실험이다. 일부 복잡한 개념 문항에서 차이가 있었지만,
설명자 없는 한국어 HTML에서 산문을 없앨 근거로 쓰지 않는다.
플러그인 검색에서 Scite(인용 맥락), Firecrawl(수집)을 찾았으나 이 작업의 병목은 설명과
평가이므로 연결이나 설치를 요구하지 않았다.

### 이번 검증과 남은 검증

수정 전후 reader 지침을 별도 맥락에 주고 같은 PR #47의 문서
`ddd24f8908caada59eb7b6fd04d534cfc19438b6`을 읽혔다. 목적·질문과 같은 렌더 디렉터리를
주었고 기존 run/verify 기록과 수정 diff는 금지했다. 문서 SHA-256은
`4d2dc4af3648fbe00cb35edddfd32f713b2cc0e06c31b8075145b5af7be12721`이다.

둘 다 조건부 trial을 설명하고 7장의 선형 그림 및 제작 이력 노출을 지적했다.
기존 지침은 그림 수정을 고쳐야 할 항목으로, 후보 지침은 판단 항목으로 분류했다.
후보는 구체적 trial/hold 사례와 본문 위치를 제시했지만 `pass`로 판정했다.
따라서 **검토 성능 개선은 확인하지 못했다**. 이 결과 뒤, 도입 선택뿐 아니라 요청에
포함된 중심 메커니즘도 시연하고 남은 설명 장애를 판정에 반영하도록 문구를 보완했다.
이 마지막 문구는 새로운 독립 시험을 거치지 않았으므로 효과 미확인이다.

기계 검증은 설명 문단 허용·빈/접힌 본문 차단과 이해 장애의 draft 처리를 시험한다.
초안에서는 readerCheck 필드도 요구했지만 아래의 지침 감축 검토에서 철회했다.
이해 장애 분류는 작성자가 검토자의 판단을 옮긴 것이어서 내용의 진실성이나 소유자의
만족을 보증하지 않는다. 가상의 작업 큐 견본을 1280·390으로
렌더하고 두 화면을 직접 보았다. 외부 HTML 스킬의 예제는 소스만 읽었다.

새 문서를 두 harness에서 끝까지 작성해 비교하거나 사람의 이해도를 측정하지는 않았다.
소유자가 승인한 설명 예시를 기준으로, 같은 원장과 질문의 수정 전후 문서에 독해 과제를
적용하는 것이 다음 실증이다. 그 결과 전까지 이 변경을 품질 해결로 부르지 않는다.

### Claude 회귀 위험

공용 파일을 읽는다는 것은 변경이 양쪽에 적용된다는 뜻이며, 같은 품질을 보장한다는
뜻은 아니다. 실제 Claude에서 수정 전후 집필·검토를 비교하지 않았다. 특히 다음은
배포 전에 확인해야 한다.

- 설명 문단 허용과 장 분할 기준 변경으로, 기존 Claude 문서가 유지하던 간결함과
  시각적 구조가 약해질 수 있다. ASD-STE100 복원만으로 이 위험이 사라지지는 않는다.
- readerCheck 필수화는 기존 필드 없는 run을 draft로 만들기 때문에 철회했다. 새 필드가
  없다는 이유로 상태를 바꾸지 않음을 두 harness fixture에서 확인했다. 명시적으로 남긴
  이해 장애를 draft로 만드는 변경은 유지한다.
- 재검토 범위 확장은 소요 시간과 수정 횟수를 늘릴 수 있다. 기존 반복 상한은 유지한다.

정적 정의 일치와 hook 시험은 설정·절차만 확인한다. 검토 당시 변경은 미커밋 로컬 수정안이었으며,
Claude의 출력 품질·실행 비용에 회귀가 없다는 판정을 받지 않았다.


### 불필요한 지침 감축과 Sonnet 검토 (2026-11-04, 위 수정안의 후속 정리)

소유자는 기존 지침 자체가 과한지 살펴보고, 중간마다 Claude Sonnet의 검토를 받으라고
요청했다. 아래는 구현된 변경이며 효과가 검증된 문서 제작법이라는 주장은 아니다.

| 덜어낸 제약 | 판단 근거 | 남긴 요구 |
|---|---|---|
| board를 문장보다 먼저 선택 | 설명을 완성하기 전에 배치를 고정한다. 한국어 설명 지침과 충돌 | 설명할 관계에 맞춰 글과 그림을 함께 만든다 |
| 주장 두 개면 무조건 장 분리 | 주장을 뒷받침하는 이유·사례까지 분리될 수 있다 | 독립 주장만 분리한다 |
| 외부 비교를 한 장에 모으기 | 비교가 필요한 주장과 근거를 떨어뜨린다 | 필요한 위치에 비교를 둔다 |
| explainer 사례에 숫자 필수 | 정성적 메커니즘에도 불필요한 수량을 요구한다 | 실제 사례와 조건을 설명한다. 수치는 필요할 때 쓴다 |
| 원문의 중심 그림을 반드시 언급 | 독자 질문과 관계없는 그림까지 요구한다 | 질문에 답할 때 포함한다 |
| 모든 도식에 좌표 금지 | 같은 파일이 허용한 inline SVG와 충돌 | board는 셸 좌표를 쓴다. 다른 모양은 접근성·렌더 검사를 갖춘 SVG 허용 |
| 새로 제안한 산문 우선 완성·synthesis.md 필수·readerCheck 필수 | 이 순서와 추가 산출물의 효과는 미확인이다. readerCheck는 이전 run까지 draft로 만든다 | 기존 notes에서 근거와 해석을 종합하고, 독자 과업 시연은 검토 응답에 남긴다 |

ASD-STE100의 짧은 문장, 수치·인용의 출처 확인, 고정 원장, 독립 검토와 반복 상한은
유지한다. 읽기 결함의 분류는 기존 미해결 항목에 기록한다. 새로 강제하는 기록 파일은 없다.

Paseo의 Claude Sonnet 5.5(high)에게 실제 작업 diff를 읽게 했다. 첫 검토는 reader의
“그림으로 바꿀 문장” 규칙과 설명 보존 규칙의 충돌을 지적했다. 이유·전이·조건 설명은
남기도록 정리했다. 검토 기록 파일명 고정도 풀고, draft 조건의 모호한 문구와 harness 문서의
소제목 위치를 고쳤다. eval에서 빠졌던 “메커니즘은 접지 않음”과 제목 형식 확인은 복구했다.
자기 보고한 impact만으로 독해를 보증하지 못한다는 지적은 남은 한계로 유지한다.
이 검토는 Claude 실행 환경에서 수행한 코드·지침 검토다. 실제 Claude 연구자에게 새 문서를
끝까지 쓰게 한 전후 비교를 대신하지 않는다.

후속 요청은 글 리뷰가 아닌 Claude 하네스·스킬셋 호환 확인이었다. 같은 Sonnet에게
범위를 좁혀 다시 맡겼다. 공유 링크·본문 참조·frontmatter는 호환되고, hook의 보호 창과
검토 상한도 새 지시와 충돌하지 않는다고 보고했다. 임시 fixture에서 설명 문단과 SVG를
check-doc·check-prose·doc-text·render로 확인했고 390px 화면을 직접 열었다. 실제 연구자의
새 지침 준수와 실제 draft PR 생성은 시험하지 않았다. 이후 설명 문단 견본은 1280/390의
라이트·다크 렌더까지 통과했고, 다크 화면 두 장도 직접 보았다. 미커밋 변경이 origin/main에서
갈라지는 연구 worktree에 적용되지 않는다는 점도 확인했다.

디자인은 `_scratch/chain-quality/design-comparison.html`에 동일한 가상 큐 사례를 두
배치로 구현했다. 카드형과 설명·분기형을 전환하고 기록 유무에 따른 경로를 선택할 수 있다.
본문 조건은 클릭 없이도 읽힌다. 외부 자원 없이 동작하며 JS를 꺼도 두 배치가 보인다.
1280/390에서 양쪽 배치와 모든 상태, 가로 넘침, JS 오류를 검사했다. 설명·분기형의
두 너비와 카드형 데스크톱 스크린샷을 직접 보았다. 현재 발행 셸에 이 배치를 강제하지
않으며, 시안의 독해 우위를 입증한 실험도 아니다.


### 격리한 OpenCodeReview 재조사와 교체 결정 (2026-11-04)

소유자의 요청으로 새 Sol high 연구자를 실행했다. 이전 발행물·원장·검토 기록과 root
발행 목록은 sparse checkout에서 제외했다. 새 thread에 이번 요청만 전달하고 수정된
skill·셸·검사·출고 코드의 사본을 적용했다. 감독자는 연구자와 검토 세션의 도구 입력을
감사했고 과거 본문을 연 호출을 찾지 못했다. git 객체 접근까지 기술적으로 차단한 격리는
아니며, 이 실행에서의 작업공간 제한과 지시 및 호출 기록 감사다.

[PR #48](https://github.com/kywoo26/research-library/pull/48)은 공식 코드
`abb7abcd5c5196fa0278dc87db85780fa269562f`(v1.13.5)와 arXiv:2608.09290v2를 고정했다.
최종 문서 SHA-256은 `25656e885b3ecbe30a60d4a14cdb7b620d23a37e84b3f112c50e22598eac947a`다.
두 lens는 병렬로 읽었고, 수정 뒤 recheck를 마쳤다. ship 및 종료 hook의 check-doc,
check-prose, check-claims가 통과했다. runtime 변경은 문서 PR에 들어가지 않았다.
실제 모델 리뷰와 benchmark는 실행하지 않았다. 서버 모델 관측 기록은 비어 있다.

소유자에게 결과를 전달한 뒤 PR #47과 #48의 본문과 1280/390 렌더를 비교했다. 새 문서는
그룹핑 분기, 도구 루프와 리뷰 pass, 위치 이동 및 후보별 유지·삭제 사례를 따라갈 수 있다.
실측 그래프는 precision·recall과 토큰 사용량의 차이를 보여 준다. 표지의 주의사항 중심
설명, 한 문장에 몰린 조건, 그래프의 불명확한 “상대” 표기, 모바일의 긴 카드 목록은
개선할 부분으로 남았다. 이전 문서는 도입 비교이고 새 문서는 원리 해설이며 원문 판도
다르므로, 이 결과를 지침 수정만의 효과를 분리한 실험으로 부르지 않는다.

소유자는 이 평가 뒤 “기존 리서치 삭제후 새로운 리서치건으로 반영”하고 “변경사항부터
머지”하라고 요청했다. 체인 변경을 먼저 반영하고, 이전 문서·원장을 새 문서·원장으로
교체한다. 과거 PR과 git 이력은 검증 경위로 남긴다.
