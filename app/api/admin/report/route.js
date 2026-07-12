import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';
import { ADMIN_EMAIL } from '../../../../lib/constants';

// 월간 이용 통계 보고서(xlsx) 생성 — 교육청 보고용
// GET /api/admin/report?month=YYYY-MM (생략 시 지난달)

export const dynamic = 'force-dynamic';

async function verifyAdmin(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

// KST 기준 날짜 문자열(YYYY-MM-DD)
function toKstDateStr(isoString) {
  const d = new Date(new Date(isoString).getTime() + 9 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

// supabase는 한 번에 최대 1000행만 반환하므로 페이지 단위로 전부 수집
async function fetchAll(buildQuery) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function GET(req) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 대상 월 결정 (기본: 지난달, KST 기준)
  const monthParam = req.nextUrl.searchParams.get('month');
  let year, month;
  if (monthParam) {
    const m = /^(\d{4})-(\d{2})$/.exec(monthParam);
    if (!m) return NextResponse.json({ error: 'month는 YYYY-MM 형식이어야 합니다.' }, { status: 400 });
    year = Number(m[1]);
    month = Number(m[2]);
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: '유효하지 않은 월입니다.' }, { status: 400 });
    }
  } else {
    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    year = nowKst.getUTCFullYear();
    month = nowKst.getUTCMonth(); // 0-based → 지난달 번호
    if (month === 0) { year -= 1; month = 12; }
  }

  const mm = String(month).padStart(2, '0');
  const monthStart = new Date(`${year}-${mm}-01T00:00:00+09:00`);
  const monthEnd = month === 12
    ? new Date(`${year + 1}-01-01T00:00:00+09:00`)
    : new Date(`${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00+09:00`);
  const daysInMonth = new Date(year, month, 0).getDate();

  let urls, clicks;
  try {
    [urls, clicks] = await Promise.all([
      fetchAll(() => supabaseAdmin
        .from('urls')
        .select('code, url, created_at, count')
        .order('created_at', { ascending: true })),
      fetchAll(() => supabaseAdmin
        .from('url_clicks')
        .select('code, clicked_at')
        .gte('clicked_at', monthStart.toISOString())
        .lt('clicked_at', monthEnd.toISOString())
        .order('clicked_at', { ascending: true })),
    ]);
  } catch (e) {
    console.error('Report query error:', e);
    return NextResponse.json({ error: '통계 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }

  // 코드별·일별 집계
  const monthlyByCode = {};
  const dailyClicks = {};
  for (const { code, clicked_at } of clicks) {
    monthlyByCode[code] = (monthlyByCode[code] || 0) + 1;
    const day = toKstDateStr(clicked_at);
    dailyClicks[day] = (dailyClicks[day] || 0) + 1;
  }

  const dailyNewUrls = {};
  for (const { created_at } of urls) {
    const t = new Date(created_at);
    if (t >= monthStart && t < monthEnd) {
      const day = toKstDateStr(created_at);
      dailyNewUrls[day] = (dailyNewUrls[day] || 0) + 1;
    }
  }

  // 보고 대상: 당월 클릭이 있거나 당월에 생성된 URL (당월 클릭 많은 순)
  const rows = urls
    .map(u => ({
      code: u.code,
      url: u.url,
      createdAt: toKstDateStr(u.created_at),
      monthClicks: monthlyByCode[u.code] || 0,
      totalClicks: u.count || 0,
      createdThisMonth: new Date(u.created_at) >= monthStart && new Date(u.created_at) < monthEnd,
    }))
    .filter(r => r.monthClicks > 0 || r.createdThisMonth)
    .sort((a, b) => b.monthClicks - a.monthClicks || b.totalClicks - a.totalClicks);

  const sumMonthClicks = rows.reduce((s, r) => s + r.monthClicks, 0);
  const newUrlCount = rows.filter(r => r.createdThisMonth).length;

  // ───────────────────────── 엑셀 생성 ─────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const thin = { style: 'thin', color: { argb: 'FF999999' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

  // ── 시트 1: 단축URL 이용 현황 ──
  const ws1 = wb.addWorksheet(`단축URL 이용 현황(${month}월)`);
  ws1.columns = [
    { width: 6 },   // 순위
    { width: 22 },  // 단축 주소
    { width: 55 },  // 원본 URL
    { width: 13 },  // 생성일
    { width: 12 },  // 당월 클릭
    { width: 12 },  // 누적 클릭
  ];

  ws1.mergeCells('A1:F1');
  const title1 = ws1.getCell('A1');
  title1.value = `${year}년 ${month}월 외솔.한국 단축URL 서비스 이용 현황`;
  title1.font = { size: 16, bold: true };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 30;

  ws1.mergeCells('A2:F2');
  const sub1 = ws1.getCell('A2');
  sub1.value = `(집계 기간: ${year}.${mm}.01 ~ ${year}.${mm}.${String(daysInMonth).padStart(2, '0')})`;
  sub1.alignment = { horizontal: 'center' };
  sub1.font = { size: 10, color: { argb: 'FF666666' } };

  ws1.mergeCells('A3:F3');
  const summary = ws1.getCell('A3');
  summary.value = `전체 등록 URL ${urls.length.toLocaleString()}개  |  당월 신규 ${newUrlCount.toLocaleString()}개  |  당월 클릭 ${sumMonthClicks.toLocaleString()}회`;
  summary.alignment = { horizontal: 'center' };
  summary.font = { size: 10, color: { argb: 'FF666666' } };

  const headerRow1 = ws1.addRow(['순위', '단축 주소', '원본 URL', '생성일', '당월 클릭수', '누적 클릭수']);
  headerRow1.eachCell(c => {
    c.font = { bold: true };
    c.fill = headerFill;
    c.border = border;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  rows.forEach((r, i) => {
    const row = ws1.addRow([
      i + 1,
      `외솔.한국/${r.code}`,
      r.url,
      r.createdAt,
      r.monthClicks,
      r.totalClicks,
    ]);
    row.eachCell((c, col) => {
      c.border = border;
      if (col === 1 || col === 4) c.alignment = { horizontal: 'center' };
      if (col >= 5) c.numFmt = '#,##0';
    });
  });

  const totalRow1 = ws1.addRow(['합계', `${rows.length}개`, '', '', sumMonthClicks, '']);
  totalRow1.eachCell((c, col) => {
    c.border = border;
    c.fill = totalFill;
    c.font = { bold: true };
    if (col <= 2) c.alignment = { horizontal: 'center' };
    if (col >= 5) c.numFmt = '#,##0';
  });

  // ── 시트 2: 일별 이용 현황 ──
  const ws2 = wb.addWorksheet('일별 이용 현황');
  ws2.columns = [{ width: 14 }, { width: 12 }, { width: 14 }];

  ws2.mergeCells('A1:C1');
  const title2 = ws2.getCell('A1');
  title2.value = `${year}년 ${month}월 일별 이용 현황`;
  title2.font = { size: 14, bold: true };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(1).height = 26;

  const headerRow2 = ws2.addRow(['날짜', '클릭 수', '신규 URL 수']);
  headerRow2.eachCell(c => {
    c.font = { bold: true };
    c.fill = headerFill;
    c.border = border;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let sumDailyNew = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${mm}-${String(d).padStart(2, '0')}`;
    sumDailyNew += dailyNewUrls[key] || 0;
    const row = ws2.addRow([key, dailyClicks[key] || 0, dailyNewUrls[key] || 0]);
    row.eachCell((c, col) => {
      c.border = border;
      c.alignment = { horizontal: 'center' };
      if (col >= 2) c.numFmt = '#,##0';
    });
  }

  const totalRow2 = ws2.addRow(['합계', sumMonthClicks, sumDailyNew]);
  totalRow2.eachCell(c => {
    c.border = border;
    c.fill = totalFill;
    c.font = { bold: true };
    c.alignment = { horizontal: 'center' };
    c.numFmt = '#,##0';
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `외솔.한국 단축URL 이용 통계(${year}년 ${month}월).xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${year}-${mm}.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
