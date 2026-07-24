import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';
import { isAdmin } from '../../../../lib/constants';

async function verifyAdmin(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !isAdmin(user.email)) return null;
  return user;
}

export async function GET(req) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 전체 URL 수
  const { count: totalUrls } = await supabaseAdmin
    .from('urls')
    .select('*', { count: 'exact', head: true });

  // 오늘 생성된 URL 수
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: urlsToday } = await supabaseAdmin
    .from('urls')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  // 전체 클릭 수
  const { data: clickSum } = await supabaseAdmin
    .from('urls')
    .select('count');
  const totalClicks = (clickSum || []).reduce((sum, r) => sum + (r.count || 0), 0);

  // 전체 유저 수
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10000 });
  const totalUsers = users?.length || 0;

  // 최근 30일 일별 URL 생성 수
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const { data: recentUrls } = await supabaseAdmin
    .from('urls')
    .select('created_at')
    .gte('created_at', since.toISOString());

  const dateMap = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    dateMap[d.toISOString().split('T')[0]] = 0;
  }
  (recentUrls || []).forEach(({ created_at }) => {
    const date = created_at.split('T')[0];
    if (date in dateMap) dateMap[date]++;
  });
  const dailyUrls = Object.entries(dateMap).map(([date, count]) => ({
    date: date.slice(5),
    count,
  }));

  return NextResponse.json({ totalUrls, urlsToday, totalClicks, totalUsers, dailyUrls });
}
