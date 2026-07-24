import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { supabase } from '../../../../lib/supabaseClient';
import { isAdmin } from '../../../../lib/constants';

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

    rows.push({ position: i + 1, title, author, url, cover, updated_at: new Date().toISOString() });
  }

  const { error } = await supabaseAdmin.from('recommended_books').upsert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
