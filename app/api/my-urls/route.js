import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. 토큰 검증
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const token = authHeader.split(" ")[1];
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. 데이터 조회 (urls 테이블, 관리자 권한 사용)
  const { data, error } = await supabaseAdmin
    .from("urls") 
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}