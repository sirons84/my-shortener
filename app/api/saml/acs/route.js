// 파일 경로: app/api/saml/acs/route.js (새 파일)
// AIEP(IdP)가 SAML 응답을 POST할 경로입니다.

import { NextResponse } from "next/server";
import { sp, idp } from "@/lib/saml";
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const body = await req.formData();
    const samlResponse = body.get("SAMLResponse");

    if (!samlResponse) {
      throw new Error("SAMLResponse가 없습니다.");
    }

    // SAML 응답 검증
    const { extract } = await sp.parseLoginResponse(idp, "post", {
      body: { SAMLResponse: samlResponse },
    });

    const attributes = extract.attributes;
    
    // (!! 중요 !!) AIEP가 SAML로 보내주는 속성 이름을 확인해야 합니다.
    // 가이드(PDF 43p) 예시에는 'email', 'role' 등이 있습니다.
    // 'urn:oid:1.2.840.113549.1.9.1.1'이 이메일일 수 있습니다.
    // 우선 'email' 또는 'NameID'를 사용하도록 시도합니다.
    const email = attributes.email || attributes['urn:oid:1.2.840.113549.1.9.1.1'] || extract.nameID;
    const name = attributes.name || attributes.firstName || email.split('@')[0];

    if (!email) {
      throw new Error("SAML 응답에서 이메일을 찾을 수 없습니다.");
    }
    
    // (!! 핵심 !!)
    // SAML 인증 성공!
    // 이제 NextAuth의 CredentialsProvider를 내부적으로 호출하여
    // '외솔.한국' 앱의 세션을 생성합니다.
    
    // NextAuth의 내부 로그인 API 경로
    const nextAuthUrl = new URL("/api/auth/callback/credentials", req.url);
    
    // CSRF 토큰 쿠키 가져오기 (NextAuth가 자동으로 설정한 쿠키)
    const csrfToken = cookies().get('next-auth.csrf-token')?.value.split('|')[0];
    
    if (!csrfToken) {
      throw new Error("NextAuth CSRF 토큰을 찾을 수 없습니다.");
    }

    // NextAuth에 세션 생성을 위임
    const nextAuthRes = await fetch(nextAuthUrl.href, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // NextAuth v4는 CSRF 토큰 쿠키를 자동으로 읽습니다.
        // v5 (Next.js 14+)는 다를 수 있으나, 우선 쿠키 기반으로 시도합니다.
        "Cookie": req.headers.get('cookie') || "",
      },
      body: new URLSearchParams({
        email: email,
        name: name,
        csrfToken: csrfToken, // CSRF 토큰 전달
        callbackUrl: "/",
        json: "true",
      }),
    });

    if (!nextAuthRes.ok) {
       throw new Error("NextAuth 세션 생성 실패");
    }

    // NextAuth가 세션 쿠키를 설정하도록 응답을 구성
    const response = NextResponse.redirect(new URL("/", req.url));
    
    // AIEP(IdP)의 응답에서 받은 쿠키를 브라우저에 설정 (세션 유지)
    nextAuthRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append('Set-Cookie', value);
      }
    });

    return response;

  } catch (error) {
    console.error("SAML ACS 오류:", error);
    return NextResponse.redirect(new URL("/?error=SAMLResponseInvalid", req.url));
  }
}