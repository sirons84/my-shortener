// 파일 경로: middleware.js
// (이 코드로 파일 전체를 덮어쓰세요)

import { NextResponse } from 'next/server';

// 1. 앱 내부 페이지 경로 (이 경로는 통과)
const APP_ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/privacy',
  '/terms',
];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // 2. 앱 내부 페이지 경로는 통과
  if (APP_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // 3. (중요) 그 외 모든 경로는 /r/[code] 핸들러로 리라이트
  //    (e.g., /네이버 -> /r/네이버)
  //    DB 쿼리는 미들웨어가 아닌 /r/[code] 핸들러가 수행
  const code = pathname.slice(1);
  
  // DB 쿼리 없이 원본 코드를 /r/ 핸들러로 넘김
  return NextResponse.rewrite(new URL(`/r/${code}`, req.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes, e.g., /api/shorten)
     * - r (새로 만든 핸들러 경로, /r/code)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static (public/static 폴더)
     * - 파일 확장자(.)가 포함된 모든 경로 (e.g., logo.png, favicon.ico)
     */
    '/((?!api|r|_next/static|_next/image|static|.*\\..*).*)'
  ],
};