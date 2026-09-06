import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getDropOrigin, buildDropShellHtml, isDropExpired } from '../../../lib/drop';

// Vercel에서 동적 처리를 강제함
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { code } = await params;
  const homeUrl = new URL('/', req.url);

  if (!code) {
    return NextResponse.redirect(homeUrl);
  }

  const targetCode = decodeURIComponent(code);

  // count는 여기서 선택하지 않음 - 컬럼 존재 여부와 관계없이 리다이렉트 보장
  const { data, error } = await supabaseAdmin
    .from('urls')
    .select('url, expires_at')
    .eq('code', targetCode)
    .single();

  if (error || !data) {
    // 단축 주소가 아니면 외솔 드롭 주소인지 확인한다 (같은 이름 공간을 공유)
    return serveDropOrRedirect(targetCode, homeUrl);
  }

  // 만료일 체크
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return NextResponse.redirect(homeUrl);
  }

  // 클릭 수 증가 + 클릭 이벤트 기록 (fire-and-forget)
  Promise.all([
    // urls.count 원자적 증가 (RPC). 마이그레이션 002 미적용 시 기존 방식으로 폴백
    supabaseAdmin
      .rpc('increment_click', { p_code: targetCode })
      .then(({ error: rpcError }) => {
        if (!rpcError) return;
        return supabaseAdmin
          .from('urls')
          .select('count')
          .eq('code', targetCode)
          .single()
          .then(({ data: row, error: e }) => {
            if (!e && row !== null) {
              return supabaseAdmin
                .from('urls')
                .update({ count: (row.count || 0) + 1 })
                .eq('code', targetCode);
            }
          });
      }),

    // url_clicks 에 이벤트 기록 (테이블 없으면 조용히 실패)
    supabaseAdmin
      .from('url_clicks')
      .insert({ code: targetCode })
      .then(() => {}),
  ]).catch(() => {});

  return NextResponse.redirect(data.url);
}

/**
 * 외솔 드롭 껍데기 응답.
 *
 * 사용자가 올린 HTML 을 이 오리진에서 직접 실행하면 로그인 세션이 노출되므로,
 * 여기서는 전체화면 iframe 껍데기만 내려보내고 실제 내용은 별도 오리진
 * (NEXT_PUBLIC_DROP_ORIGIN)의 /d/<code> 에서 불러온다. 주소창은 그대로 유지된다.
 */
async function serveDropOrRedirect(code, homeUrl) {
  const dropOrigin = getDropOrigin();
  if (!dropOrigin) return NextResponse.redirect(homeUrl);

  const { data } = await supabaseAdmin
    .from('drops')
    .select('code, title, is_blocked, expires_at')
    .eq('code', code)
    .maybeSingle();

  if (!data || data.is_blocked || isDropExpired(data.expires_at)) {
    return NextResponse.redirect(homeUrl);
  }

  // 조회수 증가 (fire-and-forget)
  supabaseAdmin.rpc('increment_drop_view', { p_code: code }).then(() => {}, () => {});

  return new NextResponse(
    buildDropShellHtml({ code: data.code, title: data.title, origin: dropOrigin }),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}
