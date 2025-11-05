// 파일 경로: middleware.js
// (이 코드로 파일 전체를 덮어쓰세요)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "./lib/supabaseAdmin";
import { toASCII } from "punycode"; // toASCII 임포트

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 1. 앱 내부 페이지 경로 (이 경로는 DB 조회하면 안 됨)
  const APP_ROUTES = [
    "/",
    "/login",
    "/dashboard",
    "/privacy",
    "/terms",
  ];
  
  // 2. API, 폰트, 이미지 등 정적 리소스 경로
  const RESERVED_PREFIXES = [
    "/api/",
    "/_next/",
    "/static/",
  ];

  // 3. 정적 리소스 경로는 통과
  if (RESERVED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 4. 파일 확장자가 있는 경우 (e.g., /logo.png, /favicon.ico) 통과
  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  // 5. 앱 내부 페이지 경로는 통과
  if (APP_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // 6. 위 모든것에 해당 안되면 단축 코드로 간주 (e.g., "/네이버" 또는 "/ming2")
  // 맨 앞 "/" 제거
  const code = pathname.slice(1);
  
  // 7. (THE FIX) DB 조회를 위해 Punycode로 변환
  // "네이버" -> "xn--9t4b11yi5a"
  // "ming2" -> "ming2" (변경 없음)
  let punycodeCode = code;
  try {
    // toASCII는 한글/영문 모두 안전하게 변환
    punycodeCode = toASCII(code); 
  } catch (e) {
    console.error("Middleware Punycode conversion failed:", e.message);
    return NextResponse.next(); 
  }

  // 8. Punycode로 DB 조회
  const { data } = await supabaseAdmin
    .from("urls")
    .select("url, expires_at")
    .eq("code", punycodeCode) // Punycode로 조회
    .single();

  // 9. 리다이렉트
  if (data && (!data.expires_at || new Date(data.expires_at) > new Date())) {
    return NextResponse.redirect(data.url);
  }

  // 10. 일치하는 코드 없으면 404 페이지로
  return NextResponse.next();
}

export const config = {
  // 모든 경로를 미들웨어에서 검사하도록 변경
  matcher: '/:path*',
};