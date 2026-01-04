/* pages/api/my-urls.js (예시) */

import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  // 1. Supabase 클라이언트 생성
  const supabase = createPagesServerClient({ req, res });

  // 🚨 [중요] 이 부분이 빠져 있어서 에러가 난 것입니다! 🚨
  // user 변수를 사용하기 위해 먼저 user 정보를 가져와서 변수에 담아야 합니다.
  const { data: { user } } = await supabase.auth.getUser();

  // 2. 이제 user 변수를 사용할 수 있습니다.
  if (!user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  // ... (기존 로직: DB에서 URL 목록 가져오기 등) ...
  
  // 예: user.id를 사용하여 해당 유저의 URL만 가져오는 코드
  const { data, error } = await supabase
    .from('links')
    .select('*')
    .eq('user_id', user.id); // 여기서 user.id를 쓰려면 위에서 user를 정의했어야 함

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}