import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin';
import { supabase } from '../../../../../../lib/supabaseClient';
import { isAdmin, TIERS, getLimits, getTier, normalizeLimit } from '../../../../../../lib/constants';

// 관리자용: 회원 등급·개별 한도 바꾸기
// PUT { tier?: 'vip'|'teacher'|'basic', limits?: { urls?, drops?, db? } | null }
//   - tier: 등급 키. 관리자(ADMIN_EMAILS)는 항상 admin 이라 바꿀 수 없다.
//   - limits: 개별 한도. 키가 있으면 그 값(null = 무제한)을 등급 기본값 대신 쓴다. null 을 보내면 개별 한도를 지운다.
export const dynamic = 'force-dynamic';

const LIMIT_KEYS = ['urls', 'drops', 'db'];

export async function PUT(req, { params }) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const { data: { user: me }, error } = await supabase.auth.getUser(token);
  if (error || !me || !isAdmin(me.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 }); }

  const { data: found, error: findError } = await supabaseAdmin.auth.admin.getUserById(id);
  const target = found?.user;
  if (findError || !target) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
  if (isAdmin(target.email)) return NextResponse.json({ error: '관리자 계정의 등급은 바꿀 수 없습니다.' }, { status: 400 });

  const meta = { ...(target.app_metadata || {}) };

  if (body.tier !== undefined) {
    if (!TIERS[body.tier] || body.tier === 'admin') {
      return NextResponse.json({ error: `등급은 ${Object.keys(TIERS).filter((t) => t !== 'admin').join(' · ')} 중 하나여야 합니다.` }, { status: 400 });
    }
    meta.tier = body.tier;
  }

  if (body.limits === null) {
    delete meta.limits;
  } else if (body.limits && typeof body.limits === 'object') {
    const limits = {};
    for (const k of LIMIT_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(body.limits, k)) continue;
      const v = body.limits[k];
      if (v === undefined) continue; // 키를 빼면 등급 기본값
      limits[k] = normalizeLimit(v); // null = 무제한
    }
    if (Object.keys(limits).length) meta.limits = limits; else delete meta.limits;
  }

  const { data: updated, error: updError } = await supabaseAdmin.auth.admin.updateUserById(id, { app_metadata: meta });
  if (updError) return NextResponse.json({ error: updError.message }, { status: 500 });

  const u = updated.user;
  return NextResponse.json({
    id: u.id,
    tier: getTier(u),
    limits: getLimits(u),
    customLimits: u.app_metadata?.limits || null,
  });
}
