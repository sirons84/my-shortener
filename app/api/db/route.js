// 기록 곳간 — 내 표 목록 / 새 표 만들기 (기록 곳간 서버로 중계)
import { NextResponse } from 'next/server';
import { proxyDb } from '../../../lib/oesolDb';
import { rateLimit } from '../../../lib/rateLimit';
import { getUserFromRequest } from '../../../lib/apiAuth';

export async function GET(req) {
  return proxyDb(req, '/tables');
}

export async function POST(req) {
  const user = await getUserFromRequest(req);
  if (user) {
    const { allowed } = rateLimit(`db-create:${user.id}`, { max: 20, windowMs: 10 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  return proxyDb(req, '/tables', { method: 'POST', body: { name: body?.name } });
}
