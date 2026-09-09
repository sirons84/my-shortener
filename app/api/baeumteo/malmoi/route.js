import { NextResponse } from 'next/server';

import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';
import { hashKey, keyMatches, makeKey } from '../../../../lib/baeumteo/sign';
import { checkNick } from '../../../../lib/baeumteo/nick';
import { parseClassCode } from '../../../../lib/baeumteo/classCode';
import {
  checkDistrict,
  checkMeaning,
  checkNote,
  checkPlace,
  checkRelation,
  checkWord,
} from '../../../../lib/baeumteo/malmoi';

export const dynamic = 'force-dynamic';

// 울산 말모이 원정대 (기획서 §8-6).
// 서버에 쓰기가 있는 유일한 게임이다. 학생이 올리고 교사가 확인한다.
// 확인 전 낱말은 올린 브라우저(열쇠)와 그 반 교사(열쇠)만 본다.

const PUBLIC = 'id, word, meaning, district, place, heard_from, nick, status, note, created_at, reviewed_at';
const LIMIT = 500;

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** 그 반의 교사 열쇠가 맞는가 */
async function isOwner(code, ownerKey) {
  if (!ownerKey) return false;
  const { data } = await supabaseAdmin.from('baeumteo_classes').select('owner_key').eq('code', code).maybeSingle();
  return !!data && keyMatches(String(ownerKey), data.owner_key);
}

// ── 확인된 낱말 보기 (누구나, 반 코드로) ───────────────────────
export async function GET(request) {
  const parsed = parseClassCode(new URL(request.url).searchParams.get('code'));
  if (!parsed.ok) return fail(parsed.reason);

  const { data, error } = await supabaseAdmin
    .from('baeumteo_malmoi')
    .select(PUBLIC)
    .eq('class_code', parsed.code)
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(LIMIT);

  if (error) return fail(error.message, 500);
  return NextResponse.json({ code: parsed.code, rows: data || [] });
}

// ── 올리기 (학생) ──────────────────────────────────────────────
export async function POST(request) {
  const limit = rateLimit(`baeumteo-malmoi:${getClientIp(request)}`, { max: 20, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return fail('낱말을 너무 자주 올렸습니다. 잠시 뒤에 다시 해 주세요.', 429);

  const body = await readBody(request);
  if (!body) return fail('요청을 읽을 수 없습니다.');

  const parsed = parseClassCode(body.code);
  if (!parsed.ok) return fail(parsed.reason);

  const word = checkWord(body.word);
  if (!word.ok) return fail(word.reason);
  const meaning = checkMeaning(body.meaning);
  if (!meaning.ok) return fail(meaning.reason);
  const district = checkDistrict(body.district);
  if (!district.ok) return fail(district.reason);
  const place = checkPlace(body.place);
  if (!place.ok) return fail(place.reason);
  const relation = checkRelation(body.heard_from);
  if (!relation.ok) return fail(relation.reason);

  let nick = '';
  if (body.nick) {
    const checked = checkNick(body.nick);
    if (!checked.ok) return fail(checked.reason);
    nick = checked.nick;
  }

  // 없는 반 코드로는 올리지 않는다. 확인해 줄 교사가 없다
  const { data: klass } = await supabaseAdmin.from('baeumteo_classes').select('code').eq('code', parsed.code).maybeSingle();
  if (!klass) return fail('그런 반 코드가 없습니다.');

  const submitKey = makeKey();
  const { data, error } = await supabaseAdmin
    .from('baeumteo_malmoi')
    .insert({
      class_code: parsed.code,
      word: word.word,
      meaning: meaning.meaning,
      district: district.district,
      place: place.place,
      heard_from: relation.relation,
      nick,
      submit_key: hashKey(submitKey),
    })
    .select(PUBLIC)
    .single();

  if (error) return fail(error.message, 500);

  // submit_key 는 여기서 한 번만 준다. 서버에는 해시만 남는다
  return NextResponse.json({ row: data, submit_key: submitKey });
}

// ── 내가 올린 낱말 보기 (학생, 열쇠로) ─────────────────────────
export async function PUT(request) {
  const body = await readBody(request);
  const items = Array.isArray(body?.items) ? body.items.slice(0, 100) : [];
  if (items.length === 0) return NextResponse.json({ rows: [] });

  const ids = items.map((it) => String(it?.id || '')).filter(Boolean);
  const { data, error } = await supabaseAdmin
    .from('baeumteo_malmoi')
    .select(`${PUBLIC}, submit_key`)
    .in('id', ids);

  if (error) return fail(error.message, 500);

  // 열쇠가 맞는 줄만 돌려준다
  const rows = (data || [])
    .filter((row) => {
      const key = items.find((it) => it.id === row.id)?.key;
      return key && keyMatches(String(key), row.submit_key);
    })
    .map(({ submit_key: _drop, ...row }) => row);

  return NextResponse.json({ rows });
}

// ── 교사 확인 ──────────────────────────────────────────────────
// status 없이 부르면 그 반의 전체 목록, status 와 id 를 주면 결정을 적는다
export async function PATCH(request) {
  const body = await readBody(request);
  if (!body) return fail('요청을 읽을 수 없습니다.');

  const parsed = parseClassCode(body.code);
  if (!parsed.ok) return fail(parsed.reason);
  if (!(await isOwner(parsed.code, body.owner_key))) {
    return fail('이 반을 확인할 수 있는 열쇠가 아닙니다.', 403);
  }

  if (!body.id) {
    const { data, error } = await supabaseAdmin
      .from('baeumteo_malmoi')
      .select(PUBLIC)
      .eq('class_code', parsed.code)
      .order('created_at', { ascending: false })
      .limit(LIMIT);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ code: parsed.code, rows: data || [] });
  }

  const status = String(body.status || '');
  if (!['approved', 'returned', 'pending'].includes(status)) return fail('알 수 없는 결정입니다.');
  const note = checkNote(body.note).note;

  const { data, error } = await supabaseAdmin
    .from('baeumteo_malmoi')
    .update({ status, note, reviewed_at: new Date().toISOString() })
    .eq('id', String(body.id))
    .eq('class_code', parsed.code)
    .select(PUBLIC)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail('그런 낱말이 없습니다.', 404);
  return NextResponse.json({ row: data });
}

// ── 지우기 (올린 학생 또는 그 반 교사) ─────────────────────────
export async function DELETE(request) {
  const body = await readBody(request);
  if (!body) return fail('요청을 읽을 수 없습니다.');

  const id = String(body.id || '');
  if (!id) return fail('지울 낱말을 알 수 없습니다.');

  const { data: row, error } = await supabaseAdmin
    .from('baeumteo_malmoi')
    .select('id, class_code, submit_key')
    .eq('id', id)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!row) return NextResponse.json({ ok: true });

  let allowed = body.submit_key ? keyMatches(String(body.submit_key), row.submit_key) : false;
  if (!allowed && body.owner_key) allowed = await isOwner(row.class_code, body.owner_key);
  if (!allowed) return fail('이 낱말을 지울 수 있는 열쇠가 아닙니다.', 403);

  const { error: gone } = await supabaseAdmin.from('baeumteo_malmoi').delete().eq('id', id);
  if (gone) return fail(gone.message, 500);
  return NextResponse.json({ ok: true });
}
