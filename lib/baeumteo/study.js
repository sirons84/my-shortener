// 외솔 배움터 — 외솔의 서재 (기획서 §8-4)
//
// 방 셋을 오가며 단서 셋을 차례로 푼다. 틀리면 힌트가 한 단계씩 열리고, 실패는 없다.
// 단서의 재료(말·연도·사건)는 oesol.json 의 검증된 항목에서만 온다.
// 여기는 재료를 꺼내고 답을 맞춰 보는 자리다. 화면은 컴포넌트가 맡는다.

import { oesol } from '../oesol';

export const MAX_HINTS = 3;

function verified(item) {
  return item && item.verified !== false ? item : null;
}

function findQuote(id) {
  return verified((oesol.quotes || []).find((q) => q.id === id));
}

function findEvent(id) {
  return verified((oesol.events || []).find((e) => e.id === id));
}

/** 빈칸·비교용으로 글을 고른다. 빈칸과 대소문자, 유니코드 조합을 맞춘다 */
export function normalizeText(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[.。!?]/g, '')
    .toLowerCase();
}

/**
 * 단서의 재료. 참조한 사실이 없거나 확인 전이면 null 을 준다.
 * (그런 단서는 화면에 내지 않는다 — 기획서 §3-2)
 */
export function material(clue) {
  if (clue.type === 'quote_fill') {
    const quote = findQuote(clue.ref);
    if (!quote || !quote.text.includes(clue.answer)) return null;
    return {
      full: quote.text,
      blank: quote.text.replace(clue.answer, '＿'.repeat(Math.max(2, clue.answer.length))),
      source: quote.source,
    };
  }

  if (clue.type === 'date_lock') {
    const event = findEvent(clue.ref);
    if (!event || String(event.year) !== clue.answer) return null;
    return { title: event.title, year: event.year, source: event.source };
  }

  if (clue.type === 'order') {
    const items = clue.ref.map((id) => findEvent(id));
    if (items.some((e) => !e)) return null;
    // 참조 순서가 곧 정답이다. 연도가 그 순서와 어긋나면 데이터가 잘못된 것이다
    for (let i = 1; i < items.length; i += 1) {
      if (items[i].year < items[i - 1].year) return null;
    }
    return { items: items.map((e) => ({ id: e.id, title: e.title, year: e.year })) };
  }

  return null;
}

/** 답을 맞춰 본다 */
export function check(clue, input) {
  if (clue.type === 'quote_fill') return normalizeText(input) === normalizeText(clue.answer);
  if (clue.type === 'date_lock') return String(input || '') === clue.answer;
  if (clue.type === 'order') {
    if (!Array.isArray(input) || input.length !== clue.ref.length) return false;
    return input.every((id, i) => id === clue.ref[i]);
  }
  return false;
}

/** 틀렸을 때 힌트를 한 단계 더 연다 (최대 MAX_HINTS) */
export function openHint(opened) {
  return Math.min(MAX_HINTS, (opened || 0) + 1);
}

/** 화면에 내도 되는 단서만, 정해진 차례대로 */
export function playableClues(config) {
  return config.clues.filter((c) => material(c) !== null);
}

/** 섞는다. 화면에서 처음 한 번만 부른다 */
export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // 우연히 정답 순서 그대로 나오면 한 번 더 섞는다
  if (out.length > 1 && out.every((x, i) => x === list[i])) return shuffle(list, random);
  return out;
}
