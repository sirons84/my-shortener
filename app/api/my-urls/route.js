import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabaseClient";

// Next.js App Router 방식의 GET 핸들러
export async function GET(req) {
  // 1. 사용자 인증 (헤더의 Authorization 토큰 확인)
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. 데이터 조회 (테이블명: links -> urls 로 변경)
  // 최신순으로 정렬 (created_at이 있다면 사용, 없다면 생략 가능하지만 보통 내림차순 정렬을 선호)
  const { data, error } = await supabase
    .from("urls") 
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}