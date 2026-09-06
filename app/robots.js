// 파일 경로: app/robots.js
// https://외솔.한국/robots.txt 로 자동 제공됩니다.
// (Cloudflare 관리형 robots.txt를 쓰는 경우 이 내용 뒤에 Cloudflare 섹션이 덧붙습니다.)

const BASE_URL = "https://xn--im4bl3g.xn--3e0b707e";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
