import { NextResponse } from 'next/server';

import { issueTicket } from '../../../../lib/baeumteo/sign';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';

export const dynamic = 'force-dynamic';

// 판을 시작할 때 표를 하나 끊어 준다. 기록을 낼 때 이 표를 함께 낸다.
// 표가 없어도 게임은 돌아간다. 순위판에만 못 오른다 (기획서 §3-4).
const GAMES = new Set(['defense', 'dictionary']);

export async function POST(request) {
  const limit = rateLimit(`baeumteo-round:${getClientIp(request)}`, { max: 60, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: '잠시 뒤에 다시 시작해 주세요.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청을 읽을 수 없습니다.' }, { status: 400 });
  }

  const game = String(body?.game || '');
  if (!GAMES.has(game)) {
    return NextResponse.json({ error: '없는 게임입니다.' }, { status: 400 });
  }

  return NextResponse.json({ ticket: issueTicket(game) });
}
