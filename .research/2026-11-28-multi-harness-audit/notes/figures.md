# 출처 그림과 표

- local docs/harness-parity.md: 공용 규칙에서 Claude/Codex 어댑터로 가는 Mermaid 구조도. 현재 등록 파일/launcher/hook 코드를 대조했으며 본문 그림은 이번 추적으로 다시 그린다.
- c-skills §Choose where skills load: enterprise/personal/project/plugin 위치 표. .agents 직접 발견을 Claude 계약으로 읽지 않는다.
- c-memory §AGENTS.md: CLAUDE.md 존재 여부에 따라 fallback하는 표. 본문에서 조건을 비교표로 옮긴다.
- x-multi §Custom agent file schema: 필수 name/description/developer_instructions, parent permissions/provider/MCP 상속. 권한 비교의 근거.
- x-hooks §Tool coverage: shell/unified exec/apply_patch/MCP/local function 및 hosted 도구 예외 표. 본문 핵심 계약 표로 축약하며 전 도구 통제라고 말하지 않는다.
- sp skills/subagent-driven-development/SKILL.md: Graphviz workflow. task별 implementer와 review/fix loop, 전체 branch review를 보여 준다. 본 문서는 연구 검토 구조를 설명하므로 원 그림 전체를 붙이지 않는다.
- sp docs/porting-to-a-new-harness.md: capability checklist와 A/B/C bootstrap 경로 표. vendor bootstrap 하나를 모든 host에 강제하지 않는 비교의 근거.
- vs src/agents.ts: 그림 없이 agent path registry와 코드. canonical skill→host 경로를 직접 도식화한다.
- oc services/site/src/docs/content/{agents,skills,plugins}.mdx: config 예와 directory tree. 추적한 model/permission 경로는 코드 기반으로 직접 그린다.
- bmad v7 docs-site/src/diagrams/{planning-skills,build-run,bmad-delivery-loop}.svg: 문서 개발 workflow 그림. 설치/host 동등성 그림은 아니므로 감사의 bootstrap 그림으로 대신 쓰지 않는다.
