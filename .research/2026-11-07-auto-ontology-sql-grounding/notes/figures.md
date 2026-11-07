# Figures

- r1 docs/assets/arch.png "NVIDIA AI-Q Agent Harness Architecture": Agent Harness → Frontend → Backend; Backend and Ingestion Service both call NVIDIA NIM (LLM + embeddings) and read/write PostgreSQL; Ingestion Service reads Source databases; Backend runs "Text-To-SQL Query Execution" directly against Source databases. Retrievable at https://github.com/NVIDIA/auto-ontology/blob/c447003f72a822301e927196a4ecb5b597c308d5/docs/assets/arch.png
- r1 docs/assets/ontology-graph.png: semantic graph of Wide World Importers, 31 terms, Order selected (README:224). Not redrawn.
- r1 docs/assets/qa-example.png: Chat answer with SQL and revenue chart. Not redrawn.
- w2 "Click to Enlarge" pipeline image: Prepare, Retrieval, Understanding, Predict, Optimize; Auto-Ontology sits in Understanding. Text read from the page, image not opened.
