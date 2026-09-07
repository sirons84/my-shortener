// 외솔 배움터 — 이 기기에만 두는 열쇠
//
// 순위판에 남긴 기록을 지울 때, 교사가 자기 반을 다룰 때 쓴다.
// 진행도(저장 코드)와 섞지 않는다. 열쇠는 옮기는 것이 아니라 이 기기의 것이고,
// 코드에 넣으면 칠판에 적는 순간 남의 기록을 지울 수 있게 된다.

const KEYS_KEY = 'oesol.keys.v1';

function empty() {
  return { scores: {}, classes: {} };
}

export function loadKeys() {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEYS_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return empty();
    return {
      scores: raw.scores && typeof raw.scores === 'object' ? raw.scores : {},
      classes: raw.classes && typeof raw.classes === 'object' ? raw.classes : {},
    };
  } catch {
    return empty();
  }
}

function write(keys) {
  if (typeof window === 'undefined') return keys;
  try {
    window.localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  } catch {
    /* 저장이 막혀 있으면 이번 판만 기억하지 못한다 */
  }
  return keys;
}

/** 순위판 기록 열쇠를 적어 둔다 */
export function rememberScore(id, key) {
  const keys = loadKeys();
  keys.scores[id] = key;
  return write(keys);
}

export function forgetScore(id) {
  const keys = loadKeys();
  delete keys.scores[id];
  return write(keys);
}

/** 교사가 만든 반의 열쇠 */
export function rememberClass(code, key) {
  const keys = loadKeys();
  keys.classes[code] = key;
  return write(keys);
}

export function forgetClass(code) {
  const keys = loadKeys();
  delete keys.classes[code];
  return write(keys);
}

export function clearKeys() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEYS_KEY);
  } catch {
    /* 지울 수 없으면 그대로 둔다 */
  }
}
