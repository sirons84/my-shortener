// 외솔 배움터 — 브라우저 저장 (개발기획서 §9, 데이터설계 §3)
//
// 로그인이 없다. 진행도는 이 기기에만 있고, 다른 기기로는 저장 코드로 옮긴다.
// 서버로 올라가는 것은 순위판 기록뿐이므로 여기 있는 값은 서버를 모른다.
//
// 계산은 전부 순수 함수로 둔다. 화면(useState)이 아니라 이 파일이 규칙의 자리다.

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
    dict: { entries: [], workers: {}, at: Date.now() },
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

  const workers = {};
  const rawWorkers = raw.dict?.workers;
  if (rawWorkers && typeof rawWorkers === 'object') {
    for (const [id, count] of Object.entries(rawWorkers)) {
      const n = num(count, 0, 9999);
      if (n > 0) workers[id] = n;
    }
  }

  const entries = Array.isArray(raw.dict?.entries)
    ? [...new Set(raw.dict.entries.filter((id) => typeof id === 'string'))]
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
      entries,
      workers,
      at: num(raw.dict?.at, 0, Number.MAX_SAFE_INTEGER) || Date.now(),
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

// ── 사전 편찬소 셈 ────────────────────────────────────────────────

/** 초당 쌓이는 낱말 카드 수 */
export function cardRate(save, config) {
  let rate = config.base_rate;
  for (const worker of config.workers) {
    rate += (save.dict.workers[worker.id] || 0) * worker.rate;
  }
  return rate;
}

/** n번째(0부터) 고용에 드는 값. 한 명 뽑을 때마다 growth 배씩 오른다 */
export function hireCost(worker, owned) {
  return Math.ceil(worker.cost * Math.pow(worker.growth ?? 1.15, owned));
}

/**
 * 마지막으로 셈한 때부터 지금까지 쌓인 카드를 얹는다.
 * 창을 닫아 둔 동안 것도 세되 offline_cap_h 시간분까지만 (기획서 §8-1).
 * 시계를 되돌려 놓은 기기에서도 음수가 되지 않게 막는다.
 */
export function settle(save, config, now = Date.now()) {
  const last = save.dict.at || now;
  const capMs = (config.offline_cap_h ?? 8) * 3600 * 1000;
  const elapsed = Math.min(Math.max(0, now - last), capMs);
  const gained = Math.floor((elapsed / 1000) * cardRate(save, config));

  return {
    save: {
      ...save,
      cards: save.cards + gained,
      dict: { ...save.dict, at: now },
    },
    gained,
    // 자리를 비운 사이에 쌓인 것인지 (돌아왔을 때 한 줄 알려 준다)
    away: elapsed >= 60 * 1000,
  };
}

/** 사람을 뽑는다. 카드가 모자라면 저장을 그대로 돌려준다 */
export function hire(save, worker, count = 1) {
  let next = save;
  for (let i = 0; i < count; i += 1) {
    const owned = next.dict.workers[worker.id] || 0;
    const cost = hireCost(worker, owned);
    if (next.cards < cost) break;
    next = {
      ...next,
      cards: next.cards - cost,
      dict: {
        ...next.dict,
        workers: { ...next.dict.workers, [worker.id]: owned + 1 },
      },
    };
  }
  return next;
}

/** 낱말을 사전에 싣는다 (카드는 이미 냈다고 본다) */
export function addEntry(save, wordId) {
  if (save.dict.entries.includes(wordId)) return save;
  return {
    ...save,
    dict: { ...save.dict, entries: [...save.dict.entries, wordId] },
  };
}

/** 이정표로 열리는 게임 목록 */
export function unlocked(save, config) {
  const count = save.dict.entries.length;
  return (config.milestones || [])
    .filter((m) => count >= m.entries)
    .map((m) => m.unlock);
}

/** 다음 이정표 (없으면 null) */
export function nextMilestone(save, config) {
  const count = save.dict.entries.length;
  return (config.milestones || []).find((m) => count < m.entries) || null;
}
