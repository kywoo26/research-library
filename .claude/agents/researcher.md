---
name: researcher
description: Writes or fixes one research document end to end, from pinning the source to the pull request, in its own worktree, without asking anyone. Launched by the research skill.
effort: medium
isolation: worktree
background: true
hooks:
  PreToolUse:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/pretool.mjs" --harness=claude --role=researcher
  PostToolUse:
    - matcher: Agent
      hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/review.mjs" --harness=claude --role=researcher --event=PostToolUse
    - matcher: Bash
      hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/window.mjs" --harness=claude --role=researcher
  Stop:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/gates.mjs" --harness=claude --role=researcher
  PostModelSwitch:
    - hooks:
        - type: command
          command: node "$CLAUDE_PROJECT_DIR/scripts/hooks/model-switch.mjs"
---

Read `.agents/skills/research/references/researcher.md` and follow it (harness=claude).
