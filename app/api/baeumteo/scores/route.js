import { NextResponse } from 'next/server';

import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getClientIp, rateLimit } from '../../../../lib/rateLimit';
import { hashKey, keyMatches, makeKey, readTicket } from '../../../../lib/baeumteo/sign';
import { checkNick, checkNumber, checkSchool } from '../../../../lib/baeumteo/nick';
import { normalizeClassCode, parseClassCode } from '../../../../lib/baeumteo/classCode';
import { maxScore } from '../../../../lib/baeumteo/defense';
import { words } from '../../../../lib/baeumteo/words';
import defenseConfig from '../../../../data/games/defense.json';
import dictionaryConfig from '../../../../data/games/dictionary.json';

export const dynamic = 'force-dynamic';

// 서버가 학생에게서 받는 유일한 것 (기획서 §9).
// 실명은 받지 않는다. 별명 4자, 학교 약칭, 학년·반 숫자가 전부다.

const GAMES = {
  defense: { max: maxScore(defenseConfig) },
  // 사전 편찬소는 실은 낱말 수가 점수다. 사전에 있는 낱말보다 많이 실을 수는 없다.
  // 같은 개수면 빨리 채운 쪽이 앞이므로 걸린 시간(ms)도 함께 받는다.
  dictionary: { max: words.length, maxMs: dictionaryConfig.round_ms, timed: true },
};

const TOP = 100;
// 순위판을 묶어 셈할 때 읽어 오는 줄 수. 반·학교 점수는 상위 10명 합이다.
const POOL = 1000;
const GROUP_TAKE = 10;

