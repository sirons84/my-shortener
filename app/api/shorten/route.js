// 파일 경로: app/api/shorten/route.js
// (기존 파일 덮어쓰기)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";   // ✅ 상대경로 유지
import { supabase } from "../../../lib/supabaseClient";       // ✅ 클라이언트 SDK도 상대경로
import { v4 as uuidv4 } from "uuid";
// + NEW: punycode의 toASCII 임포트 (3번 기능)
import { toASCII } from "punycode";

export async function POST(req) {
  const { url, customCode, expiry } = await req.json();

  // ✅ Authorization 헤더에서 토큰 추출
  const authHeader = req.headers.get("authorization");
  let userId = null;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error("Auth error:", error.message);
    }
    userId = user?.id ?? null;
  }

  // + CHANGED: customCode가 있을 경우 toASCII로 변환 (3번 기능)
  const code =
    customCode && customCode.trim() !== ""
      ? toASCII(customCode.trim()) // 한글을 Punycode로 변환
      : uuidv4().slice(0, 6);

  // 만료일 계산
  let expiresAt = null;
  if (expiry === "1d") { // 1일 옵션 (혹시 몰라 추가)
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (expiry === "7d") {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (expiry === "30d") {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (expiry === "180d") {
    expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  } else if (expiry === "365d") {
    expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  } else if (expiry === "forever") {
    expiresAt = null;
  }
  // 그 외의 경우 (기본값, 7d)
  else {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }


  // DB 저장
  const { data, error } = await supabaseAdmin
    .from("urls")
    .insert([{ code, url, expires_at: expiresAt, user_id: userId }]) // ✅ user_id는 여기서 자동 주입
    .select()
    .single();

  if (error) {
    // 400 Bad Request 대신 409 Conflict (중복) 또는 500 (그 외)
    if (error.code === '23505') { // Supabase 중복 키 오류 코드
       return NextResponse.json({ error: "duplicate key" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code: data.code });
}