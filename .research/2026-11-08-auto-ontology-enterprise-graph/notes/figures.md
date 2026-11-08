# Figures

- r1 docs/assets/arch.png — 메인테이너의 아키텍처 그림. 제목 상자 "NVIDIA AI-Q Agent Harness Architecture". 노드: Agent Harness → Frontend → Backend → PostgreSQL; Ingestion Service → PostgreSQL, Ingestion Service → Source databases; Backend 와 Ingestion Service 가 각각 NVIDIA NIM "LLM + embeddings" 로 화살표; Backend 에서 Source databases 로 "Text-To-SQL Query Execution". https://github.com/NVIDIA/auto-ontology/blob/c447003f72a822301e927196a4ecb5b597c308d5/docs/assets/arch.png
- r1 docs/assets/ontology-graph.png — Wide World Importers 를 컴파일한 semantic graph 화면. 범례 "Terms 31". 선택된 Term "Order": 설명 "A customer order including its dates, delivery details, comments, and processing metadata.", Related Terms 7, Attribute Columns 10, SQL Attributes 2, Zones: –. 보이는 노드: Purchase Order, Transaction Ty…, Customer, Invoice, Supplier C…, Customer Cat…, Stock Group, City, Stock It…, Order, Person, Order Line, Supplier Tr…, Delivery Method, Payment Meth…, Invoice Line, Stock Item, Buying Group, Country, System… https://github.com/NVIDIA/auto-ontology/blob/c447003f72a822301e927196a4ecb5b597c308d5/docs/assets/ontology-graph.png
- r1 docs/assets/qa-example.png — 채팅 답변 화면 (README alt: "Chat answering which products drive the most revenue and highest customer count, with the generated SQL and a revenue chart"). 열지 않았다.
- w4 HN 스레드 — 표 없음. 점수 290 (story 줄).
- w8 issue #261 — 표 없음. 수치: 1,415-task paired BIRD, mean generation time 61.21s vs 9.27s, model calls 5.56 vs 1.00.
- w11 PR #346 본문 — BIRD 1534문항 두 번씩: baseline 1165, 1177 (평균 76.34%), with rules 1181, 1172 (평균 76.69%). schema-only 대조군 없음.
