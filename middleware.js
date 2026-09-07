// 파일 경로: middleware.js
// (이 코드로 파일 전체를 덮어쓰세요)

import { NextResponse } from 'next/server';
import { getDropOrigin } from './lib/drop';

// 외솔 드롭 콘텐츠 오리진에서 앱 화면을 막을 때 돌려보낼 본 사이트 주소
const MAIN_SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://xn--im4bl3g.xn--3e0b707e';

// 1. 앱 내부 페이지 경로 (이 경로는 통과)
const APP_ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/admin',
  '/privacy',
  '/terms',
  '/baeumteo',
  '/auth/callback',
];

// 배움터 안의 한글 주소 → 실제 라우트 폴더
const BAEUMTEO_ROUTES = {
  '/사전편찬소': 'dictionary',
  '/우리말지키기': 'defense',
  '/반': 'class',
};

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // 0. 드롭 콘텐츠 오리진에서는 /d/ 외에 아무 화면도 열어주지 않는다.
  //    이 호스트에서 로그인 화면이 열리면 그 오리진에 세션이 생기고,
  //    사용자가 올린 페이지의 스크립트가 그 세션을 만질 수 있게 된다.
  const dropOrigin = getDropOrigin();
  if (dropOrigin) {
    const host = req.headers.get('host')?.toLowerCase();
    if (host && host === new URL(dropOrigin).host.toLowerCase()) {
      return NextResponse.redirect(MAIN_SITE);
    }
  }

  // 2. 앱 내부 페이지 경로는 통과
  //    (한글 경로는 퍼센트 인코딩돼 들어오므로 디코딩한 형태도 함께 본다)
  let decodedPath = pathname;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    /* 잘못된 인코딩이면 원본 그대로 둔다 */
  }

  if (APP_ROUTES.includes(pathname) || APP_ROUTES.includes(decodedPath)) {
    return NextResponse.next();
  }

  // 배움터 하위 라우트(/baeumteo/dictionary 등)로 바로 들어온 요청도 통과시킨다.
  // 여기서 막으면 리라이트한 요청이 다시 단축 주소 핸들러로 떨어진다.
  if (pathname.startsWith('/baeumteo/')) {
    return NextResponse.next();
  }

  // 3. 외솔 배움터: 주소는 /배움터 로 보여주고 내부 경로로 넘긴다
  //    (Next 는 한글 라우트를 원문으로 등록해 인코딩된 요청과 매칭되지 않는다.
  //     하위 경로도 마찬가지라 한글 이름을 영문 폴더에 하나씩 맞춰 둔다.)
  if (decodedPath === '/배움터' || decodedPath.startsWith('/배움터/')) {
    const rest = decodedPath.slice('/배움터'.length).replace(/\/$/, '');
    if (rest === '') return NextResponse.rewrite(new URL('/baeumteo', req.url));

    const inner = BAEUMTEO_ROUTES[rest];
    if (inner) return NextResponse.rewrite(new URL(`/baeumteo/${inner}`, req.url));

    // 없는 배움터 하위 주소는 단축 주소로 넘기지 않고 배움터에서 끝낸다
    return NextResponse.rewrite(new URL('/baeumteo/none', req.url));
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
     * - d (외솔 드롭 콘텐츠 경로, /d/code)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static (public/static 폴더)
     * - 파일 확장자(.)가 포함된 모든 경로 (e.g., logo.png, favicon.ico)
     */
    '/((?!api/|r/|d/|_next/|static/|.*\\..*).*)'
  ],
};