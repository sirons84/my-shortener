// 외솔 드롭 콘텐츠 서빙
//
// 여기서만 사용자가 올린 HTML 원본을 응답한다.
// 반드시 본 사이트와 다른 오리진(NEXT_PUBLIC_DROP_ORIGIN)에서만 열리도록 막는다.
// 외솔.한국/d/<code> 로 들어오면 404 — 그 오리진에서 실행되면 세션이 노출된다.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import {
  getDropOrigin,
  isDropOriginRequest,
  dropContentCsp,
  buildDropNoticeHtml,
  isDropExpired,
} from '../../../lib/drop';

export const dynamic = 'force-dynamic';

// 껍데기를 띄울 수 있는(=iframe 부모가 될 수 있는) 오리진
const FRAME_ANCESTORS =
  process.env.NEXT_PUBLIC_SITE_ORIGINS ||
  "'self' https://xn--im4bl3g.xn--3e0b707e https://www.xn--im4bl3g.xn--3e0b707e";

function notice(message, status) {
  return new Response(buildDropNoticeHtml(message), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(req, { params }) {
  const dropOrigin = getDropOrigin();

  // 드롭 오리진이 설정되지 않았으면 기능 자체를 끈다 (원본을 본 사이트에서 서빙하지 않기 위함)
  if (!dropOrigin) {
    return notice('외솔 드롭이 아직 준비되지 않았습니다.', 503);
  }

  // 본 사이트 호스트로 들어온 요청은 거부 (오리진 격리의 핵심)
  if (!isDropOriginRequest(req)) {
    return notice('잘못된 접근입니다.', 404);
  }

  const { code } = await params;
  if (!code) return notice('주소가 올바르지 않습니다.', 404);

  const targetCode = decodeURIComponent(code);

  const { data, error } = await supabaseAdmin
    .from('drops')
    .select('html, is_blocked, expires_at')
    .eq('code', targetCode)
    .single();

  if (error || !data) {
    return notice('존재하지 않는 페이지입니다.', 404);
  }

  if (data.is_blocked) {
    return notice('관리자에 의해 게시가 중단된 페이지입니다.', 403);
  }

  if (isDropExpired(data.expires_at)) {
    return notice('게시 기간이 끝난 페이지입니다.', 404);
  }

  return new Response(data.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': dropContentCsp(FRAME_ANCESTORS),
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      // 짧게만 캐시 — 교체 후 반영이 너무 늦지 않도록
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
    },
  });
}
