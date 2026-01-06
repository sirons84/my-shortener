/* 파일 경로: app/api/shorten/route.js */

import { NextResponse } from 'next/server';
// 1. 관리자 권한 클라이언트 가져오기 (경로 주의: ../가 3개)
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { supabase } from '../../../lib/supabaseClient'; // 토큰 검증용 일반 클라이언트

export async function POST(request) {
  const body = await request.json();
  const { url, customCode, expiry } = body;

  if (!url) {
    return NextResponse.json({ error: "URL이 없습니다." }, { status: 400 });
  }

  // 2. 유저 정보 확인
  const authHeader = request.headers.get('authorization');
  let user = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    // 토큰 검증은 일반 클라이언트로 해도 됨
    const { data: { user: foundUser }, error } = await supabase.auth.getUser(token);
    if (!error && foundUser) {
      user = foundUser;
    }
  }

  // --- [교육청별 생성 개수 제한 로직] ---
  if (user) {
    // 3. DB 조회 시 supabaseAdmin 사용 (RLS 우회)
    const { count, error: countError } = await supabaseAdmin
      .from('urls') 
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!countError) {
      const userRegion = user.user_metadata?.region || "기타";
      const limit = userRegion === "울산광역시교육청" ? 200 : 50;

      if (count >= limit) {
        return NextResponse.json(
          { error: `생성 한도를 초과했습니다. (${userRegion}: 최대 ${limit}개)` }, 
          { status: 403 }
        );
      }
    }
  }

  // 4. 단축 코드 생성
  let code;
  
  if (customCode) {
    const { data: existing } = await supabaseAdmin
      .from('urls')
      .select('code')
      .eq('code', customCode)
      .single();
    
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 단축 주소입니다.' }, { status: 409 });
    }
    code = customCode;

  } else {
    let isUnique = false;
    let retryCount = 0;

    while (!isUnique) {
      if (retryCount > 5) {
        return NextResponse.json({ error: "코드 생성 실패. 다시 시도해주세요." }, { status: 500 });
      }
      code = generateRandomString(6);

      const { data: existing } = await supabaseAdmin
        .from('urls')
        .select('code')
        .eq('code', code)
        .single();
        
      if (!existing) isUnique = true;
      retryCount++;
    }
  }

  // 5. DB에 저장 (관리자 권한으로 저장)
  const { error } = await supabaseAdmin.from('urls').insert({
    url: url,
    code: code,
    user_id: user ? user.id : null,
    expires_at: calculateExpiry(expiry)
  });

  if (error) {
    console.error("DB Insert Error:", error);
    return NextResponse.json({ error: "데이터베이스 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ code });
}

// --- [보조 함수들] ---
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function calculateExpiry(expiryOption) {
  if (!expiryOption || expiryOption === 'forever') return null;
  const now = new Date();
  if (expiryOption === '7d') now.setDate(now.getDate() + 7);
  else if (expiryOption === '30d') now.setDate(now.getDate() + 30);
  else if (expiryOption === '180d') now.setDate(now.getDate() + 180);
  else if (expiryOption === '365d') now.setDate(now.getDate() + 365);
  return now.toISOString();
}