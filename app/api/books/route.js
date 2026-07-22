import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// 금주의 추천도서 목록 (공개)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('recommended_books')
    .select('position, title, author, url, cover')
    .order('position');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
