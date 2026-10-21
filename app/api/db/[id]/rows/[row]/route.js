// 외솔 DB — 행 하나 지우기 (「내 DB」 화면에서. 로그인했으니 교사 키 없이)
import { NextResponse } from 'next/server';
import { proxyDb } from '../../../../../../lib/oesolDb';

export async function DELETE(req, { params }) {
  const { id, row } = await params;
  if (!/^[a-z2-9]{12}$/.test(id) || !/^\d{1,12}$/.test(row)) {
    return NextResponse.json({ error: '표나 행이 없습니다.' }, { status: 404 });
  }
  return proxyDb(req, `/tables/${id}/rows/${row}`, { method: 'DELETE' });
}
