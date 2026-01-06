/* 파일 경로: app/r/[code]/route.js */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Vercel에서 이 라우트를 동적으로 처리하도록 강제
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  // 1. URL에서 단축 코드 가져오기
  const { code } = params;
  const homeUrl = new URL('/', req.url); // 실패 시 이동할 홈 주소

  if (!code) {
    return NextResponse.redirect(homeUrl);
  }

  // [수정 핵심] toASCII(Punycode 변환) 제거! 
  // 대신 혹시 모를 인코딩(%ED%85...)을 풀기 위해 decodeURIComponent 사용
  const targetCode = decodeURIComponent(code);

  // 2. DB에서 조회 (변환 없이 있는 그대로 찾기)
  const { data, error } = await supabaseAdmin
    .from('urls')
    .select('url, expires_at')
    .eq('code', targetCode) 
    .single();

  if (error) {
    console.error("Supabase query error:", error.message);
    // DB 에러 시 홈으로 리다이렉트
    return NextResponse.redirect(homeUrl);
  }

  // 3. 만료일 체크 및 리다이렉트
  if (data) {
    // 만료일이 없거나, 아직 안 지났으면 이동
    if (!data.expires_at || new Date(data.expires_at) > new Date()) {
      return NextResponse.redirect(data.url);
    }
  }

  // 데이터가 없거나 만료되었으면 홈으로
  return NextResponse.redirect(homeUrl);
}