import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';

export async function GET(req, { params }) {
  const { code } = await params;

  // 인증 확인
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 해당 URL이 요청자 소유인지 확인
  const { data: urlData } = await supabaseAdmin
    .from('urls')
    .select('user_id, count')
    .eq('code', decodeURIComponent(code))
    .single();

  const isAdmin = user.email === 'sirons@usedu.ai.kr';
  if (!urlData || (urlData.user_id !== user.id && !isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 최근 30일 클릭 데이터 조회
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const { data: clicks, error } = await supabaseAdmin
    .from('url_clicks')
    .select('clicked_at')
    .eq('code', decodeURIComponent(code))
    .gte('clicked_at', since.toISOString());

  // url_clicks 테이블이 없으면 빈 데이터 반환
  if (error) {
    return NextResponse.json({ stats: [], totalClicks: urlData.count || 0, unavailable: true });
  }

  // 날짜별 집계 (최근 30일 전체 날짜 포함)
  const dateMap = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    dateMap[d.toISOString().split('T')[0]] = 0;
  }

  (clicks || []).forEach(({ clicked_at }) => {
    const date = clicked_at.split('T')[0];
    if (date in dateMap) dateMap[date]++;
  });

  const stats = Object.entries(dateMap).map(([date, count]) => ({
    date: date.slice(5), // MM-DD 형식
    clicks: count,
  }));

  return NextResponse.json({ stats, totalClicks: urlData.count || 0 });
}
