import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// 메인 화면 공개 통계 (RLS 우회를 위해 서비스 롤로 서버에서 집계)
export const dynamic = 'force-dynamic';

export async function GET() {
  const nowIso = new Date().toISOString();
  try {
    // 사용 중인(만료 안 된) 단축 주소 수
    const { count: activeUrls } = await supabaseAdmin
      .from('urls')
      .select('*', { count: 'exact', head: true })
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

    // 총 리디렉션 수 (urls.count 합계)
    const { data: rows } = await supabaseAdmin.from('urls').select('count');
    const totalRedirects = (rows || []).reduce((s, r) => s + (r.count || 0), 0);

    // 방문(클릭) 기록 수 — url_clicks 이벤트 수
    const { count: totalVisits } = await supabaseAdmin
      .from('url_clicks')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      activeUrls: activeUrls || 0,
      totalRedirects,
      totalVisits: totalVisits || 0,
    });
  } catch (e) {
    return NextResponse.json({ activeUrls: 0, totalRedirects: 0, totalVisits: 0 });
  }
}
