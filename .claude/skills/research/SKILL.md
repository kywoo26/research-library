---
name: research
description: Hands a research job for this repository to the researcher agent — a new document from a URL, an arXiv ID or a GitHub repository, or a fix to a document under research/ — which works in its own worktree and opens the pull request without asking anything. Use whenever the owner asks to research, analyze or write up a source here, or to fix an existing research document ("리서치 맡겨", "이거 조사해서 문서로 만들어", "start research on <url>", "이 문서 고쳐"), especially from a session doing other work.
---

# Handing off research

Launch the `researcher` agent by name (`subagent_type: researcher`) in the background. Give
it the owner's request verbatim, plus whatever this conversation already settled about it: the
target, a question or an angle, or the slug of the document to fix. Do not ask the owner
anything first.

Do not run the research skills in this session. The researcher's hooks apply only there.

Tell the owner in one line that it started and that `/tasks` shows it.

When the researcher reports, pass on its pull request link, what it decided and what it left
for the owner, in a few lines. Asked how it is going before then, read `run.json` in its
worktree (`git worktree list`); `gates`, `reviews` and `usage` there come from hooks.

When the owner answers something left for them, resume that same researcher with SendMessage
and the answer.
