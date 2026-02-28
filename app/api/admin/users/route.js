import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';

const ADMIN_EMAIL = 'sirons@usedu.ai.kr';

export async function GET(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 전체 유저 목록
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10000 });

  // 유저별 URL 수
  const { data: urlCounts } = await supabaseAdmin
    .from('urls')
    .select('user_id, count');

  const countMap = {};
  (urlCounts || []).forEach(({ user_id, count }) => {
    if (!countMap[user_id]) countMap[user_id] = { urlCount: 0, totalClicks: 0 };
    countMap[user_id].urlCount++;
    countMap[user_id].totalClicks += count || 0;
  });

  const result = (users || []).map(u => ({
    id: u.id,
    email: u.email,
    createdAt: u.created_at,
    urlCount: countMap[u.id]?.urlCount || 0,
    totalClicks: countMap[u.id]?.totalClicks || 0,
  })).sort((a, b) => b.urlCount - a.urlCount);

  return NextResponse.json(result);
}
