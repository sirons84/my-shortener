// 기록 곳간 서버(oesol.dev) 관리 API 중계.
//
// 분리 원칙: 본체가 기록 곳간과 공유하는 것은 "로그인 확인" 하나뿐이다.
// 브라우저 → 본체 /api/db/* (Bearer 토큰) → 본체가 로그인 확인 → 기록 곳간 /admin/* (서버 간 비밀 + 교사 식별자).
// 본체는 기록 곳간의 저장소 접속 정보를 모르고, 기록 곳간은 본체 계정 테이블을 모른다.
import { NextResponse } from 'next/server';
import { getUserFromRequest } from './apiAuth';
import { getDbLimit } from './constants';

export function dbOrigin() {
  const raw = (process.env.OESOL_DB_ORIGIN || '').trim().replace(/\/+$/, '');
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function dbEnabled() {
  return !!dbOrigin() && !!process.env.OESOL_DB_ADMIN_SECRET;
}

/**
 * 로그인 확인 뒤 기록 곳간 관리 API 를 대신 부르고 결과를 그대로 돌려준다.
 * @param {Request} req
 * @param {string} path  '/tables', '/tables/abc', ...
 * @param {{ method?: string, body?: object, query?: string }} [opts]
 */
export async function proxyDb(req, path, { method = 'GET', body, query = '' } = {}) {
  if (!dbEnabled()) {
    return NextResponse.json({ error: '기록 곳간이 아직 준비되지 않았습니다.' }, { status: 503 });
  }

  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  let res;
  try {
    res = await fetch(`${dbOrigin()}/admin${path}${query}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': process.env.OESOL_DB_ADMIN_SECRET,
        'X-Owner-Id': user.id,
        'X-Owner-Email': user.email || '',
        // 표 개수 한도 (관리자는 unlimited). 기록 곳간 서버는 누가 관리자인지 모르므로 여기서 정해 넘긴다
        'X-Owner-Limit': getDbLimit(user) === null ? 'unlimited' : String(getDbLimit(user)),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('oesol-db proxy error', e?.message);
    return NextResponse.json({ error: '기록 곳간 서버에 연결하지 못했습니다.' }, { status: 502 });
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: '기록 곳간 서버 응답을 읽지 못했습니다.' };
  }
  return NextResponse.json(data, { status: res.status });
}
