// 파일 경로: app/layout.js
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer"; // 1. Footer 임포트

export const metadata = {
  // ... (metadata는 그대로) ...
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