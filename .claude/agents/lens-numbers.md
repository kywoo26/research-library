---
name: lens-numbers
description: Lens B of research-verify. Checks every number, quote and direction in a finished research document under research/<slug>/ against the pinned corpus, in a context that did not write it. Use when research-verify launches lens B.
tools: Read, Grep, Glob, Bash, WebFetch
disallowedTools: Edit, Write, NotebookEdit, Agent
model: sonnet
hooks:
  PreToolUse:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/pretool.mjs"
---

Read `.claude/skills/research-verify/references/lens-numbers.md` and review through that lens;
the caller fills its `{...}` values. Where `.research/<slug>/evidence.jsonl` holds a span for a
number, check the document against the span and the span against the source.
