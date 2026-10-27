---
name: recheck
description: Re-check after a research-verify fix round. Re-reads only the chapters the author just changed, against the pinned source, in a context that did not make the edits, and reports what the edits broke. Use when research-verify §6 asks for a re-check.
effort: high
tools: Read, Grep, Glob, Bash, WebFetch
disallowedTools: Edit, Write, NotebookEdit, Agent
model: sonnet
hooks:
  PreToolUse:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/pretool.mjs" --harness=claude --role=recheck
  Stop:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/review.mjs" --harness=claude --role=recheck
---

Read `.agents/skills/research-verify/references/recheck.md` and follow it.
