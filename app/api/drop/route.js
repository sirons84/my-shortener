// 외솔 드롭(베타) API — 내 드롭 조회 / 게시(교체) / 삭제
//
// 베타 정책: 로그인 필수, 한 사람당 하나. (drops.user_id 유니크 인덱스가 최종 강제)
// 주소는 단축 주소와 같은 이름 공간을 쓰므로 urls 쪽도 함께 확인한다.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { supabase } from '../../../lib/supabaseClient';
import { validateCustomCode } from '../../../lib/constants';
import { DROP_MAX_BYTES, getDropOrigin, calculateDropExpiry } from '../../../lib/drop';
import { rateLimit } from '../../../lib/rateLimit';

/** Authorization 헤더로 사용자 확인 */
async function getUser(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}

/** <title> 을 뽑아 드롭 이름으로 쓴다 (없으면 코드로 대체) */
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const title = match[1].replace(/\s+/g, ' ').trim();
  return title ? title.slice(0, 120) : null;
}

// ── 내 드롭 조회 ─────────────────────────────────────────
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('drops')
    .select('code, title, size_bytes, view_count, is_blocked, expires_at, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ drop: data || null, enabled: !!getDropOrigin() });
}

// ── 게시 / 교체 ──────────────────────────────────────────
export async function POST(req) {
  if (!getDropOrigin()) {
    return NextResponse.json({ error: '외솔 드롭이 아직 준비되지 않았습니다.' }, { status: 503 });
  }

  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { allowed } = rateLimit(`drop:${user.id}`, { max: 20, windowMs: 10 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { code: rawCode, html, expiry } = body || {};

  // 1. 주소 검증
  const codeResult = validateCustomCode(rawCode);
  if (!codeResult.valid) {
    return NextResponse.json({ error: codeResult.reason }, { status: 400 });
  }
  const code = codeResult.code;

  // 2. HTML 검증
  if (typeof html !== 'string' || !html.trim()) {
    return NextResponse.json({ error: 'HTML 내용이 비어 있습니다.' }, { status: 400 });
  }

  const sizeBytes = Buffer.byteLength(html, 'utf8');
  if (sizeBytes > DROP_MAX_BYTES) {
    const mb = (DROP_MAX_BYTES / 1024 / 1024).toFixed(0);
    return NextResponse.json({ error: `파일이 너무 큽니다. (최대 ${mb}MB)` }, { status: 413 });
  }

  if (!/<[a-z!]/i.test(html)) {
    return NextResponse.json({ error: 'HTML 파일이 아닌 것 같습니다.' }, { status: 400 });
  }

  // 3. 주소 중복 확인 — 단축 주소와 드롭 주소는 같은 이름 공간을 공유한다
  const [{ data: usedByUrl }, { data: usedByDrop }] = await Promise.all([
    supabaseAdmin.from('urls').select('code').eq('code', code).maybeSingle(),
    supabaseAdmin.from('drops').select('code, user_id').eq('code', code).maybeSingle(),
  ]);

  if (usedByUrl || (usedByDrop && usedByDrop.user_id !== user.id)) {
    return NextResponse.json({ error: '이미 사용 중인 주소입니다.' }, { status: 409 });
  }

  // 4. 저장 (한 사람당 하나이므로 기존 행이 있으면 교체)
  const { data: mine } = await supabaseAdmin
    .from('drops')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const payload = {
    code,
    user_id: user.id,
    html,
    title: extractTitle(html),
    size_bytes: sizeBytes,
    expires_at: calculateDropExpiry(expiry),
    updated_at: new Date().toISOString(),
  };

  const { error } = mine
    ? await supabaseAdmin.from('drops').update(payload).eq('id', mine.id)
    : await supabaseAdmin.from('drops').insert(payload);

  if (error) {
    // 유니크 위반(동시 요청 등)
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 주소입니다.' }, { status: 409 });
    }
    console.error('Drop save error:', error);
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ code, replaced: !!mine });
}

// ── 삭제 ─────────────────────────────────────────────────
export async function DELETE(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { error } = await supabaseAdmin.from('drops').delete().eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
