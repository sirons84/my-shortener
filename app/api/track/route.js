import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { rateLimit, getClientIp } from '../../../lib/rateLimit';

// 자체 방문 통계 수집 엔드포인트
// POST { type: 'view', visitorId, sessionId, path, isNewVisitor } → 페이지뷰 기록, { id } 반환
// POST { type: 'leave', id, duration }                            → 해당 페이지뷰의 체류시간(초) 갱신

export const dynamic = 'force-dynamic';

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|monitor|preview|scrape|curl|wget|python-requests/i;

function detectDevice(ua) {
  if (!ua) return '기타';
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) return '태블릿';
  if (/android(?!.*mobile)/i.test(ua)) return '태블릿'; // 모바일 표기 없는 Android는 태블릿
  if (/mobile|iphone|android|blackberry|windows phone|opera mini/i.test(ua)) return '스마트폰';
  if (/windows|macintosh|linux|cros/i.test(ua)) return 'PC';
  return '기타';
}

export async function POST(req) {
  // 봇 트래픽은 통계에서 제외
  const ua = req.headers.get('user-agent') || '';
  if (!ua || BOT_RE.test(ua)) {
    return new NextResponse(null, { status: 204 });
  }

  // 남용 방지 (공용 IP 고려해 넉넉하게: 10분당 600건)
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`track:${ip}`, { max: 600, windowMs: 10 * 60 * 1000 });
  if (!allowed) return new NextResponse(null, { status: 204 });

  let body;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  try {
    if (body.type === 'view') {
      const { visitorId, sessionId, path, isNewVisitor } = body;
      if (!ID_RE.test(visitorId || '') || !ID_RE.test(sessionId || '')) {
        return new NextResponse(null, { status: 204 });
      }
      const safePath = typeof path === 'string' ? path.slice(0, 300) : '/';

      const { data, error } = await supabaseAdmin
        .from('page_views')
        .insert({
          visitor_id: visitorId,
          session_id: sessionId,
          path: safePath,
          device: detectDevice(ua),
          is_new_visitor: Boolean(isNewVisitor),
        })
        .select('id')
        .single();

      if (error) return new NextResponse(null, { status: 204 });
      return NextResponse.json({ id: data.id });
    }

    if (body.type === 'leave') {
      const { id, duration } = body;
      if (!ID_RE.test(id || '')) return new NextResponse(null, { status: 204 });
      // 0초 ~ 2시간 범위로 제한 (백그라운드 탭 등 비정상 값 차단)
      const sec = Math.min(Math.max(Number(duration) || 0, 0), 7200);

      await supabaseAdmin
        .from('page_views')
        .update({ duration_sec: sec })
        .eq('id', id)
        .or(`duration_sec.is.null,duration_sec.lt.${sec}`); // 큰 값으로만 갱신

      return new NextResponse(null, { status: 204 });
    }
  } catch {
    // 수집 실패가 서비스에 영향을 주지 않도록 조용히 무시 (테이블 미생성 등)
  }

  return new NextResponse(null, { status: 204 });
}
