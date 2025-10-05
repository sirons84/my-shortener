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
    icon: "/favicon.ico", // public 폴더 기준
    },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* fallback 으로도 추가 */}
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
