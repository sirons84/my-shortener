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
    // [수정] 관리자 계정(sirons@usedu.ai.kr)은 제한 없음 (개수 체크 건너뜀)
    const isAdmin = user.email === 'sirons@usedu.ai.kr';

    if (!isAdmin) {
      const { count, error: countError } = await supabaseAdmin
        .from('urls')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!countError) {
        const userRegion = user.user_metadata?.region || "기타";
        
        // [수정] 제한 개수 설정 로직
        let limit = 30; // 기본값

        if (userRegion === "울산광역시교육청") {
          limit = 200; // 기존 로직 유지 (가장 높은 혜택)
        } else if (user.email && user.email.endsWith('@usedu.ai.kr')) {
          limit = 100; // @usedu.ai.kr 계정은 100개로 상향
        }

        if (count >= limit) {
          return NextResponse.json(
            { error: `생성 한도를 초과했습니다. (${userRegion}: 최대 ${limit}개)` }, 
            { status: 403 }
          );
        }
      }
    }
  }

  // 3. 단축 코드 생성
  let code;
  
  if (customCode) {
    // 사용자 지정 코드 중복 확인
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
    // 랜덤 코드 생성
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

  // 4. DB에 저장 (관리자 권한 사용)
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