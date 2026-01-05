/* 파일 경로: app/api/shorten/route.js */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // 1. Supabase 클라이언트 생성 (기본 라이브러리 사용)
  // (환경변수가 제대로 설정되어 있어야 합니다)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // 2. 요청 데이터(Body) 가져오기
  const body = await request.json();
  const { url, customCode, expiry } = body;

  if (!url) {
    return NextResponse.json({ error: "URL이 없습니다." }, { status: 400 });
  }

  // 3. 유저 정보 확인 (헤더에 있는 토큰으로 확인)
  const authHeader = request.headers.get('authorization');
  let user = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: foundUser }, error } = await supabase.auth.getUser(token);
    if (!error && foundUser) {
      user = foundUser;
    }
  }

  // --- [교육청별 생성 개수 제한 로직] ---
  if (user) {
    const { count, error: countError } = await supabase
      .from('links') 
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!countError) {
      const userRegion = user.user_metadata?.region || "기타";
      // 울산은 200개, 타 지역은 50개 제한
      const limit = userRegion === "울산광역시교육청" ? 200 : 50;

      if (count >= limit) {
        return NextResponse.json(
          { error: `생성 한도를 초과했습니다. (${userRegion}: 최대 ${limit}개)` }, 
          { status: 403 }
        );
      }
    }
  }
  // ------------------------------------

  // 4. 단축 코드 생성 (라이브러리 없이 직접 생성)
  let code;
  
  if (customCode) {
    // (1) 사용자 지정 코드인 경우 중복 체크
    const { data: existing } = await supabase
      .from('links')
      .select('slug')
      .eq('slug', customCode)
      .single();
    
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 단축 주소입니다.' }, { status: 409 });
    }
    code = customCode;

  } else {
    // (2) 랜덤 코드 생성 (직접 만든 함수 사용)
    let isUnique = false;
    let retryCount = 0;

    while (!isUnique) {
      if (retryCount > 5) {
        return NextResponse.json({ error: "코드 생성 실패. 다시 시도해주세요." }, { status: 500 });
      }

      // 6자리 랜덤 문자열 생성
      code = generateRandomString(6);

      // 중복 확인
      const { data: existing } = await supabase
        .from('links')
        .select('slug')
        .eq('slug', code)
        .single();
        
      if (!existing) isUnique = true;
      retryCount++;
    }
  }

  // 5. DB에 저장
  const { error } = await supabase.from('links').insert({
    original_url: url,
    slug: code,
    user_id: user ? user.id : null,
    expiry_date: calculateExpiry(expiry)
  });

  if (error) {
    console.error("DB Insert Error:", error);
    return NextResponse.json({ error: "데이터베이스 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  // 6. 성공 응답
  return NextResponse.json({ code });
}

// --- [보조 함수들] ---

// 1. 랜덤 문자열 생성 함수
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// 2. 만료일 계산 함수
function calculateExpiry(expiryOption) {
  if (!expiryOption || expiryOption === 'forever') return null;
  
  const now = new Date();
  if (expiryOption === '7d') now.setDate(now.getDate() + 7);
  else if (expiryOption === '30d') now.setDate(now.getDate() + 30);
  else if (expiryOption === '180d') now.setDate(now.getDate() + 180);
  else if (expiryOption === '365d') now.setDate(now.getDate() + 365);
  
  return now.toISOString();
}