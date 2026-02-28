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

// PATCH: URL 및 코드 수정
export async function PATCH(req, { params }) {
  const { code } = await params; // await 필수!
  const { newUrl, newCode } = await req.json();

  if (!newUrl && !newCode) return NextResponse.json({ error: "수정할 내용이 없습니다." }, { status: 400 });

  const { user, error, status } = await getUserAndUrl(req, code);
  if (error) return NextResponse.json({ error }, { status });

  const targetCode = decodeURIComponent(code);
  const updateData = {};
  if (newUrl) updateData.url = newUrl;
  if (newCode) updateData.code = newCode;

  const { error: updateError } = await supabaseAdmin
    .from("urls")
    .update(updateData)
    .eq("code", targetCode)
    .eq("user_id", user.id);

  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 단축 코드입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

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