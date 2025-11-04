// 파일 경로: app/api/url/[code]/route.js
// (이 파일은 새로 생성하세요)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { supabase } from "../../../lib/supabaseClient";

// 사용자 인증 및 URL 소유권 확인
async function getUserAndUrl(req, code) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { user: null, urlData: null, error: "Unauthorized" };
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { user: null, urlData: null, error: "Invalid token" };
  }

  const { data, error } = await supabaseAdmin
    .from("urls")
    .select("user_id")
    .eq("code", code)
    .single();

  if (error || !data) {
    return { user, urlData: null, error: "URL not found" };
  }

  if (data.user_id !== user.id) {
    return { user, urlData: null, error: "Forbidden" };
  }

  return { user, urlData: data, error: null };
}

// 기능: 목적지 URL 변경 (PATCH)
export async function PATCH(req, { params }) {
  const { code } = params;
  const { newUrl } = await req.json();

  if (!newUrl) {
    return NextResponse.json({ error: "New URL is required" }, { status: 400 });
  }

  const { user, error: authError } = await getUserAndUrl(req, code);

  if (authError) {
    const status = authError === "Unauthorized" || authError === "Invalid token" ? 401
                   : authError === "Forbidden" ? 403
                   : 404;
    return NextResponse.json({ error: authError }, { status });
  }

  const { error: updateError } = await supabaseAdmin
    .from("urls")
    .update({ url: newUrl })
    .eq("code", code)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "URL updated successfully" });
}

// 기능: URL 삭제 (DELETE)
export async function DELETE(req, { params }) {
  const { code } = params;
  
  const { user, error: authError } = await getUserAndUrl(req, code);

  if (authError) {
    const status = authError === "Unauthorized" || authError === "Invalid token" ? 401
                   : authError === "Forbidden" ? 403
                   : 404;
    return NextResponse.json({ error: authError }, { status });
  }

  const { error: deleteError } = await supabaseAdmin
    .from("urls")
    .delete()
    .eq("code", code)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "URL deleted successfully" });
}