import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(_req, { params }) {
  const code = params.code;

  const { data, error } = await supabaseAdmin
    .from("urls")
    .select("url, expires_at")
    .eq("code", code)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "URL not found" }, { status: 404 });
  }

  // 만료 확인
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "URL expired" }, { status: 410 });
  }

  return NextResponse.redirect(data.url);
}
