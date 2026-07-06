/**
 * URL 안전성 검사
 * 1) 차단 도메인 목록 (로컬 blocklist)
 * 2) Google Safe Browsing API (환경변수 GOOGLE_SAFE_BROWSING_KEY 설정 시 활성화)
 */

// 알려진 악성/피싱 도메인 패턴 목록
const BLOCKED_PATTERNS = [
  // 내부 네트워크 접근 차단
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/10\.\d+\.\d+\.\d+/,
  /^https?:\/\/192\.168\.\d+\.\d+/,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/,
  /^https?:\/\/169\.254\./,            // 링크로컬 / 클라우드 메타데이터(169.254.169.254)
  /^https?:\/\/\[?[0:]*:1\]?/i,        // IPv6 루프백 ([::1])
  /^https?:\/\/0x[0-9a-f]+/i,          // 16진수 표기 IP
  /^https?:\/\/\d{8,10}(?:[:/]|$)/,    // 10진수 표기 IP (예: 2130706433)

  // 흔한 피싱 키워드 조합
  /paypal.+login|login.+paypal/i,
  /apple.+id.+(verify|confirm|update)/i,
  /account.+suspend/i,
  /verify.+bank|bank.+verify/i,
];

// 차단 TLD / 도메인 목록
const BLOCKED_DOMAINS = [
  'bit.ly.phishing.com',
  // 필요 시 추가
];

/**
 * @param {string} url
 * @returns {{ safe: boolean, reason?: string }}
 */
export async function checkUrlSafety(url) {
  // 1) 로컬 패턴 검사
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(url)) {
      return { safe: false, reason: '허용되지 않는 URL입니다. (내부 네트워크 또는 의심 패턴)' };
    }
  }

  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return { safe: false, reason: '유효하지 않은 URL입니다.' };
  }

  // 2) 차단 도메인 목록 검사
  if (BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
    return { safe: false, reason: '차단된 도메인입니다.' };
  }

  // 3) Google Safe Browsing API (키가 있을 때만)
  if (process.env.GOOGLE_SAFE_BROWSING_KEY) {
    const result = await checkGoogleSafeBrowsing(url);
    if (!result.safe) return result;
  }

  return { safe: true };
}

async function checkGoogleSafeBrowsing(url) {
  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'oesol-shortener', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        }),
      }
    );

    if (!res.ok) return { safe: true }; // API 오류 → 관대하게 허용

    const data = await res.json();
    if (data.matches?.length > 0) {
      return { safe: false, reason: '악성 URL로 감지되었습니다. (Google Safe Browsing)' };
    }

    return { safe: true };
  } catch {
    return { safe: true }; // 네트워크 오류 → 관대하게 허용
  }
}
