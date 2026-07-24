import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';
import { isAdmin } from '../../../../lib/constants';

// 월간 이용 통계 보고서(xlsx) — 교육청 「통합누리집 통계」 양식 준용
// GET /api/admin/report?month=YYYY-MM (생략 시 지난달)
//
// 시트1: 누리집 이용 현황 — 연번/누리집/URL/페이지뷰/페이지뷰어/순 페이지뷰/방문수/방문자수/
//        페이지당 평균 체류시간/바운스 방문율/접속 종료율
// 시트2: 기기별 이용현황 — 연번/기기 유형/방문수/방문자수/페이지뷰/신규 방문수/신규 방문율/
//        방문당 사이트 체류시간/방문당 페이지뷰/바운스 방문율
//
// 지표 정의 (page_views 테이블 기준):
// - 페이지뷰: 페이지 조회 건수 전체
// - 페이지뷰어: (방문자, 페이지) 조합의 고유 수
// - 순 페이지뷰: (방문, 페이지) 조합의 고유 수
// - 방문수: 고유 세션 수 (30분 비활동 시 새 방문)
// - 방문자수: 고유 방문자 수 (쿠키 1년 기준)
// - 바운스 방문율: 페이지 1개만 보고 떠난 방문 비율
// - 접속 종료율: 방문수 ÷ 페이지뷰 (모든 방문은 1회 종료됨)

export const dynamic = 'force-dynamic';

async function verifyAdmin(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !isAdmin(user.email)) return null;
  return user;
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

