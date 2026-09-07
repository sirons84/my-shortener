import { NextResponse } from 'next/server';

import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';
import { hashKey, keyMatches, makeKey } from '../../../../lib/baeumteo/sign';
import { checkNumber, checkSchool } from '../../../../lib/baeumteo/nick';
import { makeClassCode, parseClassCode } from '../../../../lib/baeumteo/classCode';
import { words } from '../../../../lib/baeumteo/words';

export const dynamic = 'force-dynamic';

// 반 코드 (기획서 §7, 데이터설계 §5).
// 교사가 만들고 학생이 받아 적는다. 반에 담기는 것은 낱말 id 집합뿐이고,
// 누가 어떤 낱말을 실었는지는 두지 않는다.

const WORD_IDS = new Set(words.map((w) => w.id));
const ENTRY_LIMIT = 400;

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 학생·교사 모두에게 보여 줄 수 있는 만큼만 */
function publicView(row) {
  return {
    code: row.code,
    school: row.school,
    grade: row.grade,
    class: row.class,
    entries: row.entries || [],
  };
}

// ── 반 보기 ────────────────────────────────────────────────────
export async function GET(request) {
  const parsed = parseClassCode(new URL(request.url).searchParams.get('code'));
  if (!parsed.ok) return fail(parsed.reason);

  const { data, error } = await supabaseAdmin
    .from('baeumteo_classes')
    .select('code, school, grade, class, entries')
    .eq('code', parsed.code)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail('그런 반 코드가 없습니다.', 404);

  return NextResponse.json(publicView(data));
}

// ── 반 만들기 (교사) ───────────────────────────────────────────
export async function POST(request) {
  const limit = rateLimit(`baeumteo-class:${getClientIp(request)}`, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return fail('반을 너무 자주 만들었습니다. 잠시 뒤에 다시 해 주세요.', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('요청을 읽을 수 없습니다.');
  }

  const school = checkSchool(body?.school);
  if (!school.ok) return fail(school.reason);
  if (!school.school) return fail('학교 약칭을 적어 주세요.');
  if (!/^[가-힣A-Za-z]+$/.test(school.school)) {
    return fail('학교 약칭은 한글이나 영문으로만 적어 주세요.');
  }

  const grade = checkNumber(body?.grade, 6);
  const klass = checkNumber(body?.class, 30);
  if (grade < 1) return fail('학년을 골라 주세요.');
  if (klass < 1) return fail('반을 골라 주세요.');

  const ownerKey = makeKey();

  // 뒤 4자가 겹치면 다시 뽑는다. 32^4 이라 몇 번이면 충분하다
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeClassCode(school.school, grade, klass);
    const { data, error } = await supabaseAdmin
      .from('baeumteo_classes')
      .insert({ code, school: school.school, grade, class: klass, owner_key: hashKey(ownerKey) })
      .select('code, school, grade, class, entries')
      .single();

    if (!error) {
      // owner_key 는 여기서 한 번만 준다. 서버에는 해시만 남는다
      return NextResponse.json({ ...publicView(data), owner_key: ownerKey });
    }
    if (error.code !== '23505') return fail(error.message, 500);
  }

  return fail('반 코드를 만들지 못했습니다. 다시 눌러 주세요.', 500);
}

// ── 반 공동 사전에 낱말 얹기 (학생) ────────────────────────────
export async function PATCH(request) {
  const limit = rateLimit(`baeumteo-entries:${getClientIp(request)}`, { max: 60, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) return fail('잠시 뒤에 다시 보내 주세요.', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('요청을 읽을 수 없습니다.');
  }

  const parsed = parseClassCode(body?.code);
  if (!parsed.ok) return fail(parsed.reason);

  // 있는 낱말 id 만 받는다. 남이 만든 문자열이 반 사전에 들어가지 않게 한다
  const ids = [...new Set((Array.isArray(body?.entries) ? body.entries : []).filter((id) => WORD_IDS.has(id)))].slice(
    0,
    ENTRY_LIMIT,
  );
  if (ids.length === 0) return fail('얹을 낱말이 없습니다.');

  const { error } = await supabaseAdmin.rpc('baeumteo_add_entries', { p_code: parsed.code, p_ids: ids });
  if (error) return fail(error.message, 500);

  const { data } = await supabaseAdmin
    .from('baeumteo_classes')
    .select('code, school, grade, class, entries')
    .eq('code', parsed.code)
    .maybeSingle();

  if (!data) return fail('그런 반 코드가 없습니다.', 404);
  return NextResponse.json(publicView(data));
}

// ── 반 지우기 (교사) ───────────────────────────────────────────
export async function DELETE(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail('요청을 읽을 수 없습니다.');
  }

  const parsed = parseClassCode(body?.code);
  if (!parsed.ok) return fail(parsed.reason);

  const { data: row } = await supabaseAdmin
    .from('baeumteo_classes')
    .select('code, owner_key')
    .eq('code', parsed.code)
    .maybeSingle();

  if (!row) return NextResponse.json({ ok: true });
  if (!keyMatches(String(body?.owner_key || ''), row.owner_key)) {
    return fail('이 반을 지울 수 있는 열쇠가 아닙니다.', 403);
  }

  // 반을 지우면 그 반으로 남은 기록도 함께 지운다 (기획서 §9)
  await supabaseAdmin.from('baeumteo_scores').delete().eq('class_code', parsed.code);
  const { error } = await supabaseAdmin.from('baeumteo_classes').delete().eq('code', parsed.code);
  if (error) return fail(error.message, 500);

  return NextResponse.json({ ok: true });
}
