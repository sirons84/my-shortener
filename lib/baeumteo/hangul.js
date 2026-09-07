// 외솔 배움터 — 한글 조사 고르기
//
// 게임 이름이 데이터에서 오므로 "우리말 지키기이(가) 열립니다" 같은 말이 나온다.
// 우리말을 지키자는 곳에서 그런 문장을 내보낼 수는 없다.

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;

/** 마지막 글자에 받침이 있는지. 한글이 아니면 null (모르면 고르지 않는다) */
export function hasJongseong(word) {
  const text = String(word || '').trim();
  if (!text) return null;
  const code = text.charCodeAt(text.length - 1);
  if (code < HANGUL_FIRST || code > HANGUL_LAST) return null;
  return (code - HANGUL_FIRST) % 28 !== 0;
}

/**
 * 앞말에 맞는 조사를 고른다.
 *   josa('우리말 지키기', '이/가') → '가'
 *   josa('잃어버린 원고', '을/를')  → '를'
 * 한글이 아니어서 알 수 없으면 받침 있는 쪽을 쓴다.
 */
export function josa(word, pair) {
  const [withJong, withoutJong] = pair.split('/');
  return hasJongseong(word) === false ? withoutJong : withJong;
}
