// 파일 경로: app/layout.js
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer"; // 1. Footer 임포트

export const metadata = {
  metadataBase: new URL("https://xn--im4bl3g.xn--3e0b707e"),
  title: "외솔.한국",
  description: "간편한 URL 단축 서비스",
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
    title: "외솔.한국",
    description: "간편한 URL 단축 서비스",
    images: ["/images/meta.png"],
    type: "website",
    url: "https://xn--im4bl3g.xn--3e0b707e/",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/meta.png"],
  },
  verification: {
    other: {
      "google-site-verification": "", // 필요시 추가
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