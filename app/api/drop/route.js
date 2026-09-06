// 외솔 드롭(베타) API — 내 드롭 목록 / 배포(교체) / 내리기
//
// 계정당 배포 가능 개수는 getDropLimit 로 정한다(@usedu.ai.kr 2개, 그 외 1개, 관리자 무제한).
// 주소는 단축 주소와 같은 이름 공간을 쓰므로 urls 쪽도 함께 확인한다.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { supabase } from '../../../lib/supabaseClient';
import { validateCustomCode, getDropLimit } from '../../../lib/constants';
import { DROP_MAX_BYTES, getDropOrigin, calculateDropExpiry } from '../../../lib/drop';
import { rateLimit } from '../../../lib/rateLimit';

const DROP_FIELDS = 'code, title, size_bytes, view_count, is_blocked, expires_at, created_at, updated_at';

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

// ── 내 드롭 목록 ─────────────────────────────────────────
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('drops')
    .select(DROP_FIELDS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    drops: data || [],
    limit: getDropLimit(user.email),
    enabled: !!getDropOrigin(),
  });
}

// ── 배포 / 교체 ──────────────────────────────────────────
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

  const { code: rawCode, html, expiry, replaceCode } = body || {};

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

  // 4. 교체할 대상 정하기
  //    - replaceCode 를 보냈으면 그 페이지를 교체 (주소도 바꿀 수 있다)
  //    - 아니면 같은 주소를 이미 내가 쓰고 있을 때 그 페이지를 교체
  //    - 둘 다 아니면 새로 배포 (개수 한도 확인)
  const { data: mine, error: listError } = await supabaseAdmin
    .from('drops')
    .select('id, code')
    .eq('user_id', user.id);

  if (listError) {
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }

  const target =
    (replaceCode && (mine || []).find((d) => d.code === replaceCode)) ||
    (usedByDrop && (mine || []).find((d) => d.code === code)) ||
    null;

  if (!target) {
    const limit = getDropLimit(user.email);
    if (limit !== null && (mine || []).length >= limit) {
      return NextResponse.json(
        { error: `배포할 수 있는 페이지를 모두 사용했습니다. (최대 ${limit}개) 기존 페이지를 교체하거나 내려주세요.` },
        { status: 403 }
      );
    }
  }

  const payload = {
    code,
    user_id: user.id,
    html,
    title: extractTitle(html),
    size_bytes: sizeBytes,
    expires_at: calculateDropExpiry(expiry),
    updated_at: new Date().toISOString(),
  };

  const { error } = target
    ? await supabaseAdmin.from('drops').update(payload).eq('id', target.id)
    : await supabaseAdmin.from('drops').insert(payload);

  if (error) {
    // 유니크 위반(동시 요청 등)
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 주소입니다.' }, { status: 409 });
    }
    console.error('Drop save error:', error);
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ code, replaced: !!target });
}

// ── 내리기 ───────────────────────────────────────────────
export async function DELETE(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const code = new URL(req.url).searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: '내릴 주소를 지정해주세요.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('drops')
    .delete()
    .eq('user_id', user.id)
    .eq('code', code);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
