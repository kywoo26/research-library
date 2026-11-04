# 확인한 그림과 표
- r1 docs/assets/arch.png: Agent Harness → Frontend → Backend, ingestion service → catalog와 NIM, Backend → source DB 실행 경계를 그린 NVIDIA AI-Q architecture. 직접 열었다. 실행 화살표와 metadata 화살표는 operation dependency이며 packet 방향으로 읽지 않는다.
- r1 docs/assets/ontology-graph.png: Wide World Importers의 semantic object graph. Order 선택 panel의 related Terms 7, Attribute Columns 10, SQL Attributes 2와 전체 Terms 31이 표시된다. 직접 열었다. report에는 숫자를 성능으로 쓰지 않는다.
- w2 NVIDIA Auto Ontology: ontology creation time 90% 감소라는 본문 수치. 절대 시간과 실험 조건이 없어 속도 막대로 재구성하지 않는다.
- i261 본문 Evidence: 과거 1,415-task paired BIRD run의 평균 생성 시간 61.21s vs 9.27s, 평균 model call 5.56 vs 1.00. 비교 순서는 ontology vs control이다. 최신 revision 측정이 아님을 issue가 명시한다. report chart는 이 값만 쓴다.
