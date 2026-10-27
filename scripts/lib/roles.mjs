// 연구 체인의 역할 이름과 모델 등급. hook·판정·check-harness 가 모두 여기서 읽는다.
// 각 harness 의 정의 파일 이름, 모델 줄과 Codex profile 의 matcher 는 check-harness 가 이 표와 맞춰 본다.
export const LENSES = ['lens-numbers', 'lens-reader'];
export const REVIEWERS = [...LENSES, 'recheck'];
export const ROLES = ['researcher', ...REVIEWERS];

// 놓친 것을 뒤에서 잡아 주는 장치가 없는 판단은 frontier, 다음 단계나 스크립트가 다시 보는 일은 workhorse.
// researcher 는 소유자가 연 세션의 모델을 쓴다(Claude 는 상속, Codex 는 그 세션 자체).
// 2026-10-28: lens 를 frontier(opus)로 올린 실행도 함정을 놓쳤지만 그때 effort 는 medium 이었다. workhorse(sonnet)를
// high 로 돌린 실행은 같은 함정을 잡았다. 그래서 검토 역할은 workhorse 에 EFFORT 를 정해 둔다. 근거는 docs/harness-parity.md 실측 기록.
export const TIER = { 'lens-numbers': 'workhorse', 'lens-reader': 'workhorse', recheck: 'workhorse' };
export const MODEL = {
  claude: { frontier: 'opus', workhorse: 'sonnet' },
  codex: { frontier: 'gpt-6-astra', workhorse: 'gpt-6.1-sol' },
};

// 역할마다 effort 를 harness 별로 정한다. 같은 이름이라도 모델마다 생각하는 양이 달라 MODEL 처럼 따로 둔다.
// 정하지 않으면 Claude 는 세션 값을, Codex 는 owner 설정을 물려받는다. 2026-10-28 근거(공식 문서와 실측):
// Opus 5.5 는 medium 이 출발점(Opus 5 의 high 와 같거나 낫다). Sonnet 5.5 는 길고 어려운 agentic 일에 high.
// GPT-6.1 Sol 은 장기 연구에 high. Claude lens 가 medium 으로 도구 12번에 끝나 함정 둘을 놓쳤고, high 에서는 66번 읽고 잡았다.
export const EFFORT = {
  claude: { researcher: 'medium', 'lens-numbers': 'high', 'lens-reader': 'high', recheck: 'high' },
  codex: { researcher: 'high', 'lens-numbers': 'high', 'lens-reader': 'high', recheck: 'high' },
};
