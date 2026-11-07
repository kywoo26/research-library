# Figures

- r1 docs/assets/arch.png — "NVIDIA AI-Q Agent Harness Architecture". Agent Harness → Frontend → Backend → PostgreSQL; Ingestion Service ↔ PostgreSQL and Source databases; Backend and Ingestion Service both call "NVIDIA NIM LLM + embeddings"; Backend runs "Text-To-SQL Query Execution" against the source databases. Retrievable at https://github.com/NVIDIA/auto-ontology/blob/c447003f72a822301e927196a4ecb5b597c308d5/docs/assets/arch.png
- r1 docs/assets/ontology-graph.png — README: semantic graph of the Wide World Importers ontology, Order term selected; README says one compilation produced 31 terms. Not opened as an image.
- r1 docs/assets/qa-example.png — README: Chat answering which products drive the most revenue, with SQL and a revenue chart. Not opened.
- r1 README.md "How it works" — three definitions (Terms, SQL attributes, Relationships), stages Generate (4 steps), Certify (3 steps), Answer (5 steps).
- r2 README.md table "Arm / Server / What the model gets" — Control schema_only_sql: the question and a schema dump, one prompt, no tools; Treatment auto_ontology_sql: the question; Auto-Ontology's agent retrieves its own context.
- r2 README.md table "Benchmarks and datasets" — BIRD 1,534 (Dev), 500 (Mini-Dev) SQLite; BEAVER 100-question dw sample MySQL; FDABench-Lite 169 SQLite; Wide World Importers 41 Postgres; BIRD-Interact ~300 (Lite), 600 (Full) Postgres.
- w3 commit fb496d4 — BEAVER dw: 137 semantic FK edges, 17 removed (10 disjoint, 7 empty), none a join in 300 gold queries.
- w2 commit 68c8558 — Opus 5.5 SQL generation 0 of 3 before, 3 of 3 after (Bedrock and Azure); tool description alone 5 of 5 refused with the sentence, 5 of 5 answered without.
- w1 — 90% reduction of ontology creation time "in NVIDIA testing"; no conditions given.
