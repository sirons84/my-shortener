import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';
import { isAdmin } from '../../../../lib/constants';

// 관리자용 사용자 목록 — 단축 URL 수·클릭, 누리집 펴내기 배포 수·조회.
// 기록 곳간 표 수는 /api/admin/stats 의 db.byOwner 를 화면에서 합쳐 쓴다.
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [{ data: { users } }, { data: urlCounts }, { data: dropRows }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10000 }),
    supabaseAdmin.from('urls').select('user_id, count'),
    supabaseAdmin.from('drops').select('user_id, view_count'),
  ]);

  // 유저별 URL 수·클릭
  const countMap = {};
  (urlCounts || []).forEach(({ user_id, count }) => {
    if (!countMap[user_id]) countMap[user_id] = { urlCount: 0, totalClicks: 0 };
    countMap[user_id].urlCount++;
    countMap[user_id].totalClicks += count || 0;
  });

  // 유저별 드롭 배포 수·조회
  const dropMap = {};
  (dropRows || []).forEach(({ user_id, view_count }) => {
    if (!dropMap[user_id]) dropMap[user_id] = { dropCount: 0, dropViews: 0 };
    dropMap[user_id].dropCount++;
    dropMap[user_id].dropViews += view_count || 0;
  });

  const result = (users || []).map(u => ({
    id: u.id,
    email: u.email,
    createdAt: u.created_at,
    urlCount: countMap[u.id]?.urlCount || 0,
    totalClicks: countMap[u.id]?.totalClicks || 0,
    dropCount: dropMap[u.id]?.dropCount || 0,
    dropViews: dropMap[u.id]?.dropViews || 0,
  })).sort((a, b) => b.urlCount - a.urlCount);

  return NextResponse.json(result);
}
