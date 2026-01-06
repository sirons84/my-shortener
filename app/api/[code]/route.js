import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { supabase } from "../../../lib/supabaseClient";

// 사용자 및 URL 검증 함수
async function getUserAndUrl(req, code) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return { error: "Unauthorized", status: 401 };

  const token = authHeader.split(" ")[1];
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) return { error: "Invalid token", status: 401 };

  // 한글 코드 디코딩
  const targetCode = decodeURIComponent(code);

  const { data, error } = await supabaseAdmin
    .from("urls") // urls 테이블 사용
    .select("user_id")
    .eq("code", targetCode)
    .single();

  if (error || !data) return { error: "URL not found", status: 404 };
  if (data.user_id !== user.id) return { error: "Forbidden", status: 403 };

  return { user, urlData: data };
}

// PATCH: URL 수정
export async function PATCH(req, { params }) {
  const { code } = await params; // await 필수!
  const { newUrl } = await req.json();

  if (!newUrl) return NextResponse.json({ error: "New URL is required" }, { status: 400 });

  const { user, error, status } = await getUserAndUrl(req, code);
  if (error) return NextResponse.json({ error }, { status });

  const targetCode = decodeURIComponent(code);
  const { error: updateError } = await supabaseAdmin
    .from("urls")
    .update({ url: newUrl })
    .eq("code", targetCode)
    .eq("user_id", user.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ message: "Updated" });
}

// DELETE: URL 삭제
export async function DELETE(req, { params }) {
  const { code } = await params; // await 필수!

  const { user, error, status } = await getUserAndUrl(req, code);
  if (error) return NextResponse.json({ error }, { status });

  const targetCode = decodeURIComponent(code);
  const { error: deleteError } = await supabaseAdmin
    .from("urls")
    .delete()
    .eq("code", targetCode)
    .eq("user_id", user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ message: "Deleted" });
}