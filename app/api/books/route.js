import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { mapBookAward } from '../../../lib/mappers/book';

export const dynamic = 'force-dynamic';

// 금주의 추천도서 목록 (공개)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('recommended_books')
    .select('position, title, author, url, cover, award_rank, award_ribbon, award_caption1, award_caption2, award_tone')
    .order('position');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // award: 카드에서 바로 쓰는 매핑 객체 (수상 정보 없으면 null)
  return NextResponse.json((data || []).map((r) => ({ ...r, award: mapBookAward(r) })));
}
