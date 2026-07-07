import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// 메인 화면 공개 통계 (RLS 우회를 위해 서비스 롤로 서버에서 집계)
export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  try {
    // 사용 중인(만료 안 된) 단축 주소 수
    const { count: activeUrls } = await supabaseAdmin
      .from('urls')
      .select('*', { count: 'exact', head: true })
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

    // 총 리디렉션 수 — url_clicks 이벤트 기록 기준
    // (urls.count는 최근 추가돼 과거 이력이 없으므로 사용하지 않음)
    const { count: totalRedirects } = await supabaseAdmin
      .from('url_clicks')
      .select('*', { count: 'exact', head: true });

    // 오늘 방문 수
    const { count: todayVisits } = await supabaseAdmin
      .from('url_clicks')
      .select('*', { count: 'exact', head: true })
      .gte('clicked_at', todayStart.toISOString());

    // 총 회원 수 — 목록은 1명만 받고 페이지네이션의 total만 사용
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const totalUsers = usersPage?.total ?? usersPage?.users?.length ?? 0;

    return NextResponse.json({
      activeUrls: activeUrls || 0,
      totalRedirects: totalRedirects || 0,
      todayVisits: todayVisits || 0,
      totalUsers,
    });
  } catch (e) {
    return NextResponse.json({ activeUrls: 0, totalRedirects: 0, todayVisits: 0, totalUsers: 0 });
  }
}
