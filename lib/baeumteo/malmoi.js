// 외솔 배움터 — 울산 말모이 원정대 (기획서 §8-6)
//
// 학생이 올리는 것은 낱말·뜻·들은 곳·들려준 사람(관계만)이다. 이름은 받지 않는다.
// 화면과 서버가 같은 검사를 봐야 하므로 이 파일은 양쪽에서 함께 쓴다.

import config from '../../data/games/malmoi.json';
import { hasBanned } from './nick';

export const DISTRICTS = config.districts;
export const PLACES = config.places;
export const RELATIONS = config.relations;

const DISTRICT_IDS = new Set(DISTRICTS.map((d) => d.id));
const PLACE_IDS = new Set(PLACES.map((p) => p.id));
const RELATION_IDS = new Set(RELATIONS.map((r) => r.id));

export function districtName(id) {
  return DISTRICTS.find((d) => d.id === id)?.name || '';
}
export function placeName(id) {
  return PLACES.find((p) => p.id === id)?.name || '';
}
export function relationName(id) {
  return RELATIONS.find((r) => r.id === id)?.name || '';
}

// 전화번호·주소·주소창 같은 것이 뜻풀이에 섞이지 않게
const LOOKS_PRIVATE = /(\d[\s-]?){5,}|https?:|www\.|@/i;

/** 낱말. 한글·공백·가운뎃점만, word_max 자까지 */
export function checkWord(raw) {
  const word = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!word) return { ok: false, reason: '낱말을 적어 주세요.' };
  if ([...word].length > config.word_max) {
    return { ok: false, reason: `낱말은 ${config.word_max}자까지 쓸 수 있습니다.` };
  }
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣ ·]+$/.test(word)) {
    return { ok: false, reason: '낱말은 한글로만 적어 주세요.' };
  }
  if (hasBanned(word)) return { ok: false, reason: '쓸 수 없는 말이 들어 있습니다.' };
  return { ok: true, word };
}

/** 뜻. 짧은 한 줄 */
export function checkMeaning(raw) {
  const meaning = String(raw || '').trim().replace(/\s+/g, ' ');
  if ([...meaning].length < config.meaning_min) return { ok: false, reason: '뜻을 조금 더 적어 주세요.' };
  if ([...meaning].length > config.meaning_max) {
    return { ok: false, reason: `뜻은 ${config.meaning_max}자까지 쓸 수 있습니다.` };
  }
  if (LOOKS_PRIVATE.test(meaning)) {
    return { ok: false, reason: '전화번호나 주소 같은 것은 적지 않습니다.' };
  }
  if (hasBanned(meaning)) return { ok: false, reason: '쓸 수 없는 말이 들어 있습니다.' };
  return { ok: true, meaning };
}

export function checkDistrict(raw) {
  const id = String(raw || '');
  return DISTRICT_IDS.has(id) ? { ok: true, district: id } : { ok: false, reason: '어느 구·군에서 들었는지 골라 주세요.' };
}

export function checkPlace(raw) {
  const id = String(raw || '');
  return PLACE_IDS.has(id) ? { ok: true, place: id } : { ok: false, reason: '어디서 들었는지 골라 주세요.' };
}

export function checkRelation(raw) {
  const id = String(raw || '');
  return RELATION_IDS.has(id) ? { ok: true, relation: id } : { ok: false, reason: '누가 들려줬는지 골라 주세요.' };
}

/** 교사가 돌려보낼 때 적는 한 줄 */
export function checkNote(raw) {
  const note = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  return { ok: true, note };
}

/**
 * 얼개 지도에서 핀이 놓일 자리. 같은 낱말은 늘 같은 자리다.
 * @returns {{x:number, y:number}} 0..1 (구역 안 비율)
 */
export function pinSpot(id) {
  let h = 2166136261;
  for (const ch of String(id)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = ((Math.imul(h, 2654435761) >>> 0) % 1000) / 1000;
  return { x: 0.12 + a * 0.76, y: 0.18 + b * 0.64 };
}
