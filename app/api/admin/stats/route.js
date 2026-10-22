import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';
import { isAdmin } from '../../../../lib/constants';
import { dbOrigin, dbEnabled } from '../../../../lib/oesolDb';

// 관리자 대시보드 요약 통계 — 단축 URL · 외솔 드롭 · 외솔 DB
// 날짜 경계는 모두 한국 시간(KST) 기준.
export const dynamic = 'force-dynamic';

const DAYS = 30;
const KST_OFFSET = 9 * 3600 * 1000;

async function verifyAdmin(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !isAdmin(user.email)) return null;
  return user;
}

/** ISO 시각 → KST 날짜 문자열 (YYYY-MM-DD) */
function kstDate(iso) {
  return new Date(new Date(iso).getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

/** 오늘 0시(KST)의 ISO 시각 */
function kstTodayStart() {
  const nowKst = new Date(Date.now() + KST_OFFSET);
  const dayStartKst = Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth(), nowKst.getUTCDate());
  return new Date(dayStartKst - KST_OFFSET);
}

/** 최근 30일 날짜 목록 (KST, 오래된 날부터) */
function recentDays() {
  const nowKst = new Date(Date.now() + KST_OFFSET);
  const out = [];
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    out.push(new Date(nowKst.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

/** 외솔 DB 서버 전체 집계. 꺼져 있거나 실패하면 null (대시보드는 "응답 없음"으로 표시) */
async function fetchDbStats() {
  if (!dbEnabled()) return null;
  try {
    const res = await fetch(`${dbOrigin()}/admin/stats`, {
      headers: { 'X-Admin-Secret': process.env.OESOL_DB_ADMIN_SECRET },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('oesol-db stats error', e?.message);
    return null;
  }
}

export async function GET(req) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const todayStart = kstTodayStart();
  const since = new Date(todayStart.getTime() - (DAYS - 1) * 86400000);

  const [
    { count: totalUrls },
    { count: urlsToday },
    { data: urlRows },
    { data: recentUrls },
    { data: dropRows },
    { data: { users } },
    db,
  ] = await Promise.all([
    supabaseAdmin.from('urls').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('urls').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabaseAdmin.from('urls').select('count'),
    supabaseAdmin.from('urls').select('created_at').gte('created_at', since.toISOString()),
    supabaseAdmin.from('drops').select('size_bytes, view_count, created_at, is_blocked'),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10000 }),
    fetchDbStats(),
  ]);

  const totalClicks = (urlRows || []).reduce((sum, r) => sum + (r.count || 0), 0);
  const totalUsers = users?.length || 0;

  // 외솔 드롭 집계
  const drops = dropRows || [];
  const dropStats = {
    total: drops.length,
    today: drops.filter((d) => new Date(d.created_at) >= todayStart).length,
    views: drops.reduce((s, d) => s + (d.view_count || 0), 0),
    bytes: drops.reduce((s, d) => s + (d.size_bytes || 0), 0),
    blocked: drops.filter((d) => d.is_blocked).length,
  };

  // 최근 30일 일별 추이 (URL 생성, 드롭 배포, DB 표 생성, DB 기록 수)
  const days = recentDays();
  const urlMap = Object.fromEntries(days.map((d) => [d, 0]));
  const dropMap = Object.fromEntries(days.map((d) => [d, 0]));
  (recentUrls || []).forEach(({ created_at }) => {
    const d = kstDate(created_at);
    if (d in urlMap) urlMap[d] += 1;
  });
  drops.forEach(({ created_at }) => {
    const d = kstDate(created_at);
    if (d in dropMap) dropMap[d] += 1;
  });
  const dbDaily = Object.fromEntries((db?.daily || []).map((r) => [r.date, r]));
  const daily = days.map((d) => ({
    date: d.slice(5),
    urls: urlMap[d],
    drops: dropMap[d],
    dbTables: dbDaily[d]?.tables || 0,
    dbRows: dbDaily[d]?.rows || 0,
  }));

  return NextResponse.json({
    totalUrls,
    urlsToday,
    totalClicks,
    totalUsers,
    drops: dropStats,
    // 외솔 DB 서버가 응답하지 않으면 null
    db: db
      ? {
          tables: db.tables,
          rows: db.rows,
          owners: db.owners,
          locked: db.locked,
          tablesToday: db.tablesToday,
          rowsToday: db.rowsToday,
          byOwner: db.byOwner || {},
        }
      : null,
    daily,
  });
}
