// 외솔 배움터 — 반 코드 (기획서 §7, 데이터설계 §5)
//
// 형식 `약칭-학년-반-4자`. 예: 화진-5-1-K2P7
// 교사가 만들고 학생이 받아 적는다. 반 코드에는 학교 약칭 말고 아무것도 없다.

export const CLASS_CODE_TAIL = 4;

// 헷갈리는 글자를 뺀다. 칠판에 적은 O 와 0, I 와 1 을 아이가 잘못 보면
// 반 전체가 다른 반에 기록을 남긴다.
const TAIL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const PATTERN = /^([가-힣A-Za-z]{1,10})-([1-6])-([1-9]|[12][0-9]|30)-([A-Z0-9]{4})$/;

/** 뒤 4자를 만든다. 브라우저·서버 어느 쪽에서 불러도 된다 */
export function makeTail(random = () => Math.random()) {
  let tail = '';
  for (let i = 0; i < CLASS_CODE_TAIL; i += 1) {
    tail += TAIL_ALPHABET[Math.floor(random() * TAIL_ALPHABET.length)];
  }
  return tail;
}

/** 반 코드를 짓는다 */
export function makeClassCode(school, grade, klass, random) {
  return `${school}-${grade}-${klass}-${makeTail(random)}`;
}

/** 적어 넣은 코드를 다듬는다. 소문자·앞뒤 빈칸·전각 붙임표를 받아 준다 */
export function normalizeClassCode(raw) {
  return String(raw || '')
    .trim()
    .replace(/[－—–ー]/g, '-')
    .replace(/\s+/g, '')
    .replace(/-([a-z0-9]{4})$/i, (_, tail) => `-${tail.toUpperCase()}`);
}

/**
 * 반 코드를 뜯어 본다.
 * @returns {{ ok: boolean, code?: string, school?: string, grade?: number, class?: number, reason?: string }}
 */
export function parseClassCode(raw) {
  const code = normalizeClassCode(raw);
  const match = PATTERN.exec(code);
  if (!match) {
    return { ok: false, reason: '반 코드 모양이 맞지 않습니다. 예: 화진-5-1-K2P7' };
  }
  return {
    ok: true,
    code,
    school: match[1],
    grade: Number(match[2]),
    class: Number(match[3]),
  };
}
