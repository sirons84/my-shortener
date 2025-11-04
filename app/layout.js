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
    // !! CHANGED: 파비콘 경로를 logo.png로 변경
    icon: "/logo.png", // public 폴더 기준
    },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* !! CHANGED: fallback 파비콘 경로도 logo.png로 변경 */}
        <link rel="icon" href="/logo.png" />
      </head>
      {/* 참고: 폰트를 적용하시려면 <body>를 <body className={`${geistSans.variable} ${geistMono.variable}`}>로 
        변경하셔야 합니다. 지금은 요청하신 파비콘만 수정했습니다.
      */}
      <body>{children}</body>
    </html>
  );
}