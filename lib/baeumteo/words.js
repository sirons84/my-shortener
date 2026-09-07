// 외솔 배움터 — 낱말 데이터 읽기
//
// 원칙(기획서 §3-2): verified:false 인 낱말은 게임에 나오지 않는다.
// 화면에 보이는 모든 낱말은 여기를 지나온다.

import data from '../../data/words.json';

/** 검증된 낱말만 (게임에 쓰는 전부) */
export const words = data.words.filter((w) => w.verified !== false);

const byId = new Map(words.map((w) => [w.id, w]));

export function getWord(id) {
  return byId.get(id) || null;
}

/** 학년군·시대로 거른다. 값을 주지 않으면 전부 */
export function filterWords({ level, era } = {}) {
  return words.filter(
    (w) =>
      (level === undefined || (Array.isArray(level) ? level.includes(w.level) : w.level === level)) &&
      (era === undefined || (Array.isArray(era) ? era.includes(w.era) : w.era === era)),
  );
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * 사전에 아직 안 실린 낱말 하나.
 * 쉬운 것부터 나오게 학년군 순으로 훑되, 같은 급 안에서는 무작위로 고른다.
 * 다 실었으면 null.
 */
export function pickNextWord(entries, pool = {}) {
  const done = new Set(entries);
  const candidates = filterWords(pool).filter((w) => !done.has(w.id));
  if (candidates.length === 0) return null;

  const lowest = Math.min(...candidates.map((w) => w.level));
  return pickRandom(candidates.filter((w) => w.level === lowest));
}

/**
 * 뜻 고르기 보기. 정답 하나와 남의 뜻 셋을 섞는다.
 * 헷갈릴 만하게 같은 갈래(tags)에서 먼저 뽑는다.
 */
export function meaningChoices(word, count = 4) {
  const others = words.filter((w) => w.id !== word.id);
  const sameTag = others.filter((w) => w.tags?.some((t) => word.tags?.includes(t)));

  const picked = [];
  const pool = [...sameTag, ...others.filter((w) => !sameTag.includes(w))];
  while (picked.length < count - 1 && pool.length > 0) {
    const [taken] = pool.splice(Math.floor(Math.random() * Math.min(pool.length, 12)), 1);
    if (!picked.some((p) => p.meaning === taken.meaning) && taken.meaning !== word.meaning) {
      picked.push(taken);
    }
  }

  const choices = [
    { id: word.id, meaning: word.meaning, correct: true },
    ...picked.map((w) => ({ id: w.id, meaning: w.meaning, correct: false })),
  ];

  // 정답 자리가 늘 첫째면 금방 들킨다
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}
