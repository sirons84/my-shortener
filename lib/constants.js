// 앱 전역 상수 및 단축 코드 검증 로직

// 관리자 계정 (서버·클라이언트 양쪽에서 공유)
export const ADMIN_EMAILS = [
  'sirons@usedu.ai.kr',
  'like0617@usedu.ai.kr',
];

/**
 * 관리자 여부 확인
 * @param {string | null | undefined} email
 * @returns {boolean}
 */
export function isAdmin(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}

// ── 회원 등급과 한도 ──────────────────────────────────────────
// 등급은 auth.users 의 app_metadata.tier 에 저장한다(관리자 화면에서 바꿈. 서버만 쓸 수 있는 필드라 사용자가 못 고친다).
// app_metadata.limits = { urls, drops, db } 로 개별 계정만 따로 한도를 줄 수도 있다(값 null = 무제한, 키 없음 = 등급 기본).
export const TIERS = {
  admin:    { label: '관리자', urls: null, drops: null, db: null },
  vvip:     { label: '외솔',   urls: 300,  drops: 50,   db: 50 },
  vip:      { label: '한국',   urls: 200,  drops: 30,   db: 30 },
  training: { label: '연수',   urls: 100,  drops: 20,   db: 20 },
  teacher:  { label: '울산',   urls: 50,   drops: 5,    db: 5 },
  basic:    { label: '일반',   urls: 30,   drops: 3,    db: 3 },
};
export const TIER_ORDER = ['admin', 'vvip', 'vip', 'training', 'teacher', 'basic'];

// 등급을 아직 정해 주지 않은 계정의 기본 등급. 예전 개별 상향 계정은 한국(vip) 등급으로 본다.
const LEGACY_VIP = new Set([
  'rlawngml1217@usedu.ai.kr', 'myjosephin@usedu.ai.kr', 'mossy33@usedu.ai.kr',
  'gpdhkgus@naver.com', '0827minhye@gmail.com', 'gwsh1590@use.go.kr',
]);

/**
 * 계정의 등급 키. user 는 Supabase user 객체(app_metadata·user_metadata·email 사용).
 * @returns {'admin'|'vip'|'teacher'|'basic'}
 */
export function getTier(user) {
  const email = (user?.email || '').trim().toLowerCase();
  if (isAdmin(user?.email)) return 'admin';
  const saved = user?.app_metadata?.tier;
  if (saved && TIERS[saved] && saved !== 'admin') return saved;
  if (LEGACY_VIP.has(email)) return 'vip';
  if (email.endsWith('@usedu.ai.kr') || user?.user_metadata?.region === '울산광역시교육청') return 'teacher';
  return 'basic';
}

/**
 * 계정에 적용되는 한도. 등급 기본값 위에 개별 한도(app_metadata.limits)를 덮는다.
 * @returns {{ tier: string, label: string, urls: number|null, drops: number|null, db: number|null, custom: boolean }}
 */
export function getLimits(user) {
  const tier = getTier(user);
  const base = TIERS[tier];
  const over = (tier !== 'admin' && user?.app_metadata?.limits) || {};
  const pick = (k) => (Object.prototype.hasOwnProperty.call(over, k) ? normalizeLimit(over[k]) : base[k]);
  return {
    tier, label: base.label,
    urls: pick('urls'), drops: pick('drops'), db: pick('db'),
    custom: ['urls', 'drops', 'db'].some((k) => Object.prototype.hasOwnProperty.call(over, k)),
  };
}

/** 한도 값 정리: null/undefined/음수 → 무제한(null), 그 외 정수 */
export function normalizeLimit(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** 단축 URL 생성 한도 (무제한이면 null) */
export function getCreationLimit(user) { return getLimits(user).urls; }
/** 누리집 펴내기 개수 한도 (무제한이면 null) */
export function getDropLimit(user) { return getLimits(user).drops; }
/** 기록 곳간 표 개수 한도 (무제한이면 null). 본체가 로그인 확인 때 기록 곳간 서버에 넘겨 준다 */
export function getDbLimit(user) { return getLimits(user).db; }

// 커스텀 코드로 사용할 수 없는 예약어
// (앱 라우트 및 시스템 경로와 충돌하면 단축 링크가 리다이렉트되지 않음)
export const RESERVED_CODES = new Set([
  'login', 'dashboard', 'admin', 'privacy', 'terms', '배움터', 'baeumteo',
  'api', 'r', 'd', 'auth', 'drop', 'drops', 'db', 'v1', '_next', 'static', 'images', 'icons',
  'favicon.ico', 'robots.txt', 'sitemap.xml',
]);

/**
 * 사용자 지정 단축 코드 검증
 * @param {string} raw
 * @returns {{ valid: true, code: string } | { valid: false, reason: string }}
 */
export function validateCustomCode(raw) {
  const code = (raw || '').trim();

  if (!code) return { valid: false, reason: '단축 코드가 비어 있습니다.' };
  if (code.length > 50) return { valid: false, reason: '단축 코드는 50자 이하여야 합니다.' };

  // 영문/숫자/한글 등 문자, 숫자, 하이픈(-), 밑줄(_)만 허용
  // (공백·슬래시·점·물음표 등은 URL/라우팅을 깨뜨리므로 불허)
  if (!/^[\p{L}\p{N}_-]+$/u.test(code)) {
    return { valid: false, reason: '단축 코드에는 문자, 숫자, 하이픈(-), 밑줄(_)만 사용할 수 있습니다.' };
  }

  if (RESERVED_CODES.has(code.toLowerCase())) {
    return { valid: false, reason: '사용할 수 없는 예약된 코드입니다.' };
  }

  return { valid: true, code };
}
