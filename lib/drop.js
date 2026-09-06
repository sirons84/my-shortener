// 외솔 드롭(베타) 공용 로직
//
// 핵심 원칙: 사용자가 올린 HTML 은 절대로 외솔.한국 오리진에서 실행되면 안 된다.
// 본 사이트 오리진에는 로그인 세션 쿠키(sb-*-auth-token)가 있고 httpOnly 가
// 아니어서, 같은 오리진에서 남의 스크립트가 돌면 접속한 교사의 계정을 그대로
// 가져갈 수 있다. 그래서 실제 HTML 은 아래 DROP_ORIGIN 에서만 서빙하고,
// 외솔.한국/<code> 는 그것을 전체화면 iframe 으로 감싼 껍데기만 응답한다.

/** 유지 기간 선택지 (단축 주소와 결을 맞춘다) */
export const DROP_EXPIRY_OPTIONS = [
  { value: '7d', label: '1주일' },
  { value: '30d', label: '1개월' },
  { value: '180d', label: '6개월' },
  { value: '365d', label: '1년' },
  { value: 'forever', label: '무제한 (영구)' },
];

/** 유지 기간 문자열을 만료 시각으로 변환 (무제한이면 null) */
export function calculateDropExpiry(option) {
  if (!option || option === 'forever') return null;
  if (!DROP_EXPIRY_OPTIONS.some((o) => o.value === option)) return null;

  const days = { '7d': 7, '30d': 30, '180d': 180, '365d': 365 }[option];
  const at = new Date();
  at.setDate(at.getDate() + days);
  return at.toISOString();
}

/** 만료 여부 */
export function isDropExpired(expiresAt) {
  return !!expiresAt && new Date(expiresAt) <= new Date();
}

/** 업로드 가능한 HTML 최대 크기 (1MB) */
export const DROP_MAX_BYTES = 1024 * 1024;

/**
 * 드롭 콘텐츠를 서빙할 오리진.
 * 예) https://oesol-drop.vercel.app
 * 설정되지 않았거나 본 사이트와 같으면 기능을 끈다(안전한 기본값).
 */
export function getDropOrigin() {
  const raw = (process.env.NEXT_PUBLIC_DROP_ORIGIN || '').trim().replace(/\/+$/, '');
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/** 요청 호스트가 드롭 콘텐츠 오리진인지 확인 (본 사이트에서의 원본 서빙 차단) */
export function isDropOriginRequest(req) {
  const origin = getDropOrigin();
  if (!origin) return false;
  const host = req.headers.get('host');
  if (!host) return false;
  return host.toLowerCase() === new URL(origin).host.toLowerCase();
}

/** HTML 텍스트 노드/속성에 넣기 위한 이스케이프 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 드롭 콘텐츠에 적용할 CSP.
 * 바이브 코딩 페이지는 대개 CDN 스크립트를 쓰므로 널리 쓰이는 CDN 만 허용한다.
 * 이 오리진에는 세션이나 개인정보가 없어서 connect-src 는 열어둔다.
 */
export function dropContentCsp(frameAncestors) {
  return [
    "default-src 'self' data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://cdn.tailwindcss.com https://code.jquery.com https://esm.sh",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src * data: blob:",
    "font-src * data:",
    "media-src * data: blob:",
    "connect-src *",
    "frame-src *",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
}

/**
 * 외솔.한국/<code> 가 응답할 껍데기 HTML.
 * 주소창은 그대로 두고, 안쪽 내용만 다른 오리진에서 불러온다.
 *
 * sandbox 에 allow-same-origin 을 주는 이유: 드롭 콘텐츠가 자기 오리진의
 * localStorage 나 fetch 를 쓸 수 있게 하기 위함이다. 부모(외솔.한국)와는
 * 오리진이 다르므로 본 사이트 세션에는 접근할 수 없다.
 */
export function buildDropShellHtml({ code, title, origin }) {
  const safeTitle = escapeHtml(title || code);
  const src = `${origin}/d/${encodeURIComponent(code)}`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${safeTitle}</title>
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #fff; }
  /* iOS 사파리는 주소창 때문에 100% 가 잘려서 dvh 를 함께 준다 */
  body { height: 100dvh; }
  iframe { display: block; border: 0; width: 100%; height: 100%; }
</style>
</head>
<body>
<iframe
  src="${escapeHtml(src)}"
  title="${safeTitle}"
  sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox allow-same-origin"
  allow="clipboard-write; fullscreen"
></iframe>
</body>
</html>`;
}

/** 드롭이 없거나 내려간 경우의 안내 페이지 */
export function buildDropNoticeHtml(message) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>외솔 드롭</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         font-family: system-ui, -apple-system, "Malgun Gothic", sans-serif; background: #f8fafc; color: #334155; }
  .box { text-align: center; padding: 32px; }
  .box p { margin: 0 0 16px; font-size: 16px; }
  .box a { color: #2563eb; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
<div class="box">
  <p>${escapeHtml(message)}</p>
  <a href="https://xn--im4bl3g.xn--3e0b707e">외솔.한국으로 가기</a>
</div>
</body>
</html>`;
}
