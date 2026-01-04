/* pages/api/shorten.js 내부 (URL 생성 로직 앞부분) */

// ... (인증 및 user 정보 가져오는 부분 이후)

if (user) {
  // 1. 현재 유저가 만든 URL 개수 조회
  const { count, error: countError } = await supabase
    .from('links') // 테이블 이름이 'links'라고 가정 (다르면 수정 필요)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    return res.status(500).json({ error: "사용량 조회 중 오류가 발생했습니다." });
  }

  // 2. 유저의 교육청 정보 확인
  const userRegion = user.user_metadata?.region || "기타";
  
  // 3. 제한 설정 (울산: 200개, 그 외: 50개)
  const limit = userRegion === "울산광역시교육청" ? 200 : 50;

  // 4. 제한 초과 확인
  if (count >= limit) {
    return res.status(403).json({ 
      error: `생성 한도를 초과했습니다. (${userRegion}: 최대 ${limit}개)` 
    });
  }
}

// ... (이후 URL insert 로직 진행)