---
name: lens-reader
description: Lens A of research-verify. Reads a finished research document under research/<slug>/ as its intended reader, in a context that did not write it, and reports where the reader loses the point or cannot act. Use when research-verify launches lens A.
effort: high
tools: Read, Grep, Glob, Bash
disallowedTools: Edit, Write, NotebookEdit, Agent
model: sonnet
hooks:
  PreToolUse:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/pretool.mjs" --harness=claude --role=lens-reader
  Stop:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/review.mjs" --harness=claude --role=lens-reader
---

Read `.agents/skills/research-verify/references/lens-reader.md` and follow it.
