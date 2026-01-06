import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  // 1. 요청 데이터 가져오기
  const body = await request.json();
  const { url, customCode, expiry } = body;

  if (!url) {
    return NextResponse.json({ error: "URL이 없습니다." }, { status: 400 });
  }

  // 2. 유저 정보 확인 (일반 클라이언트로 토큰 검증)
  //    (주의: 검증용 클라이언트는 별도로 생성)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const authHeader = request.headers.get('authorization');
  let user = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: foundUser }, error } = await supabase.auth.getUser(token);
    if (!error && foundUser) {
      user = foundUser;
    }
  }

  // --- [생성 개수 제한 확인] ---
  if (user) {
    const { count, error: countError } = await supabaseAdmin
      .from('urls')  // 변경됨: links -> urls
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

  // 3. 단축 코드 생성
  let code;
  
  if (customCode) {
    // 사용자 지정 코드 중복 확인
    const { data: existing } = await supabaseAdmin
      .from('urls') // 변경됨
      .select('code') // 변경됨: slug -> code
      .eq('code', customCode)
      .single();
    
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 단축 주소입니다.' }, { status: 409 });
    }
    code = customCode;

  } else {
    // 랜덤 코드 생성
    let isUnique = false;
    let retryCount = 0;

    while (!isUnique) {
      if (retryCount > 5) {
        return NextResponse.json({ error: "코드 생성 실패. 다시 시도해주세요." }, { status: 500 });
      }
      code = generateRandomString(6);

      const { data: existing } = await supabaseAdmin
        .from('urls') // 변경됨
        .select('code') // 변경됨
        .eq('code', code)
        .single();
        
      if (!existing) isUnique = true;
      retryCount++;
    }
  }

  // 4. DB에 저장 (관리자 권한 사용)
  const { error } = await supabaseAdmin.from('urls').insert({
    url: url,           // 변경됨: original_url -> url
    code: code,         // 변경됨: slug -> code
    user_id: user ? user.id : null,
    expires_at: calculateExpiry(expiry) // 변경됨: expiry_date -> expires_at
  });

  if (error) {
    console.error("DB Insert Error:", error);
    return NextResponse.json({ error: "데이터베이스 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ code });
}

// [보조 함수]
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