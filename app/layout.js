// 파일 경로: app/layout.js
// (이 코드로 파일 전체를 덮어쓰세요)

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "외솔.한국 - 울산교육청 URL 줄이기",
  description: "울산교육청 URL 단축 서비스",
    icons: {
    // !! CHANGED: 파비콘 경로에 캐시 무시용 쿼리 추가
    icon: "/logo.png?v=2", 
    },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* !! CHANGED: fallback 파비콘 경로에도 쿼리 추가 */}
        <link rel="icon" href="/logo.png?v=2" />
      </head>
      <body>{children}</body>
    </html>
  );
}