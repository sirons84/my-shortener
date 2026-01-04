import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  // 1. Supabase 클라이언트 생성
  const supabase = createPagesServerClient({ req, res });

  // 2. [중요] 유저 정보 가져오기 (이 부분이 없어서 에러가 났던 것입니다!)
  const { data: { user } } = await supabase.auth.getUser();

  if (req.method === 'POST') {
    const { url, customCode, expiry } = req.body;

    // --- [추가된 로직] 교육청별 생성 개수 제한 ---
    if (user) {
      // (1) 현재 유저가 만든 URL 개수 조회
      const { count, error: countError } = await supabase
        .from('links') 
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        return res.status(500).json({ error: "사용량 조회 중 오류가 발생했습니다." });
      }

      // (2) 유저의 교육청 정보 확인 (없으면 '기타')
      const userRegion = user.user_metadata?.region || "기타";
      
      // (3) 제한 설정 (울산: 200개, 그 외: 50개)
      const limit = userRegion === "울산광역시교육청" ? 200 : 50;

      // (4) 제한 초과 확인
      if (count >= limit) {
        return res.status(403).json({ 
          error: `생성 한도를 초과했습니다. (${userRegion}: 최대 ${limit}개)` 
        });
      }
    }
    // ------------------------------------------

    // 3. 단축 코드 생성 (사용자 지정 코드 또는 랜덤)
    let code;
    if (customCode) {
      // 사용자 지정 코드 중복 확인
      const { data: existing } = await supabase
        .from('links')
        .select('slug')
        .eq('slug', customCode)
        .single();
      
      if (existing) {
        return res.status(409).json({ error: '이미 사용 중인 단축 주소입니다.' });
      }
      code = customCode;
    } else {
      // 랜덤 코드 생성 (중복 체크 반복)
      let isUnique = false;
      while (!isUnique) {
        code = nanoid(6); // 6자리 랜덤
        const { data: existing } = await supabase
          .from('links')
          .select('slug')
          .eq('slug', code)
          .single();
        if (!existing) isUnique = true;
      }
    }

    // 4. DB에 저장
    const { error } = await supabase.from('links').insert({
      original_url: url,
      slug: code,
      user_id: user ? user.id : null, // 로그인 안 했으면 null
      expiry_date: calculateExpiry(expiry) // 만료일 계산 함수 필요
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ code });
  } 
  
  // POST가 아닌 경우
  else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// 만료일 계산 헬퍼 함수
function calculateExpiry(expiryOption) {
  if (expiryOption === 'forever') return null;
  
  const now = new Date();
  if (expiryOption === '7d') now.setDate(now.getDate() + 7);
  else if (expiryOption === '30d') now.setDate(now.getDate() + 30);
  else if (expiryOption === '180d') now.setDate(now.getDate() + 180);
  else if (expiryOption === '365d') now.setDate(now.getDate() + 365);
  
  return now.toISOString();
}