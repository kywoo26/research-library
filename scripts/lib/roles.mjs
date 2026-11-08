// 연구 체인의 역할 이름과 모델 등급. hook·판정·check-harness 가 모두 여기서 읽는다.
// 각 harness 의 정의 파일 이름, 모델 줄과 Codex profile 의 matcher 는 check-harness 가 이 표와 맞춰 본다.
export const LENSES = ['lens-numbers', 'lens-reader'];
// plan-review 는 쓰기 전에 계획을 읽는다. lens 가 아니라서 lens 창을 열지 않고, 게이트를 통과한 초고를 요구하지 않는다.
export const REVIEWERS = [...LENSES, 'recheck', 'plan-review'];
export const ROLES = ['researcher', ...REVIEWERS];

// 놓친 것을 뒤에서 잡아 주는 장치가 없는 판단은 frontier, 다음 단계나 스크립트가 다시 보는 일은 workhorse.
// researcher 는 소유자가 연 세션의 모델을 쓴다(Claude 는 상속, Codex 는 그 세션 자체).
// 2026-10-28: lens 를 frontier(opus)로 올린 실행도 함정을 놓쳤지만 그때 effort 는 medium 이었다. workhorse(sonnet)를
// high 로 돌린 실행은 같은 함정을 잡았다. 그래서 검토 역할은 workhorse 에 EFFORT 를 정해 둔다. 근거는 docs/harness-parity.md 실측 기록.
// 2026-11-08: 문체, 흐름, 도식, 요청 충족을 판정하는 lens-reader 와 쓰기 전 방향을 잡는 plan-review 는 frontier 다.
// workhorse 로 돌린 lens-reader 가 메시지 없는 문서 셋을 통과시켰다(PR #52·#54·#55). 원문 대조는 workhorse high 가 잡는다.
export const TIER = { 'lens-numbers': 'workhorse', 'lens-reader': 'frontier', recheck: 'workhorse', 'plan-review': 'frontier' };
export const MODEL = {
  claude: { frontier: 'opus', workhorse: 'sonnet' },
  // Codex 는 모두 sol 로 시작한다. astra 는 이 체인에서 시험한 적이 없다. 비교 시험에서 분석이 얕으면 그때 올린다.
  codex: { frontier: 'gpt-6.1-sol', workhorse: 'gpt-6.1-sol' },
};

// 역할마다 effort 를 harness 별로 정한다. 같은 이름이라도 모델마다 생각하는 양이 달라 MODEL 처럼 따로 둔다.
// 정하지 않으면 Claude 는 세션 값을, Codex 는 owner 설정을 물려받는다. 2026-10-28 근거(공식 문서와 실측):
// Opus 5.5 는 medium 이 출발점(Opus 5 의 high 와 같거나 낫다). Sonnet 5.5 는 길고 어려운 agentic 일에 high.
// GPT-6.1 Sol 은 장기 연구에 high. Claude lens 가 medium 으로 도구 12번에 끝나 함정 둘을 놓쳤고, high 에서는 66번 읽고 잡았다.
export const EFFORT = {
  // 2026-11-08: 분석, 계획, 문장이 모두 researcher 에서 나와 Claude researcher 를 high 로 올렸다. Opus 로 올린 판단 역할은
  // 입력이 짧거나(계획) 한 문서 읽기라 medium 이다.
  claude: { researcher: 'high', 'lens-numbers': 'high', 'lens-reader': 'medium', recheck: 'high', 'plan-review': 'medium' },
  codex: { researcher: 'high', 'lens-numbers': 'high', 'lens-reader': 'high', recheck: 'high', 'plan-review': 'high' },
};
