r1 README docs/assets/arch.png — 원본 architecture: Agent Harness→Frontend→Backend; Backend·Ingestion→NIM, Postgres; ingestion→source DB; backend text-to-SQL→source DB. 직접 열어 확인. 단일파일 HTML에 base64 내장 예정. MCP와 인증 control을 이 그림이 모두 보여주지는 않는다.
r1 README docs/assets/ontology-graph.png — 직접 열어 확인. Order 선택 시 관련 term/column/SQL attribute가 표시된다. 내장.
r1 README docs/assets/qa-example.png — 직접 열어 확인. chat 질문→SQL→revenue chart UI. 본문 미내장.
실행 sqlite_loss.txt — raw row [1,100,Ada,first order]; dict before DataFrame {id:1,name:Ada}; aliases control preserves all four fields. 성능 차트가 아니라 변환 중 정보 손실 예제.
실행 eval_match.txt — gold [(100,)] prediction [(100,),(100,)]; BIRD_match true, same_row_count false. 공식 benchmark 수치 아님.
w1 §NVIDIA Auto Ontology — ontology creation time reduced 90%, NVIDIA testing. 측정설계 공개 여부는 본 페이지에 한정.
w2 §NVIDIA Auto Ontology — up to 90 percent faster ontology creation, 80 percent less time connecting data, 10x more accurate AI queries. 비교 baseline/정확도 정의를 이 페이지에서 확인하지 못함.

r1 ontology-graph.png의 UI 표시 — Order 관련 Terms 7, Attribute Columns 10, SQL Attributes 2, 전체 Terms 31. 원본 PNG 직접 확인. 구현 성능 수치로 사용하지 않는다.
