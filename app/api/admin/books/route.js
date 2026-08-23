import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';
import { isAdmin } from '../../../../lib/constants';
import { AWARD_TONE_VALUES } from '../../../../lib/mappers/book';

async function verifyAdmin(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !isAdmin(user.email)) return null;
  return user;
}

// 추천도서 3개 슬롯 저장 (관리자 전용)
export async function PUT(req) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body) || body.length !== 3) {
    return NextResponse.json({ error: '도서 3개 슬롯을 모두 보내야 합니다.' }, { status: 400 });
  }

  const rows = [];
  for (let i = 0; i < 3; i++) {
    const b = body[i] || {};
    const title = String(b.title || '').trim().slice(0, 100);
    const author = String(b.author || '').trim().slice(0, 100);
    const url = String(b.url || '').trim().slice(0, 500);
    const cover = String(b.cover || '').trim().slice(0, 500);

    // 링크는 http(s) 또는 빈 값만 허용
    if (url && !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: `${i + 1}번 도서의 링크는 http(s)로 시작해야 합니다.` }, { status: 400 });
    }
    // 표지는 http(s) 또는 사이트 내부 경로(/books/...)만 허용
    if (cover && !/^https?:\/\//.test(cover) && !cover.startsWith('/')) {
      return NextResponse.json({ error: `${i + 1}번 도서의 표지는 이미지 주소(http...) 또는 /books/ 경로여야 합니다.` }, { status: 400 });
    }
    // 제목이 있는데 링크가 없으면 카드가 눌리지 않으므로 막기
    if (title && !url) {
      return NextResponse.json({ error: `${i + 1}번 도서의 링크를 입력해 주세요.` }, { status: 400 });
    }

    // 수상 마크 — 토글이 꺼져 있으면 전부 NULL 저장
    const a = b.award || {};
    let award = { award_rank: null, award_ribbon: null, award_caption1: null, award_caption2: null, award_tone: 'gold' };
    if (a.enabled) {
      if (!title) {
        return NextResponse.json({ error: `${i + 1}번 도서 정보를 먼저 입력해야 수상 마크를 켤 수 있습니다.` }, { status: 400 });
      }
      const rank = Number(a.rank);
      if (!Number.isInteger(rank) || rank < 1 || rank > 99) {
        return NextResponse.json({ error: `${i + 1}번 도서의 순위 숫자는 1~99 사이여야 합니다.` }, { status: 400 });
      }
      const ribbon = String(a.ribbon || '').trim();
      if (!ribbon) {
        return NextResponse.json({ error: `${i + 1}번 도서의 리본 문구를 입력해 주세요.` }, { status: 400 });
      }
      if (ribbon.length > 14) {
        return NextResponse.json({ error: `${i + 1}번 도서의 리본 문구는 최대 14자입니다.` }, { status: 400 });
      }
      const toneValue = String(a.tone || 'gold');
      if (!AWARD_TONE_VALUES.includes(toneValue)) {
        return NextResponse.json({ error: `${i + 1}번 도서의 색상 톤이 올바르지 않습니다.` }, { status: 400 });
      }
      award = {
        award_rank: rank,
        award_ribbon: ribbon,
        award_caption1: String(a.caption1 || '').trim().slice(0, 30) || null,
        award_caption2: String(a.caption2 || '').trim().slice(0, 30) || null,
        award_tone: toneValue,
      };
    }

    rows.push({ position: i + 1, title, author, url, cover, ...award, updated_at: new Date().toISOString() });
  }

  const { error } = await supabaseAdmin.from('recommended_books').upsert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
