import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(req) {
  const { url, customCode, expiry, userId } = await req.json();

  // 코드 결정
  const code = customCode && customCode.trim() !== "" ? customCode : uuidv4().slice(0, 6);

  // 만료일 계산
  let expiresAt = null;
  if (expiry === "1d") {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (expiry === "7d") {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (expiry === "30d") {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (expiry === "forever") {
    expiresAt = null; // 무제한
  }

  const { data, error } = await supabaseAdmin
    .from("urls")
    .insert([{ code, url, expires_at: expiresAt, user_id: userId }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ code: data.code });
}
