import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Vercel에서 동적 처리를 강제함
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  // [핵심 수정] params를 await로 먼저 기다려야 값이 나옵니다.
  const { code } = await params;
  const homeUrl = new URL('/', req.url);

  if (!code) {
    return NextResponse.redirect(homeUrl);
  }

  // 한글 주소 깨짐 방지 (Punycode 변환 제거, 디코딩 사용)
  const targetCode = decodeURIComponent(code);

  // DB에서 단축 코드 조회 (테이블: urls)
  const { data, error } = await supabaseAdmin
    .from('urls')
    .select('url, expires_at')
    .eq('code', targetCode)
    .single();

  if (error || !data) {
    // 코드가 없거나 에러면 홈으로
    return NextResponse.redirect(homeUrl);
  }

  // 만료일 체크
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return NextResponse.redirect(homeUrl); // 만료됨
  }

  // 최종 목적지로 이동
  return NextResponse.redirect(data.url);
}