const COLUMNS = 'id, score, ms, nick, school, grade, class, class_code, at';

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** 상위 10명 합으로 묶는다 (데이터설계 §6) */
function group(rows, keyOf) {
  const buckets = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }

  return [...buckets.entries()]
    .map(([key, list]) => {
      const top = list.sort((a, b) => b.score - a.score).slice(0, GROUP_TAKE);
      return {
        key,
        score: top.reduce((sum, row) => sum + row.score, 0),
        members: top.length,
        best: top[0]?.nick || '',
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP);
}

// ── 순위판 보기 ────────────────────────────────────────────────
export async function GET(request) {
  const url = new URL(request.url);
  const game = String(url.searchParams.get('game') || '');
  const tab = String(url.searchParams.get('tab') || 'solo');
  const code = normalizeClassCode(url.searchParams.get('code') || '');

  if (!GAMES[game]) return fail('없는 게임입니다.');

  let query = supabaseAdmin
    .from('baeumteo_scores')
    .select(COLUMNS)
    .eq('game', game)
    .order('score', { ascending: false })
    .order('ms', { ascending: true, nullsFirst: false })
    .order('at', { ascending: true });

  // 한 반만 볼 때는 그 반의 기록만 읽는다
  if (tab === 'solo' && code) query = query.eq('class_code', code);

  const { data, error } = await query.limit(tab === 'solo' ? TOP : POOL);
  if (error) return fail(error.message, 500);

  const rows = data || [];

  if (tab === 'class') {
    return NextResponse.json({ tab, rows: group(rows, (r) => r.class_code) });
  }
  if (tab === 'school') {
    return NextResponse.json({ tab, rows: group(rows, (r) => r.school) });
  }

  // 상위 100위 안일 때만 입력창을 띄우려면 100등 점수를 알아야 한다
  const cutoff = rows.length >= TOP ? rows[TOP - 1].score : 0;
  return NextResponse.json({ tab: 'solo', rows, cutoff, full: rows.length >= TOP });
}

// ── 기록 남기기 ────────────────────────────────────────────────
export async function POST(request) {
  const limit = rateLimit(`baeumteo-score:${getClientIp(request)}`, { max: 20, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) return fail('기록을 너무 자주 냈습니다. 잠시 뒤에 다시 해 주세요.', 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('요청을 읽을 수 없습니다.');
  }

  const game = String(body?.game || '');
  const rules = GAMES[game];
  if (!rules) return fail('없는 게임입니다.');

  const ticket = readTicket(body?.ticket, game);
  if (!ticket.ok) return fail(ticket.reason);

  const score = Number(body?.score);
  if (!Number.isInteger(score) || score < 0) return fail('점수가 이상합니다.');
  if (score > rules.max) return fail('점수가 이 게임에서 나올 수 있는 값을 넘었습니다.');

  // 걸린 시간. 시간을 재지 않는 게임은 0 으로 둔다
  let ms = 0;
  if (rules.timed) {
    ms = Number(body?.ms);
    if (!Number.isInteger(ms) || ms <= 0 || ms > rules.maxMs) {
      return fail('걸린 시간이 이상합니다.');
    }
    // 판에서 잰 시간보다 빨리 돌아왔다면 그 판을 실제로 돈 것이 아니다
    if (ticket.ageMs < ms) return fail('판이 끝나기 전에 온 기록입니다.');
  }

  // 한 점을 얻으려면 적어도 이만큼은 판이 돌아가야 한다.
  // 조작을 다 막지는 못하고, 표를 끊자마자 큰 점수를 내는 것만 막는다.
  if (ticket.ageMs < 10_000 || (!rules.timed && ticket.ageMs < score * 900)) {
    return fail('판이 끝나기 전에 온 기록입니다.');
  }

  const nick = checkNick(body?.nick);
  if (!nick.ok) return fail(nick.reason);

  const school = checkSchool(body?.school);
  if (!school.ok) return fail(school.reason);

  let classCode = '';
  if (body?.class_code) {
    const parsed = parseClassCode(body.class_code);
    if (!parsed.ok) return fail(parsed.reason);

    // 없는 반 코드로 기록을 만들지 않는다. 오타 하나로 유령 반이 생긴다
    const { data: found } = await supabaseAdmin
      .from('baeumteo_classes')
      .select('code')
      .eq('code', parsed.code)
      .maybeSingle();
    if (!found) return fail('그런 반 코드가 없습니다.');

    classCode = parsed.code;
  }

  const eraseKey = makeKey();
  const { data, error } = await supabaseAdmin
    .from('baeumteo_scores')
    .insert({
      game,
      score,
      ms,
      nick: nick.nick,
      school: school.school,
      grade: checkNumber(body?.grade, 6),
      class: checkNumber(body?.class, 30),
      class_code: classCode,
      erase_key: hashKey(eraseKey),
    })
    .select(COLUMNS)
    .single();

  if (error) return fail(error.message, 500);

  // 몇 등인지. 나보다 점수가 높은 기록 + 같은 점수인데 더 빨리 채운 기록
  const { count } = await supabaseAdmin
    .from('baeumteo_scores')
    .select('id', { count: 'exact', head: true })
    .eq('game', game)
    .gt('score', score);

  let faster = 0;
  if (rules.timed) {
    const { count: tied } = await supabaseAdmin
      .from('baeumteo_scores')
      .select('id', { count: 'exact', head: true })
      .eq('game', game)
      .eq('score', score)
      .gt('ms', 0)
      .lt('ms', ms);
    faster = tied || 0;
  }

  // erase_key 는 여기서 한 번만 준다. 서버에는 해시만 남는다
  return NextResponse.json({ row: data, rank: (count || 0) + faster + 1, erase_key: eraseKey });
}

// ── 기록 지우기 (기획서 §9: 이유 없이 즉시) ─────────────────────
export async function DELETE(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail('요청을 읽을 수 없습니다.');
  }

  const id = String(body?.id || '');
  if (!id) return fail('지울 기록을 알 수 없습니다.');

  const { data: row, error } = await supabaseAdmin
    .from('baeumteo_scores')
    .select('id, class_code, erase_key')
    .eq('id', id)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!row) return NextResponse.json({ ok: true }); // 이미 없으면 지운 것과 같다

  // 본인 브라우저의 열쇠, 또는 그 반을 만든 교사의 열쇠라야 지운다
  let allowed = body?.erase_key ? keyMatches(String(body.erase_key), row.erase_key) : false;

  if (!allowed && body?.owner_key && row.class_code) {
    const { data: klass } = await supabaseAdmin
      .from('baeumteo_classes')
      .select('owner_key')
      .eq('code', row.class_code)
      .maybeSingle();
    allowed = !!klass && keyMatches(String(body.owner_key), klass.owner_key);
  }

  if (!allowed) return fail('이 기록을 지울 수 있는 열쇠가 아닙니다.', 403);

  const { error: gone } = await supabaseAdmin.from('baeumteo_scores').delete().eq('id', id);
  if (gone) return fail(gone.message, 500);

  return NextResponse.json({ ok: true });
}
