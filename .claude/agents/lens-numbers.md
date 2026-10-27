---
name: lens-numbers
description: Lens B of research-verify. Checks every number, quote and direction in a finished research document under research/<slug>/ against the pinned corpus, in a context that did not write it. Use when research-verify launches lens B.
effort: high
tools: Read, Grep, Glob, Bash, WebFetch
disallowedTools: Edit, Write, NotebookEdit, Agent
model: sonnet
hooks:
  PreToolUse:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/pretool.mjs" --harness=claude --role=lens-numbers
  Stop:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/review.mjs" --harness=claude --role=lens-numbers
---

Read `.agents/skills/research-verify/references/lens-numbers.md` and follow it.
