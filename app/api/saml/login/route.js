// 파일 경로: app/api/saml/login/route.js (새 파일)
// '우리아이 로그인' 버튼이 이 경로로 링크됩니다.
import { NextResponse } from "next/server";
import { sp, idp } from "@/lib/saml";

export async function GET() {
  try {
    const { id, context } = sp.createLoginRequest(idp, "redirect");
    
    // 사용자를 AIEP의 로그인 페이지로 리디렉션
    return NextResponse.redirect(context);

  } catch (error) {
    console.error("SAML 로그인 요청 생성 실패:", error);
    return NextResponse.redirect(new URL("/?error=SAMLFailed", req.url));
  }
}