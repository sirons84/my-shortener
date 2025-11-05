// 파일 경로: middleware.js
// (이 코드로 파일 전체를 덮어쓰세요)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "./lib/supabaseAdmin";
import { toASCII } from "punycode";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 1. 앱 내부 페이지 경로 (이 경로는 DB 조회하면 안 됨)
  // (matcher에서 걸러지지 않은 앱 경로들)
  const APP_ROUTES = [
    "/",
    "/login",
    "/dashboard",
    "/privacy",
    "/terms",
  ];

  if (APP_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // 2. 위 APP_ROUTES에 해당하지 않으면 단축 코드로 간주
  // (matcher가 이미 api, _next, static, 파일 확장자(.png 등)를 걸러줌)
  const code = pathname.slice(1);
  
  // 3. (THE FIX) DB 조회를 위해 Punycode로 변환
  let punycodeCode = code;
  try {
    punycodeCode = toASCII(code); 
  } catch (e) {
    console.error("Middleware Punycode conversion failed:", e.message);
    return NextResponse.next(); 
  }

  // 4. Punycode로 DB 조회
  const { data } = await supabaseAdmin
    .from("urls")
    .select("url, expires_at")
    .eq("code", punycodeCode)
    .single();

  // 5. 리다이렉트
  if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
    return NextResponse.redirect(data.url);
  }

  // 6. 일치하는 코드 없으면 404 페이지로
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static (public/static 폴더가 있다면)
     * - 파일 확장자(.)가 포함된 모든 경로 (e.g., .png, .ico, .css)
     */
    '/((?!api|_next/static|_next/image|static|.*\\..*).*)'
  ],
};