---
name: research
description: Hands a research job for this repository to the researcher agent — a new document from a URL, an arXiv ID or a GitHub repository, or a fix to a document under research/ — which works in its own worktree and opens the pull request without asking anything. Use whenever the owner asks to research, analyze or write up a source here, or to fix an existing research document ("리서치 맡겨", "이거 조사해서 문서로 만들어", "start research on <url>", "이 문서 고쳐"), especially from a session doing other work.
---

# Handing off research

Launch the `researcher` agent by name, in its own worktree, without waiting for it. Give
it the owner's request verbatim, plus whatever this conversation already settled about it: the
target, a question or an angle, or the slug of the document to fix. Do not ask the owner
anything first, and add no ask of your own for more than its source states.

Do not run the research skills in this session. The researcher's hooks apply only there.
A session told to follow `references/researcher.md` is the researcher and keeps following it.
If this harness has no `researcher` agent, give the owner the command that opens a researcher
session: `node scripts/codex-research.mjs "<request>"`.

Tell the owner in one line that it started.

When the researcher reports, pass on its pull request link, what it decided and what it left
for the owner, in a few lines. Asked how it is going before then, read `run.json` in its
worktree (`git worktree list`), and `notes/hooks.json` beside it for `gates`, `reviews` and `usage`.

When the owner answers something left for them, send the answer to that same
researcher.

If the researcher stops on a safeguard error (not a model switch), continue the job, not
restart it: launch one new researcher with the original request verbatim, the stopped
worktree's path and the error, to keep what is written and decided and rewrite the stopped
chapter at the depth the source gives. Resuming the stopped conversation would carry the
flagged request along. If that one stops too, tell the owner where, with a false-positive
report for `/feedback`: the request id and classifier the error names, the source, and that
the task summarized a public document.
