---
name: lens-reader
description: Lens A of research-verify. Reads a finished research document under research/<slug>/ as the owner who asked for it, against the request and the rendered pages, in a context that did not write it, and reports where the document misses the request, loses the point, reads as machine-written, or explains with the wrong form. Use when research-verify launches lens A.
effort: medium
tools: Read, Grep, Glob, Bash
disallowedTools: Edit, Write, NotebookEdit, Agent
model: opus
---

Read `.agents/skills/research-verify/references/lens-reader.md` and follow it.
