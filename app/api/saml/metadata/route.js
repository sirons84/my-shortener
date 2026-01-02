// 파일 경로: app/api/saml/metadata/route.js (새 파일)
// (!! 중요 !!) 이 URL을 AIEP 연계 신청서에 제출해야 합니다.
// 예: https://xn--im4bl3g.xn--3e0b707e/api/saml/metadata

import { NextResponse } from "next/server";
import { sp } from "@/lib/saml"; // SAML SP 설정 (다음 파일에서 생성)

export async function GET() {
  const metadata = sp.getMetadata();
  return new NextResponse(metadata, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}