# 원문 w1 의 그림 세 개와 그림 안의 데이터

원문 w1 은 2026-10-25T03:40:33Z 수신본이다. FIG A 의 문장은 SVG 의 aria-label 이고, 점 값은 같은 SVG 의 circle 좌표를 축 눈금으로 환산한 근사값이다. FIG B 와 FIG C 의 값은 같은 HTML 에 실린 React Server Component payload(차트 컴포넌트에 넘기는 data prop)에서 그대로 옮겼다. 두 그림에는 Fable 5.1 / Opus 5 / Fable 5 탭이 있고 처음 보이는 탭은 Fable 5.1 이다. Opus 5.5 탭은 없다. 실패 분류의 이름과 정의는 같은 페이지의 차트 스크립트(/_next/static/chunks/0vtonc7z4_zpn.js)에 있다.

처리: 그림 = 문서가 다시 그렸다 / 이름 = setup 에 이름만 적었다.

| 식별자 | 무엇을 보이나 | 처리 |
|---|---|---|
| FIG A Terminal-Bench 3.0 effort curve | 모델 4개 x effort 5단계, 통과율 대 시도당 중앙 토큰(log) | 그림: 곡선 장 |
| FIG B attempts by outcome | 시도 하나가 네모 하나, 실패 종류별. 탭마다 모델 하나, 화면은 low 와 max 두 칸 | 그림: 실패 종류 장 표 |
| FIG C Where effort pays | 과제 분야 7개의 low effort 대 top effort 통과율 | 그림: 분야 장 막대 |
| carousel 셋(fitness app, /config, spec build) | 같은 과제를 low/medium/high/max 로 만든 화면 캡처 | 이름: 걸린 시간만 본문에 |

## FIG A

FIG A aria-label: Terminal-Bench 3.0 only: share of attempts that passed against median tokens per attempt, log scale, for Opus 5.5, Fable 5.1, Opus 5 and Fable 5, with one point per effort setting from low to max. Opus 5.5 scores highest at every setting, from 36.6% at low to 65.7% at max, and Fable 5.1 scores higher than Opus 5 and Fable 5 at every setting. Opus 5.5 at high matches Fable 5.1 at max (58.9% against 58.0%) on half the tokens. Fable 5 levels off at 43.4% from xhigh to max.

FIG A 점 좌표 환산 (y: 70px 가 10%p, 20% 가 y=411. x: 50k 가 128.9, 2배마다 174.7px). aria-label 의 값 36.6, 65.7, 58.9, 58.0, 43.4 와 환산값이 맞는다.

- FIG A point | Opus 5.5 | low | 약 43k tokens | 약 36.6% passed
- FIG A point | Opus 5.5 | medium | 약 78k tokens | 약 54.6% passed
- FIG A point | Opus 5.5 | high | 약 103k tokens | 약 58.9% passed
- FIG A point | Opus 5.5 | xhigh | 약 180k tokens | 약 62.6% passed
- FIG A point | Opus 5.5 | max | 약 276k tokens | 약 65.7% passed
- FIG A point | Fable 5.1 | low | 약 64k tokens | 약 32.0% passed
- FIG A point | Fable 5.1 | medium | 약 88k tokens | 약 40.0% passed
- FIG A point | Fable 5.1 | high | 약 119k tokens | 약 46.3% passed
- FIG A point | Fable 5.1 | xhigh | 약 175k tokens | 약 54.0% passed
- FIG A point | Fable 5.1 | max | 약 206k tokens | 약 58.0% passed
- FIG A point | Opus 5 | low | 약 75k tokens | 약 26.9% passed
- FIG A point | Opus 5 | medium | 약 116k tokens | 약 37.7% passed
- FIG A point | Opus 5 | high | 약 160k tokens | 약 43.4% passed
- FIG A point | Opus 5 | xhigh | 약 202k tokens | 약 46.9% passed
- FIG A point | Opus 5 | max | 약 249k tokens | 약 50.6% passed
- FIG A point | Fable 5 | low | 약 61k tokens | 약 22.6% passed
- FIG A point | Fable 5 | medium | 약 88k tokens | 약 33.4% passed
- FIG A point | Fable 5 | high | 약 111k tokens | 약 36.6% passed
- FIG A point | Fable 5 | xhigh | 약 143k tokens | 약 43.4% passed
- FIG A point | Fable 5 | max | 약 170k tokens | 약 43.4% passed

