// 간단한 인메모리 슬라이딩 윈도우 레이트 리미터.
//
// 주의: 서버리스 환경에서는 인스턴스마다 상태가 분리되므로 완벽한 방어는 아니다.
// 다만 웜 인스턴스가 재사용될 때(Fluid Compute 등) 짧은 시간의 반복적 남용을
// 완화하는 방어선 역할을 한다. 강한 보장이 필요하면 Vercel KV/Redis 기반으로 교체할 것.

const store = new Map();

/**
 * @param {string} key      제한 대상 식별자 (예: `shorten:1.2.3.4`)
 * @param {{ max: number, windowMs: number }} opts
 * @returns {{ allowed: boolean, retryAfterMs?: number }}
 */
export function rateLimit(key, { max, windowMs }) {
  const now = Date.now();
  const hits = (store.get(key) || []).filter((ts) => now - ts < windowMs);

  if (hits.length >= max) {
    return { allowed: false, retryAfterMs: windowMs - (now - hits[0]) };
  }

  hits.push(now);
  store.set(key, hits);

  // 메모리 누수 방지를 위해 가끔 오래된 키 정리
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (v.every((ts) => now - ts >= windowMs)) store.delete(k);
    }
  }

  return { allowed: true };
}

/** 요청에서 클라이언트 IP 추출 */
export function getClientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
