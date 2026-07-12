// 파일 경로: app/layout.js
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer"; // 1. Footer 임포트
import AnalyticsTracker from "../components/AnalyticsTracker"; // 자체 방문 통계 수집

const SITE_DESCRIPTION =
  "울산교육청과 함께하는 무료 URL 단축 서비스. 긴 URL을 짧고 기억하기 쉬운 한글 주소로 바꿔주며, QR 코드 생성과 클릭 통계를 지원합니다.";

export const metadata = {
  metadataBase: new URL("https://xn--im4bl3g.xn--3e0b707e"),
  title: {
    default: "외솔.한국 - 한글 URL 단축 서비스",
    template: "%s | 외솔.한국",
  },
  description: SITE_DESCRIPTION,
  keywords: ["URL 단축", "한글 주소", "링크 줄이기", "QR 코드", "외솔", "단축 URL"],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/images/favicon/favicon.ico" },
      { url: "/images/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/images/favicon/apple-touch-icon.png",
    other: [
      {
        rel: "manifest",
        url: "/images/favicon/site.webmanifest",
      },
    ],
  },
  openGraph: {
    title: "외솔.한국 - 한글 URL 단축 서비스",
    description: SITE_DESCRIPTION,
    images: ["/images/meta.png"],
    type: "website",
    url: "https://xn--im4bl3g.xn--3e0b707e/",
    siteName: "외솔.한국",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "외솔.한국 - 한글 URL 단축 서비스",
    description: SITE_DESCRIPTION,
    images: ["/images/meta.png"],
  },
  // 검색엔진 소유 확인 코드: 각 콘솔에서 발급받은 값을 붙여넣으세요.
  // - Google: https://search.google.com/search-console → 속성 추가 → HTML 태그
  // - Naver: https://searchadvisor.naver.com → 웹마스터 도구 → 사이트 등록 → HTML 태그
  verification: {
    other: {
      // "google-site-verification": "발급받은 코드",
      // "naver-site-verification": "발급받은 코드",
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트: 초기 HTML에서 바로 발견되도록 <link>로 로드 + preconnect로 연결 예열.
            dynamic-subset은 페이지에 실제로 쓰인 글자 조각만 내려받아 효율적. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
      </head>
      <body>
        <AnalyticsTracker />
        <Header />
        
        {/* 2. <main> 태그로 감싸기 (시맨틱 HTML) */}
        <main>
          {children}
        </main> 
        
        <Footer /> {/* 3. Footer 배치 */}
      </body>
    </html>
  );
}