## FIG B (data prop)

묶음: missed a case = works on my machine + overfit to the examples + close, but not exact + a bug its tests missed. made the wrong call = misread a requirement + wrong or incomplete fix + got the domain rule wrong + picked the wrong reading. 나머지는 other failures.

- FIG B category | works on my machine | It ran in the model's own container and failed in the grader's.
- FIG B category | overfit to the examples | Tuned until the visible examples passed. The hidden ones did not.
- FIG B category | close, but not exact | Equivalent output, where the grader wanted an exact match.
- FIG B category | a bug its tests missed | The right design with a real bug. Its own tests never hit the case that breaks it.
- FIG B category | misread a requirement | Broke something the brief or the task's docs said.
- FIG B category | wrong or incomplete fix | Asked to fix something, it changed the wrong place or not enough of it.
- FIG B category | got the domain rule wrong | Chose the wrong formula, threshold or convention for the field.
- FIG B category | picked the wrong reading | The brief allowed two readings. It chose the one the tests did not.
- FIG B category | other failures | Nothing working delivered, a number short of its target, or unclear from the record.

- FIG B data | Opus 5 | effort 10 | label low | passed 108 of 369 | median 75655 tokens | missed a case 63 | made the wrong call 140 | picked the wrong reading 28 | a bug its tests missed 38 | misread a requirement 53
- FIG B data | Opus 5 | effort 15 | label (이름 없음) | passed 121 of 369 | median 94068 tokens | missed a case 62 | made the wrong call 131 | picked the wrong reading 35 | a bug its tests missed 40 | misread a requirement 44
- FIG B data | Opus 5 | effort 20 | label medium | passed 141 of 369 | median 118795 tokens | missed a case 50 | made the wrong call 123 | picked the wrong reading 39 | a bug its tests missed 33 | misread a requirement 39
- FIG B data | Opus 5 | effort 30 | label (이름 없음) | passed 137 of 370 | median 135617 tokens | missed a case 43 | made the wrong call 118 | picked the wrong reading 37 | a bug its tests missed 29 | misread a requirement 39
- FIG B data | Opus 5 | effort 40 | label (이름 없음) | passed 170 of 370 | median 185176 tokens | missed a case 33 | made the wrong call 123 | picked the wrong reading 46 | a bug its tests missed 19 | misread a requirement 35
- FIG B data | Opus 5 | effort 80 | label (이름 없음) | passed 177 of 370 | median 229392 tokens | missed a case 29 | made the wrong call 117 | picked the wrong reading 47 | a bug its tests missed 15 | misread a requirement 27
- FIG B data | Opus 5 | effort 120 | label max | passed 178 of 370 | median 253980 tokens | missed a case 39 | made the wrong call 106 | picked the wrong reading 41 | a bug its tests missed 27 | misread a requirement 31
- FIG B data | Opus 5 | effort max | label max | passed 193 of 370 | median 308346 tokens | missed a case 24 | made the wrong call 118 | picked the wrong reading 45 | a bug its tests missed 17 | misread a requirement 37
- FIG B data | Fable 5 | effort 10 | label low | passed 80 of 368 | median 61551 tokens | missed a case 86 | made the wrong call 150 | picked the wrong reading 31 | a bug its tests missed 59 | misread a requirement 51
- FIG B data | Fable 5 | effort 15 | label (이름 없음) | passed 99 of 370 | median 73590 tokens | missed a case 70 | made the wrong call 160 | picked the wrong reading 38 | a bug its tests missed 44 | misread a requirement 53
- FIG B data | Fable 5 | effort 20 | label medium | passed 123 of 367 | median 85220 tokens | missed a case 67 | made the wrong call 143 | picked the wrong reading 33 | a bug its tests missed 45 | misread a requirement 45
- FIG B data | Fable 5 | effort 40 | label high | passed 134 of 369 | median 111515 tokens | missed a case 55 | made the wrong call 146 | picked the wrong reading 37 | a bug its tests missed 27 | misread a requirement 47
- FIG B data | Fable 5 | effort 80 | label (이름 없음) | passed 137 of 369 | median 129287 tokens | missed a case 46 | made the wrong call 138 | picked the wrong reading 37 | a bug its tests missed 28 | misread a requirement 43
- FIG B data | Fable 5 | effort 120 | label xhigh | passed 153 of 370 | median 136702 tokens | missed a case 32 | made the wrong call 145 | picked the wrong reading 46 | a bug its tests missed 13 | misread a requirement 45
- FIG B data | Fable 5 | effort max | label max | passed 161 of 369 | median 193808 tokens | missed a case 32 | made the wrong call 139 | picked the wrong reading 54 | a bug its tests missed 11 | misread a requirement 38
- FIG B data | Fable 5.1 | effort 10 | label low | passed 140 of 370 | median 72982 tokens | missed a case 59 | made the wrong call 133 | picked the wrong reading 25 | a bug its tests missed 40 | misread a requirement 45
- FIG B data | Fable 5.1 | effort 15 | label medium | passed 158 of 370 | median 92970 tokens | missed a case 45 | made the wrong call 122 | picked the wrong reading 38 | a bug its tests missed 28 | misread a requirement 38
- FIG B data | Fable 5.1 | effort 20 | label (이름 없음) | passed 168 of 370 | median 112254 tokens | missed a case 36 | made the wrong call 127 | picked the wrong reading 42 | a bug its tests missed 27 | misread a requirement 35
- FIG B data | Fable 5.1 | effort 30 | label (이름 없음) | passed 189 of 370 | median 135042 tokens | missed a case 30 | made the wrong call 111 | picked the wrong reading 35 | a bug its tests missed 20 | misread a requirement 36
- FIG B data | Fable 5.1 | effort 40 | label (이름 없음) | passed 201 of 370 | median 156271 tokens | missed a case 29 | made the wrong call 110 | picked the wrong reading 46 | a bug its tests missed 16 | misread a requirement 23
- FIG B data | Fable 5.1 | effort 80 | label xhigh | passed 217 of 370 | median 177400 tokens | missed a case 20 | made the wrong call 107 | picked the wrong reading 40 | a bug its tests missed 12 | misread a requirement 31
- FIG B data | Fable 5.1 | effort 120 | label (이름 없음) | passed 214 of 370 | median 188059 tokens | missed a case 23 | made the wrong call 96 | picked the wrong reading 31 | a bug its tests missed 14 | misread a requirement 26
- FIG B data | Fable 5.1 | effort max | label max | passed 214 of 370 | median 222480 tokens | missed a case 24 | made the wrong call 107 | picked the wrong reading 47 | a bug its tests missed 14 | misread a requirement 26

