// 파일 경로: app/layout.js
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer"; // 1. Footer 임포트

export const metadata = {
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
    image: "/images/meta.png",
    type: "website",
    url: "https://xn--im4bl3g.xn--3e0b707e/",
  },
  twitter: {
    card: "summary_large_image",
    image: "/images/meta.png",
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
        {/* (head 내용은 그대로) */}
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