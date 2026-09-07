// 외솔 배움터 — 별명 검사 (기획서 §3-5)
//
// 초등학생이 쓰는 열린 서비스다. 실명을 받지 않고, 별명은 4자로 끊고,
// 걸러야 할 말은 걸러 낸다. 화면과 서버가 같은 규칙을 봐야 하므로
// 이 파일은 양쪽에서 함께 쓴다.

export const NICK_MAX = 4;
export const SCHOOL_MAX = 10;

// 자음·모음만 쓴 우회(ㅅㅂ)와 사이 글자를 넣은 우회(시1발)를 함께 막으려고
// 검사 전에 한글·숫자·영문 말고는 모두 떼어 낸다.
const STRIP = /[^가-힣ㄱ-ㅎㅏ-ㅣa-z0-9]/gi;

// 짧게 둔다. 목록을 길게 늘리면 애먼 별명이 걸리고, 어차피 다 막지는 못한다.
// 막지 못한 것은 교사가 기록 옆 삭제 버튼으로 지운다.
const BANNED = [
  '시발', '씨발', '시바', '씹', 'ㅅㅂ', '병신', 'ㅂㅅ', '지랄', '개새', '새끼',
  '좆', '존나', 'ㅈㄴ', '느금', '니애미', '엄창', '창녀', '강간', '섹스', 'sex',
  '자살', '죽어', '꺼져', '등신', '멍청', '바보', '똥', 'fuck', 'shit', 'bitch',
  '일베', '한남', '김치녀', '틀딱', '급식충', '장애인', '찐따', '왕따',
];

/** 검사에 쓰는 꼴로 줄인다 */
function fold(text) {
  return String(text || '').toLowerCase().replace(STRIP, '');
}

/** 걸러야 할 말이 들어 있는가. 사이에 숫자를 끼운 우회(시1발)도 함께 본다 */
function banned(text) {
  const folded = fold(text);
  const noDigits = folded.replace(/[0-9]/g, '');
  return BANNED.some((word) => folded.includes(word) || noDigits.includes(word));
}

/**
 * 별명을 다듬고 검사한다.
 * @returns {{ ok: boolean, nick?: string, reason?: string }}
 */
export function checkNick(raw) {
  const nick = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!nick) return { ok: false, reason: '별명을 적어 주세요.' };
  if ([...nick].length > NICK_MAX) {
    return { ok: false, reason: `별명은 ${NICK_MAX}자까지 쓸 수 있습니다.` };
  }

  if (!fold(nick)) return { ok: false, reason: '별명에 글자를 넣어 주세요.' };
  if (banned(nick)) {
    return { ok: false, reason: '쓸 수 없는 말이 들어 있습니다. 다른 별명을 지어 주세요.' };
  }

  return { ok: true, nick };
}

/** 학교는 약칭만 받는다. 주소도 전체 이름도 받지 않는다 */
export function checkSchool(raw) {
  const school = String(raw || '').trim().replace(/\s+/g, '');
  if (!school) return { ok: true, school: '' };
  if ([...school].length > SCHOOL_MAX) {
    return { ok: false, reason: `학교는 ${SCHOOL_MAX}자까지 쓸 수 있습니다.` };
  }
  if (banned(school)) {
    return { ok: false, reason: '쓸 수 없는 말이 들어 있습니다.' };
  }
  return { ok: true, school };
}

/** 학년·반. 0 은 "적지 않음" */
export function checkNumber(raw, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, Math.floor(n)));
}
