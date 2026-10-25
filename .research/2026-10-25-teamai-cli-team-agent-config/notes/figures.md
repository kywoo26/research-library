# figures (r1 @ 13c891e)

- `assets/use-cases.png` (README 「Why TeamAI」, alt "Eight everyday scenarios, before and after TeamAI"): 2840x2002 PNG. 여덟 장면의 Before / After TeamAI 대비. 장면 제목: New team member onboarding / Consistent output and standards / Share best practices across the team / Learn from real experience / Use any agent, keep the same team skills / Configure once, run everywhere / Turn postmortems into action / Measure and improve. 수치 없음. README 의 중심 그림.
- `docs/product-overview.md:21-25` 「How it flows」 ASCII 흐름: `teamai push → branch + PR → review and merge` 다음 줄 `SessionStart hook → teamai pull → each AI tool`.
- `docs/product-overview.md:29-43` 팀 저장소 자산 위치 표 (skills/<name>/SKILL.md, rules/*.md, claudemd/*.md, agents/<name>.yaml, culture.md, env/env.yaml, hooks/hooks.yaml, mcp/mcp.yaml, models/models.yaml, teamai.yaml packages, docs/, learnings/, teamwiki/).
- `src/providers/types.ts:7-14` ASCII: Caller(init/push/remove) → getProvider(config) → GitProvider → cloneRepo / createPullRequest / authenticate.
- `src/mr-hint.ts:10-25` ASCII: SessionStart hook → mr-hint → 최근 merged MR 목록 → additionalContext.
