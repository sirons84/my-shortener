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

  const { data, error } = await supabaseAdmin
    .from('urls')
    .select('url, expires_at, count')
    .eq('code', targetCode)
    .single();

  if (error || !data) {
    return NextResponse.redirect(homeUrl);
  }

  // 만료일 체크
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return NextResponse.redirect(homeUrl);
  }

  // 클릭 수 증가 (비동기 fire-and-forget, 응답 속도에 영향 없음)
  supabaseAdmin
    .from('urls')
    .update({ count: (data.count || 0) + 1 })
    .eq('code', targetCode)
    .then(() => {});

  return NextResponse.redirect(data.url);
}
