// Authorization: Bearer <supabase access token> 으로 로그인 사용자를 확인한다.
// (app/api/drop/route.js 의 getUser 와 같은 방식. 새 API 들은 이 모듈을 쓴다)
import { supabase } from './supabaseClient';

export async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}