## FIG C (data prop)

FIG C caption: Pass rate. Low effort pools each model's two lowest settings, top effort its three highest, since categories are small.

- FIG C pooled settings | Fable 5.1 | low effort = low, medium | top effort = xhigh, 120, max
- FIG C pooled settings | Opus 5 | low effort = low, 15 | top effort = 80, 120, max
- FIG C pooled settings | Fable 5 | low effort = low, 15 | top effort = 80, xhigh, max
- FIG C data | Security | 7 tasks | Fable 5.1 | low effort 64% (45/70) | top effort 87% (91/105)
- FIG C data | Security | 7 tasks | Opus 5 | low effort 53% (37/70) | top effort 82% (86/105)
- FIG C data | Security | 7 tasks | Fable 5 | low effort 33% (23/70) | top effort 57% (60/105)
- FIG C data | Hardware | 5 tasks | Fable 5.1 | low effort 34% (17/50) | top effort 75% (56/75)
- FIG C data | Hardware | 5 tasks | Opus 5 | low effort 42% (21/50) | top effort 68% (51/75)
- FIG C data | Hardware | 5 tasks | Fable 5 | low effort 30% (15/50) | top effort 61% (46/75)
- FIG C data | ML | 13 tasks | Fable 5.1 | low effort 54% (70/130) | top effort 73% (142/195)
- FIG C data | ML | 13 tasks | Opus 5 | low effort 41% (53/128) | top effort 64% (125/195)
- FIG C data | ML | 13 tasks | Fable 5 | low effort 27% (35/128) | top effort 43% (83/193)
- FIG C data | Science | 15 tasks | Fable 5.1 | low effort 41% (61/150) | top effort 61% (138/225)
- FIG C data | Science | 15 tasks | Opus 5 | low effort 24% (36/150) | top effort 45% (101/225)
- FIG C data | Science | 15 tasks | Fable 5 | low effort 32% (48/150) | top effort 38% (85/225)
- FIG C data | Software | 20 tasks | Fable 5.1 | low effort 43% (86/200) | top effort 56% (167/300)
- FIG C data | Software | 20 tasks | Opus 5 | low effort 38% (76/200) | top effort 50% (150/300)
- FIG C data | Software | 20 tasks | Fable 5 | low effort 22% (44/200) | top effort 48% (145/300)
- FIG C data | Media | 4 tasks | Fable 5.1 | low effort 18% (7/40) | top effort 30% (18/60)
- FIG C data | Media | 4 tasks | Opus 5 | low effort 10% (4/40) | top effort 25% (15/60)
- FIG C data | Media | 4 tasks | Fable 5 | low effort 28% (11/40) | top effort 25% (15/60)
- FIG C data | Operations | 10 tasks | Fable 5.1 | low effort 12% (12/100) | top effort 22% (33/150)
- FIG C data | Operations | 10 tasks | Opus 5 | low effort 2% (2/100) | top effort 13% (20/150)
- FIG C data | Operations | 10 tasks | Fable 5 | low effort 3% (3/100) | top effort 11% (17/150)
- FIG C task | Security | Strip JavaScript from HTML to prevent XSS | Fable 5.1 low 2/10 top 14/15 | Opus 5 low 2/10 top 14/15 | Fable 5 low 0/10 top 9/15
- FIG C task | Science | Run GSEA on up-regulated tissue proteins | Fable 5.1 low 1/10 top 10/15 | Opus 5 low 3/10 top 6/15 | Fable 5 low 8/10 top 9/15

# 원문 w5 (블로그 「Choosing a Claude model and effort level in Claude Code」) 의 그림

모두 이미지라 열지 않았다. alt 는 비어 있고, figcaption 만 옮긴다. 처리는 모두 '이름'이다.

- w5 figure | request assembly | Everything Claude Code has gets packed into one API request. On the server, the text is tokenized before it ever reaches the model.
- w5 figure | effort paths | Same prompt, two effort levels. The high effort path generates roughly 7x more tokens to reach a higher confidence answer.
- w5 figure | heuristic | Two questions, one fallback. Use the heuristic to pick a starting point, not a hard rule.
- w5 figure | routine curve | Curves are for illustration purposes only, shown for a single task simple enough to be accomplished quickly by both models. They do not represent real benchmark data.
- w5 figure | hard curve | Curves are for illustration purposes only, shown for a single task hard enough to stretch both models. They do not represent real benchmark data.

# 원문 w4 (Prompting Claude Opus 5.5) 

그림이 없다.
