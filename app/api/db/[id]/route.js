// 외솔 DB — 표 하나: 세부(키·기록) / 동작 / 삭제 (외솔 DB 서버로 중계)
import { NextResponse } from 'next/server';
import { proxyDb } from '../../../../lib/oesolDb';

const ID = /^[a-z2-9]{12}$/;
const ACTIONS = new Set(['rename', 'clear', 'lock', 'unlock', 'rotate_key', 'rotate_id']);

function badId() {
  return NextResponse.json({ error: '표가 없습니다.' }, { status: 404 });
}

export async function GET(req, { params }) {
  const { id } = await params;
  if (!ID.test(id)) return badId();

  const sp = new URL(req.url).searchParams;
  const query = new URLSearchParams();
  if (sp.get('limit')) query.set('limit', sp.get('limit'));
  if (sp.get('before')) query.set('before', sp.get('before'));
  const qs = query.toString();

  return proxyDb(req, `/tables/${id}`, { query: qs ? `?${qs}` : '' });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  if (!ID.test(id)) return badId();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  if (!ACTIONS.has(body?.action)) {
    return NextResponse.json({ error: '알 수 없는 동작입니다.' }, { status: 400 });
  }

  return proxyDb(req, `/tables/${id}`, { method: 'PATCH', body: { action: body.action, name: body.name } });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!ID.test(id)) return badId();
  return proxyDb(req, `/tables/${id}`, { method: 'DELETE' });
}
