# Figures and tables of the pinned corpus

- Jev Decision Index 0.4.1, main chart (Full score). Bar ranking of 229 rows by Full score. Drawn by `index.html` from `data/index.json` at commit 0b5ecaf of huggingface.co/spaces/multimodalart/jev-decision-index. The values are the `v03.v` field of each row; the document redraws a subset (rows chosen by size tier) from that field, not from the rendered chart.
- Jev Decision Index 0.4.1, per-row "public vs private" chart. Plots `v03.pub` against `v03.v`. The document uses the two fields for the card-claim table, not the chart.
- Jev Decision Index 0.4.1, calibration reliability bins per row (`calibration.rel`). Not redrawn; the document uses the single `calibration.ece` value.
- fastino/GLiDE README, `assets/decision-index-0.4.1-full-score.webp` and `assets/glide-v1.2-decision-index-27b-card.webp`. Images of the board ranking made by Fastino. Not opened as images; the README's own text table gives GLiDE 71.5, Jeffan-31b-1710 69.8, mammoth-1 68.4.
- perplexity-ai/pplx-decider-v1.2 README, table "When to group questions". Joint vs one-question-per-request deltas: SATA-Bench +11.3, ACOS +7.8, PhishNChips +5.1, BFCL -1.1, BRIGHT -2.9, ToolRet -4.8.
- Artificial Analysis Decision Index evaluation page. Score, calibration, time and cost charts are rendered by JavaScript; the static text holds only the model legend (14 of 17 models). No chart values were read.
