// 앱 전역 상수 및 단축 코드 검증 로직

// 관리자 계정 (서버·클라이언트 양쪽에서 공유)
export const ADMIN_EMAIL = 'sirons@usedu.ai.kr';

// 커스텀 코드로 사용할 수 없는 예약어
// (앱 라우트 및 시스템 경로와 충돌하면 단축 링크가 리다이렉트되지 않음)
export const RESERVED_CODES = new Set([
  'login', 'dashboard', 'admin', 'privacy', 'terms',
  'api', 'r', 'auth', '_next', 'static', 'images', 'icons',
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
