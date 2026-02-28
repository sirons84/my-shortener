import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

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
    return NextResponse.redirect(homeUrl);
  }

  // 만료일 체크
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return NextResponse.redirect(homeUrl);
  }

  // 클릭 수 증가 + 클릭 이벤트 기록 (fire-and-forget)
  Promise.all([
    // urls.count 증가
    supabaseAdmin
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
      }),

    // url_clicks 에 이벤트 기록 (테이블 없으면 조용히 실패)
    supabaseAdmin
      .from('url_clicks')
      .insert({ code: targetCode })
      .then(() => {}),
  ]).catch(() => {});

  return NextResponse.redirect(data.url);
}
