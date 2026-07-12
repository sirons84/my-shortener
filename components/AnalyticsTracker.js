'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// 자체 방문 통계 수집기
// - 방문자 ID 쿠키(1년) / 세션 ID 쿠키(마지막 활동 후 30분)
// - 페이지 이동마다 /api/track 에 페이지뷰 기록
// - 페이지 이탈(pagehide/숨김) 시 체류시간을 beacon으로 전송

const VISITOR_COOKIE = 'oesol_vid';
const SESSION_COOKIE = 'oesol_sid';
const SESSION_MINUTES = 30;

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name, value, maxAgeSec) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const currentView = useRef(null); // { id, startedAt }

  useEffect(() => {
    if (!pathname) return;

    // 방문자 ID: 없으면 신규 발급 → 신규 방문자로 집계
    let visitorId = getCookie(VISITOR_COOKIE);
    let isNewVisitor = false;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      isNewVisitor = true;
    }
    setCookie(VISITOR_COOKIE, visitorId, 365 * 24 * 60 * 60);

    // 세션 ID: 30분 비활동 시 만료 → 새 방문으로 집계 (활동마다 만료 연장)
    let sessionId = getCookie(SESSION_COOKIE);
    if (!sessionId) sessionId = crypto.randomUUID();
    setCookie(SESSION_COOKIE, sessionId, SESSION_MINUTES * 60);

    let cancelled = false;
    currentView.current = null;
    const startedAt = Date.now();

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ type: 'view', visitorId, sessionId, path: pathname, isNewVisitor }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data?.id) currentView.current = { id: data.id, startedAt };
      })
      .catch(() => {});

    // 이탈 시 체류시간 전송 (sendBeacon은 페이지 종료 중에도 전송 보장)
    const sendLeave = () => {
      const view = currentView.current;
      if (!view) return;
      const duration = Math.round((Date.now() - view.startedAt) / 1000);
      const payload = JSON.stringify({ type: 'leave', id: view.id, duration });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {});
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') sendLeave();
    };
    window.addEventListener('pagehide', sendLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      sendLeave(); // 라우트 이동 시 직전 페이지 체류시간 기록
      window.removeEventListener('pagehide', sendLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);

  return null;
}
