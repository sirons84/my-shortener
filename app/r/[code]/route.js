// 파일 경로: app/r/[code]/route.js
// (이 파일을 새로 생성하세요)

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { toASCII } from 'punycode';

// Vercel에서 이 라우트를 동적으로 처리하도록 강제
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { code } = params;
  const homeUrl = new URL('/', req.url); // 리다이렉트 실패 시 보낼 홈 URL

  if (!code) {
    return NextResponse.redirect(homeUrl);
  }

  let punycodeCode = code;
  try {
    // 미들웨어에서 받은 원본 코드(e.g., "네이버")를 Punycode로 변환
    punycodeCode = toASCII(code);
  } catch (e) {
    console.error('Punycode conversion failed:', e.message);
    // 잘못된 코드, 홈으로 리디렉트
    return NextResponse.redirect(homeUrl); 
  }

  // Punycode로 DB 조회 (기존 미들웨어에 있던 로직)
  const { data, error } = await supabaseAdmin
    .from('urls')
    .select('url, expires_at')
    .eq('code', punycodeCode)
    .single();

  if (error) {
    console.error("Supabase query error:", error.message);
    return NextResponse.redirect(homeUrl);
  }

  // 리다이렉트
  if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
    return NextResponse.redirect(data.url);
  }

  // 일치하는 코드 없으면 홈으로 리디렉트
  return NextResponse.redirect(homeUrl);
}