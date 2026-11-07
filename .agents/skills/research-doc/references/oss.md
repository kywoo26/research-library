# Documenting an open-source project

How the chapters get filled when the corpus is a repository. Read `prose-ko.md` and
`visual.md` alongside this; the reader is defined in `../SKILL.md`. Take from the table what
the plan's asks need.

## What a repository offers the chapters

| Chapter | What goes here |
|---|---|
| purpose | What the project is for, who made it and why: the problem it removes, from its README, docs and announcements |
| structure | The parts and how they relate: packages, what each holds, where state lives, what talks to what. Draw it (`visual.md`) |
| how it works | The path a request or a build takes, explained in prose with the structure diagram beside it; a `<pre>` trace when the owner needs the code path itself |
| comparison | The alternatives a practitioner would otherwise use, by name |
| evidence | What the project measured or claims, marked as self-reported, and what you ran yourself |
| reception | Issues, reviews and community discussion, checked against the code |
| adoption | Only when the request asks whether to use it: the checks below |
| sources | Commit, files read, directories not opened and what that costs the document |

## Compression subagents

Some sources do not fit: one request path can cross files of hundreds of KB. Measure before
opening anything:

```bash
git -C <checkout> ls-tree -r -l <commit> -- <paths> | awk '{s+=$4} END {print s}'
```

Loading all of it leaves nothing to write with, and every later citation then comes from
the weakest part of the window. Hand it to a subagent:

```
in    the paths to trace, plus the pinned identity
out   notes/mechanism.md, roughly 4K
      each hop described, with a verbatim quote of 40+ chars and a file:line locator
```

**Ask the subagent for extraction and quotes, never for a conclusion.** One that reports
"the README contradicts the code" hands you a finding you did not verify and will probably
ship; one that reports quotes and locators hands you material you can check. Write the trace
chapter from the notes and reopen the file whenever a sentence needs more than they hold.
A quote from the notes goes into `evidence.jsonl` only after you reopen it at its locator:
the span is yours to take, and the note is a pointer to it.

## A trace, when the owner needs the code path

A traced request path is what a reader cannot get without opening the repo. Each hop needs a
verbatim quote of 40+ characters and a `file:line` locator at the pinned commit, kept in
`evidence.jsonl` and the fold; the gate checks the quote sits at the locator. The visible
chapter explains the path in Korean and points at the diagram.

Pick a path that **ends inside one process boundary**; crossing packages means one subagent
per hop, stitched together by you. Too narrow is a single-function trace that teaches
nothing, and too wide is a grand traversal with invented middle steps, which is worse
because it is confidently wrong. Both pass every gate.

A failure to avoid: because the source is already text, `<pre>`, tables and identifiers absorb
everything and the document never draws the architecture. A kernel, a state machine, a data
model and a retry loop all have shapes (`visual.md`).

**Write locators relative to the repository root.** Verification runs
`git show <commit>:<path>`, so when the interesting code sits several levels down, the path
you have been reading is not the path that resolves: `sub/pkg/src/thing.ts:806`, not
`src/thing.ts:806`. Rewrite them from the root before they reach the document.

## Adoption, when the request asks: what a developer checks

- License. Read the `LICENSE` file; the badge and the GitHub API field are not enough. An API
  value of `NOASSERTION` or "Other" usually means the file carries a preamble the classifier
  could not parse, and the preamble is where carve-outs live ("third-party components keep
  their original license, everything else is AGPLv3"). Adoption turns on which parts fall
  under which license, and only the whole file answers that.
- Maintenance vitality: commit frequency, contributor spread, release cadence. A shallow
  clone does not hold these numbers, so asserting them is invention. The gate blocks them
  only when the claim is filed as `kind:"history"`, and issue response time is in no
  checkout at any depth.
- Dependency risk: a vendor API, a runtime version, a paid service.
- Extension points: where you have to cut when requirements drift slightly.
- Tests and release discipline: whether tests exist, what they cover, whether releases are
  regular.
- What installing it leaves behind: config files edited, hooks injected, dependencies
  installed, outbound calls made, files written outside the repo, and whether anything
  removes them. A defensible side effect still belongs in the document.
- Reversibility: what backing out requires.

An adoption answer missing these cannot support the decision, however well it explains the
architecture.

## Identity comes out of structure

Read a project's intent off artifacts and cite them: the license, the CI gates, the rules it
writes for its own contributors, the disclaimers, and what it explicitly refuses to do.
Each is a file, and a claim about intent with no file behind it is a guess.

## Limits specific to reading code

**When a claim leans on what another function does, open that function.** The common failure
is assuming a callee lacks a behavior it implements because you read only the caller.

**Reading code tells you how it is written and nothing about what happens at run time**, so
asserting runtime behavior from source checks the README against the README. Constrain the
sentence to what you have:

```
✗ 릴레이가 끊기면 자동 재접속한다
✓ 재접속 로직이 relay/src/reconnect.ts:88 에 있다. 백오프는 고정 1s 다.
  이 경로의 테스트는 찾지 못했다 (grep -rn 'reconnect' **/*.test.ts → 0건)
```

The second is shorter on confidence and longer on use. An absence claim has no line to
cite, so its evidence is the search that came back empty, recorded as a command someone can
re-run. A sentence sourced from the project's own docs claims what the maintainers wrote, so
phrase it that way or open the implementation and source it there.

## README against code

Report a discrepancy where adoption rests on it. **Name the handful of things the decision
turns on and check only those.** Asked in general whether the docs match the code, you will
flag nearly everything, and a report that flags everything says nothing.

## What was read, in the sources chapter

```
커밋 <sha> 의 코드를 읽었다. <N>개 파일 중 <M>개를 열었고, <디렉터리> 는 열지 않아서 <몇 장>의 설명은 그 경로를 빼고 한 것이다.
shallow clone 이라 커밋 이력은 보지 않고 코드만 읽었다.
```

The clause naming the chapter carries the information; an unread directory named without
its cost to the document is filler.
