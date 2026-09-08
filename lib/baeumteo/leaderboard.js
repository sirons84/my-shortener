// 외솔 배움터 — 순위판 맨 윗줄 읽기 (서버 전용)
//
// 판을 시작하기 전에 넘어야 할 숫자가 보여야 도전이 된다.
// 게임 화면이 서버에서 그려질 때 한 줄만 미리 읽어 둔다.

import { supabaseAdmin } from '../supabaseAdmin';

/**
 * 그 게임의 1등 한 줄. 없거나 못 읽으면 null.
 * 순위판이 죽어도 게임은 돌아야 하므로 여기서 던지지 않는다.
 */
export async function topScore(game, { faster = false } = {}) {
  try {
    let query = supabaseAdmin
      .from('baeumteo_scores')
      .select('score, spare, ms, nick, school, grade, class')
      .eq('game', game)
      .order('score', { ascending: false });
    // 시간을 겨루는 게임(잃어버린 원고)은 빠른 쪽이 앞이다
    query = faster
      ? query.order('ms', { ascending: true })
      : query.order('spare', { ascending: false, nullsFirst: false });
    const { data, error } = await query.order('at', { ascending: true }).limit(1).maybeSingle();

    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}
