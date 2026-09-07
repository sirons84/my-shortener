// 외솔 배움터 — 브라우저 저장 (개발기획서 §9, 데이터설계 §3)
//
// 로그인이 없다. 진행도는 이 기기에만 있고, 다른 기기로는 저장 코드로 옮긴다.
// 서버로 올라가는 것은 순위판 기록뿐이므로 여기 있는 값은 서버를 모른다.
//
// 계산은 전부 순수 함수로 둔다. 화면(useState)이 아니라 이 파일이 규칙의 자리다.
//
// 저장에는 성격이 다른 두 가지가 들어 있다.
//   dict.known — 지금까지 실어 본 낱말 전부. 이정표·해금·반 공동 사전이 본다.
//   cards      — 지갑. 게임을 끝내고 받은 낱말 카드. 탑을 헐 때 같은 데 쓴다.
// 사전 편찬소 한 판 안에서 쌓이는 카드와 고용은 판이 끝나면 사라지므로
// 저장에 두지 않는다. 남는 것은 실은 낱말과 기록뿐이다.

export const SAVE_KEY = 'oesol.save.v1';
export const SAVE_VERSION = 1;

/** 빈 저장 */
export function emptySave() {
  return {
    v: SAVE_VERSION,
    nick: '',
    school: '',
    grade: 0,
    class: 0,
    class_code: '',
    cards: 0,
    dict: { known: [] },
    progress: {},
    updated: new Date().toISOString(),
  };
}

/** 알 수 없는 값이 섞여 들어와도 게임이 깨지지 않게 모양을 맞춘다 */
export function normalize(raw) {
  const base = emptySave();
  if (!raw || typeof raw !== 'object') return base;

  const num = (x, min, max) => {
    const n = Number(x);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.floor(n)));
  };

  // 판마다 비우기 전에는 실은 낱말이 dict.entries 에 있었다. 그 저장도 받아 준다.
  const knownSource = Array.isArray(raw.dict?.known)
    ? raw.dict.known
    : Array.isArray(raw.dict?.entries)
      ? raw.dict.entries
      : [];

  return {
    v: SAVE_VERSION,
    nick: typeof raw.nick === 'string' ? raw.nick.slice(0, 4) : '',
    school: typeof raw.school === 'string' ? raw.school.slice(0, 20) : '',
    grade: num(raw.grade, 0, 6),
    class: num(raw.class, 0, 30),
    class_code: typeof raw.class_code === 'string' ? raw.class_code.slice(0, 20) : '',
    cards: num(raw.cards, 0, Number.MAX_SAFE_INTEGER),
    dict: {
      known: [...new Set(knownSource.filter((id) => typeof id === 'string'))],
    },
    progress: raw.progress && typeof raw.progress === 'object' ? raw.progress : {},
    updated: typeof raw.updated === 'string' ? raw.updated : new Date().toISOString(),
  };
}

/** 저장 읽기. 서버 렌더 중이거나 저장이 막혀 있으면 빈 저장을 준다 */
export function loadSave() {
  if (typeof window === 'undefined') return emptySave();
  try {
    const text = window.localStorage.getItem(SAVE_KEY);
    if (!text) return emptySave();
    return normalize(JSON.parse(text));
  } catch {
    // 사생활 보호 모드나 저장 용량 초과. 이번 판만 기억 못 할 뿐 놀이는 이어진다.
    return emptySave();
  }
}

/** 저장 쓰기. 실패해도 조용히 넘긴다 */
export function writeSave(save) {
  if (typeof window === 'undefined') return save;
  const next = { ...save, updated: new Date().toISOString() };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch {
    /* 저장이 막혀 있어도 화면은 그대로 돌아간다 */
  }
  return next;
}

/** 저장 지우기 (기록 삭제 요청) */
export function clearSave() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* 지울 수 없으면 그대로 둔다 */
  }
}

// ── 사전 편찬소 한 판의 셈 ───────────────────────────────────────
//
// 판은 늘 카드 0, 고용 0, 사전 0 에서 시작한다. 그래야 점수가 실력을 가리킨다.
// 그래서 아래 셈은 저장이 아니라 판(round)을 받는다.

/** 빈 판 */
export function emptyRound() {
  return { cards: 0, workers: {}, entries: [] };
}

/** 초당 쌓이는 낱말 카드 수 */
export function cardRate(round, config) {
  let rate = config.base_rate;
  for (const worker of config.workers) {
    rate += (round.workers[worker.id] || 0) * worker.rate;
  }
  return rate;
}

/** n번째(0부터) 고용에 드는 값. 한 명 뽑을 때마다 growth 배씩 오른다 */
export function hireCost(worker, owned) {
  return Math.ceil(worker.cost * Math.pow(worker.growth ?? 1.15, owned));
}

/** 사람을 뽑는다. 카드가 모자라면 판을 그대로 돌려준다 */
export function hire(round, worker, count = 1) {
  let next = round;
  for (let i = 0; i < count; i += 1) {
    const owned = next.workers[worker.id] || 0;
    const cost = hireCost(worker, owned);
    if (next.cards < cost) break;
    next = {
      ...next,
      cards: next.cards - cost,
      workers: { ...next.workers, [worker.id]: owned + 1 },
    };
  }
  return next;
}

/** 낱말을 사전에 싣는다 (카드는 이미 냈다고 본다) */
export function addEntry(round, wordId) {
  if (round.entries.includes(wordId)) return round;
  return { ...round, entries: [...round.entries, wordId] };
}

// ── 게임 공통 ────────────────────────────────────────────────────

/** 낱말 카드를 지갑에 넣는다 (어느 게임에서 얻었든 여기로 온다) */
export function earn(save, count) {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return save;
  return { ...save, cards: save.cards + n };
}

/** 지갑에서 낱말 카드를 낸다. 모자라면 저장을 그대로 돌려준다 */
export function spend(save, count) {
  const n = Math.max(0, Math.floor(count));
  if (save.cards < n) return save;
  return { ...save, cards: save.cards - n };
}

/** 실어 본 낱말로 적어 둔다. 한 번 알게 된 것은 판이 끝나도 지우지 않는다 */
export function learn(save, wordIds) {
  const known = new Set(save.dict.known);
  for (const id of wordIds) known.add(id);
  if (known.size === save.dict.known.length) return save;
  return { ...save, dict: { ...save.dict, known: [...known] } };
}

/**
 * 게임 진행도를 적는다. `best` 로 시작하는 값은 큰 쪽만 남긴다.
 * (한 번 세운 최고 기록이 다음 판에 지워지지 않게 한다)
 */
export function recordProgress(save, game, patch) {
  const before = save.progress[game] || {};
  const after = { ...before };

  for (const [key, value] of Object.entries(patch)) {
    if (key.startsWith('best') && typeof value === 'number') {
      after[key] = Math.max(Number(before[key]) || 0, value);
    } else {
      after[key] = value;
    }
  }

  return { ...save, progress: { ...save.progress, [game]: after } };
}

// ── 이정표 ───────────────────────────────────────────────────────
//
// 실어 본 낱말이 늘면 다른 게임이 열린다. 한 번 열린 것은 닫히지 않는다.

/** 이정표로 열린 게임 목록 */
export function unlocked(save, config) {
  const count = save.dict.known.length;
  return (config.milestones || [])
    .filter((m) => count >= m.entries)
    .map((m) => m.unlock);
}

/** 다음 이정표 (없으면 null) */
export function nextMilestone(save, config) {
  const count = save.dict.known.length;
  return (config.milestones || []).find((m) => count < m.entries) || null;
}
