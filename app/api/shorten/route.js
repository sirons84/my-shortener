import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { checkUrlSafety } from '../../../lib/urlSafety';
import { validateCustomCode, getCreationLimit, isAdmin } from '../../../lib/constants';
import { rateLimit, getClientIp } from '../../../lib/rateLimit';

export async function POST(request) {
  // 1. 요청 데이터 가져오기
  const body = await request.json();
  const { url, customCode, expiry } = body;

  if (!url) {
    return NextResponse.json({ error: "URL이 없습니다." }, { status: 400 });
  }

  // URL 유효성 검증 (http/https만 허용)
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'http 또는 https URL만 허용됩니다.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: '유효하지 않은 URL입니다.' }, { status: 400 });
  }

  // 악성 URL 차단
  const safety = await checkUrlSafety(url);
  if (!safety.safe) {
    return NextResponse.json({ error: safety.reason || '안전하지 않은 URL입니다.' }, { status: 400 });
  }

  // 커스텀 코드 사전 검증 (허용 문자·길이·예약어)
  let validatedCustomCode = null;
  if (customCode) {
    const result = validateCustomCode(customCode);
    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    validatedCustomCode = result.code;
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

  // 비로그인(익명) 생성은 IP 기반으로 남용 방지 (10분당 20개)
  // 주의: 학교 등 공용 IP를 고려해 넉넉하게 설정
  if (!user) {
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`shorten:anon:${ip}`, { max: 20, windowMs: 10 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도하거나 로그인해주세요.' },
        { status: 429 }
      );
    }
  }

  // --- [생성 개수 제한 확인] ---
  if (user) {
    // [수정] 관리자 계정은 제한 없음 (개수 체크 건너뜀)
    if (!isAdmin(user.email)) {
      const { count, error: countError } = await supabaseAdmin
        .from('urls')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!countError) {
        const userRegion = user.user_metadata?.region || "기타";
        const limit = getCreationLimit(user.email, user.user_metadata?.region);

        if (limit !== null && count >= limit) {
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

  if (validatedCustomCode) {
    // 사용자 지정 코드 중복 확인
    const { data: existing } = await supabaseAdmin
      .from('urls')
      .select('code')
      .eq('code', validatedCustomCode)
      .single();

    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 단축 주소입니다.' }, { status: 409 });
    }
    code = validatedCustomCode;

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

// [보조 함수] 암호학적으로 안전한 난수로 코드 생성
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(randomInt(characters.length));
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