const DEVICE_ORDER = ['PC', '스마트폰', '태블릿', '기타'];

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
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = new Date(`${year}-${mm}-01T00:00:00+09:00`);
  const monthEnd = month === 12
    ? new Date(`${year + 1}-01-01T00:00:00+09:00`)
    : new Date(`${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00+09:00`);

  // ── 데이터 수집 ──
  let views = [];
  let collectError = false;
  try {
    views = await fetchAll(() => supabaseAdmin
      .from('page_views')
      .select('visitor_id, session_id, path, device, is_new_visitor, duration_sec')
      .gte('viewed_at', monthStart.toISOString())
      .lt('viewed_at', monthEnd.toISOString())
      .order('viewed_at', { ascending: true }));
  } catch (e) {
    console.error('page_views query error:', e);
    collectError = true; // 테이블 미생성 등 — 0으로 채운 보고서 생성
  }

  // ── 집계 ──
  const visitors = new Set();
  const viewerPages = new Set();   // (visitor, path)
  const sessionPages = new Set();  // (session, path)
  const sessions = new Map();      // sessionId → { device, pvCount, isNew, dwellSum, visitorId }
  let dwellTotal = 0;
  let dwellCount = 0;
  const pvByDevice = {};

  for (const v of views) {
    const device = DEVICE_ORDER.includes(v.device) ? v.device : '기타';
    visitors.add(v.visitor_id);
    viewerPages.add(`${v.visitor_id}|${v.path}`);
    sessionPages.add(`${v.session_id}|${v.path}`);
    pvByDevice[device] = (pvByDevice[device] || 0) + 1;

    if (v.duration_sec !== null && v.duration_sec !== undefined) {
      dwellTotal += Number(v.duration_sec);
      dwellCount += 1;
    }

    let s = sessions.get(v.session_id);
    if (!s) {
      s = { device, pvCount: 0, isNew: false, dwellSum: 0, visitorId: v.visitor_id };
      sessions.set(v.session_id, s);
    }
    s.pvCount += 1;
    if (v.is_new_visitor) s.isNew = true;
    if (v.duration_sec !== null && v.duration_sec !== undefined) s.dwellSum += Number(v.duration_sec);
  }

  const pvTotal = views.length;
  const visitCount = sessions.size;
  const visitorCount = visitors.size;
  const bounceCount = [...sessions.values()].filter(s => s.pvCount === 1).length;
  const avgDwellPerPage = dwellCount ? dwellTotal / dwellCount : 0;
  const bounceRate = visitCount ? bounceCount / visitCount : 0;
  const exitRate = pvTotal ? visitCount / pvTotal : 0;

  // 기기별 집계
  const deviceStats = DEVICE_ORDER.map(device => {
    const devSessions = [...sessions.values()].filter(s => s.device === device);
    const devVisitors = new Set(devSessions.map(s => s.visitorId));
    const visits = devSessions.length;
    const newVisits = devSessions.filter(s => s.isNew).length;
    const bounces = devSessions.filter(s => s.pvCount === 1).length;
    const dwellSum = devSessions.reduce((a, s) => a + s.dwellSum, 0);
    const pv = pvByDevice[device] || 0;
    return {
      device,
      visits,
      visitors: devVisitors.size,
      pv,
      newVisits,
      newRate: visits ? newVisits / visits : 0,
      dwellPerVisit: visits ? dwellSum / visits : 0,
      pvPerVisit: visits ? pv / visits : 0,
      bounceRate: visits ? bounces / visits : 0,
    };
  });

  // ───────────────────────── 엑셀 생성 ─────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const thin = { style: 'thin', color: { argb: 'FF999999' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  const center = { horizontal: 'center', vertical: 'middle', wrapText: true };

  const periodLine = `Domain: 외솔.한국  ( From: ${year}${mm}01  To: ${year}${mm}${String(daysInMonth).padStart(2, '0')} )`;

  const styleHeader = (row) => row.eachCell(c => {
    c.font = { bold: true };
    c.fill = headerFill;
    c.border = border;
    c.alignment = center;
  });

  // ── 시트 1: 누리집 이용 현황 ──
  const ws1 = wb.addWorksheet(`누리집 이용 현황(${month}월)`);
  ws1.columns = [
    { width: 6 },  // 연번
    { width: 26 }, // 누리집
    { width: 16 }, // URL
    { width: 12 }, // 페이지뷰
    { width: 12 }, // 페이지뷰어
    { width: 12 }, // 순 페이지뷰
    { width: 12 }, // 방문수
    { width: 12 }, // 방문자수
    { width: 16 }, // 체류시간
    { width: 12 }, // 바운스 방문율
    { width: 12 }, // 접속 종료율
  ];

  ws1.mergeCells('A1:K1');
  ws1.getCell('A1').value = `${year}년 ${month}월 외솔.한국 단축URL 서비스 이용 현황`;
  ws1.getCell('A1').font = { size: 16, bold: true };
  ws1.getCell('A1').alignment = center;
  ws1.getRow(1).height = 30;

  ws1.mergeCells('A2:K2');
  ws1.getCell('A2').value = periodLine;
  ws1.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
  ws1.getCell('A2').alignment = { horizontal: 'center' };

  styleHeader(ws1.addRow([
    '연번', '누리집', 'URL', '페이지뷰', '페이지뷰어', '순 페이지뷰',
    '방문수', '방문자수', '페이지당 평균 체류시간(sec)', '바운스 방문율', '접속 종료율',
  ]));
  ws1.getRow(3).height = 30;

  const siteRow = ws1.addRow([
    1, '외솔.한국 (한글 URL 단축 서비스)', '외솔.한국',
    pvTotal, viewerPages.size, sessionPages.size, visitCount, visitorCount,
    `${avgDwellPerPage.toFixed(2)} s`, bounceRate, exitRate,
  ]);
  siteRow.eachCell((c, col) => {
    c.border = border;
    if (col === 1 || col === 3 || col === 9) c.alignment = { horizontal: 'center' };
    if (col >= 4 && col <= 8) c.numFmt = '#,##0';
    if (col >= 10) { c.numFmt = '0.00%'; c.alignment = { horizontal: 'center' }; }
  });

  const totalRow1 = ws1.addRow([
    '합계', 1, '', pvTotal, viewerPages.size, sessionPages.size, visitCount, visitorCount, '', '', '',
  ]);
  totalRow1.eachCell((c, col) => {
    c.border = border;
    c.fill = totalFill;
    c.font = { bold: true };
    if (col <= 3) c.alignment = { horizontal: 'center' };
    if (col >= 4 && col <= 8) c.numFmt = '#,##0';
  });

  const note1 = collectError
    ? '※ 방문 통계 테이블(page_views)이 아직 생성되지 않았습니다. supabase/migrations/004_page_views.sql 적용 후부터 집계됩니다.'
    : '※ 방문 통계는 수집 기능 배포 시점 이후의 데이터부터 집계됩니다.';
  const noteRowNum = ws1.rowCount + 2;
  ws1.mergeCells(`A${noteRowNum}:K${noteRowNum}`);
  const noteCell1 = ws1.getCell(`A${noteRowNum}`);
  noteCell1.value = note1;
  noteCell1.font = { size: 9, color: { argb: 'FF888888' } };

  // ── 시트 2: 기기별 이용현황 ──
  const ws2 = wb.addWorksheet('기기별 이용현황');
  ws2.columns = [
    { width: 6 },  // 연번
    { width: 14 }, // 기기 유형
    { width: 12 }, // 방문수
    { width: 12 }, // 방문자수
    { width: 12 }, // 페이지뷰
    { width: 12 }, // 신규 방문수
    { width: 12 }, // 신규 방문율
    { width: 18 }, // 방문당 사이트 체류시간
    { width: 14 }, // 방문당 페이지뷰
    { width: 12 }, // 바운스 방문율
  ];

  ws2.mergeCells('A1:J1');
  ws2.getCell('A1').value = '기기별 사이트 방문 현황';
  ws2.getCell('A1').font = { size: 14, bold: true };
  ws2.getCell('A1').alignment = center;
  ws2.getRow(1).height = 26;

  ws2.mergeCells('A2:J2');
  ws2.getCell('A2').value = periodLine;
  ws2.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
  ws2.getCell('A2').alignment = { horizontal: 'center' };

  styleHeader(ws2.addRow([
    '연번', '기기 유형', '방문수', '방문자수', '페이지뷰', '신규 방문수',
    '신규 방문율', '방문당 사이트 체류시간', '방문당 페이지뷰', '바운스 방문율',
  ]));
  ws2.getRow(3).height = 30;

  deviceStats.forEach((d, i) => {
    const row = ws2.addRow([
      i + 1, d.device, d.visits, d.visitors, d.pv, d.newVisits,
      d.newRate, `${d.dwellPerVisit.toFixed(2)} s`, Number(d.pvPerVisit.toFixed(2)), d.bounceRate,
    ]);
    row.eachCell((c, col) => {
      c.border = border;
      if (col <= 2 || col === 8) c.alignment = { horizontal: 'center' };
      if (col >= 3 && col <= 6) c.numFmt = '#,##0';
      if (col === 7 || col === 10) { c.numFmt = '0.00%'; c.alignment = { horizontal: 'center' }; }
      if (col === 9) { c.numFmt = '0.00'; c.alignment = { horizontal: 'center' }; }
    });
  });

  const totalRow2 = ws2.addRow([
    '합계', '', visitCount, visitorCount, pvTotal,
    deviceStats.reduce((a, d) => a + d.newVisits, 0), '', '', '', '',
  ]);
  totalRow2.eachCell((c, col) => {
    c.border = border;
    c.fill = totalFill;
    c.font = { bold: true };
    if (col <= 2) c.alignment = { horizontal: 'center' };
    if (col >= 3 && col <= 6) c.numFmt = '#,##0';
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `외솔.한국 이용 통계(${year}년 ${month}월).xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${year}-${mm}.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
