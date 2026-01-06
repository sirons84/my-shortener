import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin"; // 관리자 권한 사용
import { supabase } from "../../../lib/supabaseClient"; // 토큰 검증용

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 변경된 테이블(urls)에서 조회
  const { data, error } = await supabaseAdmin
    .from("urls") 
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 중요: 배열(data)을 그대로 반환합니다. ({ urls: data } 아님)
  return NextResponse.json(data);
}