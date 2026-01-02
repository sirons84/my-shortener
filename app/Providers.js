// 파일 경로: app/Providers.js (새 파일)
"use client";

import { SessionProvider } from "next-auth/react";

// NextAuth의 세션 컨텍스트를 제공하는 클라이언트 컴포넌트
export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}