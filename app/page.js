// 파일 경로: app/page.js
// (이 코드로 파일 전체를 덮어쓰세요)

"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";
import { toUnicode, toASCII } from "punycode";
import { FaBrain, FaPencilAlt, FaUsers } from "react-icons/fa";

// QR 코드 로고 설정
const qrImageSettings = {
  src: "/logo.png",
  height: 40,
  width: 40,
  excavate: true,
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiry, setExpiry] = useState("7d");
  const [shortCode, setShortCode] = useState(""); 
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user && expiry === "forever") {
      alert("무제한은 로그인 후에만 가능합니다.");
      return;
    }

    const token = (await supabase.auth.getSession()).data.session?.access_token;

    const res = await fetch("/api/shorten", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ url, customCode, expiry }),
    });

    const data = await res.json();
    if (data.error) {
      if (data.error.includes("duplicate key")) {
        alert("이미 사용 중인 주소입니다. 다른 코드를 입력하세요.");
      } else {
        alert(data.error);
      }
    } else {
      setShortCode(data.code);
    }
  }

  let functionalShortUrl = ""; // QR/링크용 (Punycode)
  let displayShortUrl = "";    // 표시/복사용 (한글)

  if (shortCode) {
    try {
      const originString = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const originUrl = new URL(originString);
      
      // !! FIX: 'xn--'로 시작하는 코드(한글)만 toUnicode로 변환 (RangeError 방지)
      let unicodePath = shortCode;
      if (shortCode.startsWith("xn--")) {
        unicodePath = toUnicode(shortCode);
      }
      
      // !! FIX: 'xn--'로 시작하는 도메인(한글)만 toUnicode로 변환
      let unicodeDomain = originUrl.hostname;
      if (originUrl.hostname.startsWith("xn--")) {
         unicodeDomain = toUnicode(originUrl.hostname);
      }
      
      displayShortUrl = `${originUrl.protocol}//${unicodeDomain}/${unicodePath}`;

      // QR/링크용 (100% Punycode)
      const punycodeDomain = toASCII(originUrl.hostname);
      functionalShortUrl = `${originUrl.protocol}//${punycodeDomain}/${shortCode}`;

    } catch (e) {
      console.error("URL generation error:", e);
      functionalShortUrl = `${window.location.origin}/${shortCode}`;
      displayShortUrl = functionalShortUrl;
    }
  }

  async function copyToClipboard() {
    if (!displayShortUrl) return;
    await navigator.clipboard.writeText(displayShortUrl);
    alert("단축 URL이 클립보드에 복사되었습니다!");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column", 
        justifyContent: "space-between", 
        alignItems: "center",
        minHeight: "100vh", 
        background: "#f5f6fa",
        fontFamily: "Arial, sans-serif",
        padding: "4rem 0 1rem 0", 
      }}
    >
      <main style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3rem" 
      }}>

        {/* 1. URL 단축기 섹션 */}
        <div
          className="info-card" 
          style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            textAlign: "center",
            width: 440,
            maxWidth: "95%"
          }}
        >
          <h1 style={{ marginBottom: 12 }}> 외솔.한국</h1>
          <h2 style={{ marginBottom: 12 }}> 울산교육청 URL 줄이기 서비스</h2>

          {/* 로그인 상태 표시 */}
          <div style={{ marginBottom: 20 }}>
            {user ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ marginBottom: 16, fontWeight: "bold", fontSize: "1rem" }}>
                  안녕하세요 👋 <br />
                  <span style={{ color: "#0984e3" }}>{user.email}</span>
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      location.reload();
                    }}
                    style={{
                      padding: "10px 18px",
                      background: "#636e72",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      transition: "background 0.2s ease",
                    }}
                    onMouseOver={(e) => (e.target.style.background = "#2d3436")}
                    onMouseOut={(e) => (e.target.style.background = "#636e72")}
                  >
                    🚪 로그아웃
                  </button>
                  <a
                    href="/dashboard"
                    style={{
                      padding: "10px 18px",
                      background: "#0984e3",
                      color: "#fff",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      display: "inline-block",
                      transition: "background 0.2s ease",
                    }}
                    onMouseOver={(e) => (e.target.style.background = "#0652DD")}
                    onMouseOut={(e) => (e.target.style.background = "#0984e3")}
                  >
                    📊 대시보드
                  </a>
                </div>
              </div>
            ) : (
              <a href="/login">로그인</a>
            )}
          </div>

          {/* 입력 폼 */}
          <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
            <input
              type="url"
              placeholder="긴 URL을 입력하세요"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: 8,
                border: "1px solid #dcdde1",
                borderRadius: 8,
              }}
            />
            <div style={{
              display: "flex",
              width: "100%",
              marginBottom: 8,
            }}>
              <span style={{
                padding: "10px",
                border: "1px solid #dcdde1",
                borderRight: "none",
                borderRadius: "8px 0 0 8px",
                background: "#e9ecef",
                color: "#495057",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                fontSize: "0.9rem",
                fontWeight: "bold",
              }}>
                외솔.한국/
              </span>
              <input
                type="text"
                placeholder="단축주소 (한글, 영어, 숫자)"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #dcdde1",
                  borderRadius: "0 8px 8px 0",
                  borderLeft: "none",
                  flex: 1,
                }}
              />
            </div>
            
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: 8,
                border: "1px solid #dcdde1",
                borderRadius: 8,
              }}
            >
              <option value="7d">1주</option>
              <option value="30d">1달</option>
              {user && (
                <>
                  <option value="180d">6달</option>
                  <option value="365d">1년</option>
                  <option value="forever">무제한</option>
                </>
              )}
            </select>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "#0984e3",
                color: "#fff",
                border: "none",
                borderRadius: 8,
              }}
            >
              URL 줄이기
            </button>
          </form>

          {/* 결과 표시 */}
          {shortCode && ( 
            <div
              style={{
                background: "#f1f2f6",
                padding: "1rem",
                borderRadius: 8,
              }}
            >
              <p style={{ margin: 0, fontWeight: "bold" }}>Shortened URL</p>
              <a
                href={functionalShortUrl} 
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#0984e3",
                  textDecoration: "none",
                  fontWeight: "bold",
                }}
              >
                {displayShortUrl}
              </a>
              <div style={{ marginTop: 12 }}>
                <QRCodeCanvas 
                  value={functionalShortUrl}
                  size={256} 
                  level="H"
                  imageSettings={qrImageSettings}
                />
              </div>
              <button
                onClick={copyToClipboard}
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "#00b894",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                }}
              >
                📋 단축 URL 복사하기
              </button>
            </div>
          )}
        </div>

        {/* 2. 새 섹션 (우리아이 플랫폼 소개) */}
        <section style={{ 
          width: "100%", 
          maxWidth: "1000px", 
          textAlign: "center",
          padding: "0 1rem",
          marginTop: "2rem"
        }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "bold", marginBottom: "0.5rem", color: "#222" }}>
            외솔.한국, 그 이상의 가치
          </h2>
          <p style={{ fontSize: "1.1rem", color: "#555", marginBottom: "2.5rem" }}>
            {/* ESLint 오류 수정 */}
            울산교육청의 똑똑한 AI 친구, &apos;우리아이&apos;를 만나보세요!
          </p>

          <div style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}>
            {/* 카드 1 */}
            <div className="info-card" style={{
              background: "#fff",
              padding: "2rem",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              width: "310px",
              minWidth: "300px",
              textAlign: "left"
            }}>
              <div className="card-icon" style={{ 
                fontSize: "2rem", 
                color: "#0984e3",
                backgroundColor: "rgba(9, 132, 227, 0.1)",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem"
              }}>
                <FaBrain />
              </div>
              <h3 style={{ fontWeight: "bold", fontSize: "1.2rem", marginBottom: "0.5rem", color: "#333" }}>스마트한 학습 파트너</h3>
              <p style={{ color: "#444", lineHeight: 1.6 }}>광고 없는 정확한 학습 답변! AI 튜터와 궁금증을 해결하고, 101종의 미래형 수업 콘텐츠를 체험해 보세요.</p>
            </div>

            {/* 카드 2 */}
            <div className="info-card" style={{
              background: "#fff",
              padding: "2rem",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              width: "310px",
              minWidth: "300px",
              textAlign: "left"
            }}>
              <div className="card-icon" style={{
                fontSize: "2rem",
                color: "#e17055", 
                backgroundColor: "rgba(225, 112, 85, 0.1)",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem"
              }}>
                <FaPencilAlt />
              </div>
              <h3 style={{ fontWeight: "bold", fontSize: "1.2rem", marginBottom: "0.5rem", color: "#333" }}>교사를 위한 강력한 도구</h3>
              <p style={{ color: "#444", lineHeight: 1.6 }}>
                {/* ESLint 오류 수정 */}
                수업 자료 제작이 고민이라면? 울산 교육 가족에게 무료 제공되는 &apos;미리캔버스 Pro&apos;로 손쉽게 디자인을 완성하세요.
              </p>
            </div>

            {/* 카드 3 */}
            <div className="info-card" style={{
              background: "#fff",
              padding: "2rem",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              width: "310px",
              minWidth: "300px",
              textAlign: "left"
            }}>
              <div className="card-icon" style={{
                fontSize: "2rem",
                color: "#00b894",
                backgroundColor: "rgba(0, 184, 148, 0.1)",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem"
              }}>
                <FaUsers />
              </div>
              <h3 style={{ fontWeight: "bold", fontSize: "1.2rem", marginBottom: "0.5rem", color: "#333" }}>모두를 위한 열린 플랫폼</h3>
              <p style={{ color: "#444", lineHeight: 1.6 }}>학생, 교사, 학부모 누구나! 복잡한 가입 절차 없이 24시간 언제나 자유롭게 AI와 함께 배우고 성장할 수 있습니다.</p>
            </div>
          </div>

          {/* 바로가기 버튼 */}
          <a
            href="https://wooriai.use.go.kr/"
            target="_blank"
            rel="noopener noreferrer"
            className="wooriai-button"
            style={{
              display: "inline-block",
              marginTop: "2.5rem",
              padding: "1rem 2rem",
              background: "#F9C80E",
              color: "#3D3A30",
              fontWeight: "bold",
              fontSize: "1.1rem",
              borderRadius: "50px", 
              textDecoration: "none",
              boxShadow: "0 4px 15px rgba(249, 200, 14, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            우리아이(AI)플랫폼 바로가기
          </a>
        </section>

      </main>

      {/* 3. 푸터 */}
      <footer style={{
        width: "100%",
        textAlign: "center",
        padding: "2rem 1rem 1rem 1rem",
        marginTop: "3rem",
        color: "#888",
        fontSize: "0.85rem",
        lineHeight: 1.6,
      }}>
        <div style={{ marginBottom: "1rem" }}>
          <a href="/privacy" className="footer-link">개인정보처리방침</a>
          <span style={{ margin: "0 10px" }}>|</span>
          <a href="/terms" className="footer-link">이용약관</a>
          <span style={{ margin: "0 10px" }}>|</span>
          <a href="mailto:sirons@usedu.ai.kr" className="footer-link">문의하기</a>
        </div>
        © 2026 울산교육청 (개발자: 정윤호, 이충민, 석희철, 이강현, 박창현, 김지현, 황정훈)
        <br />
        디자인 (요즘사람주식회사, 퍼스널컬러다이브). All rights reserved.
      </footer>

      {/* 4. 아이콘/버튼 호버 이펙트 및 푸터 링크 스타일 */}
      <style jsx>{`
        .card-icon {
          transition: transform 0.2s ease-in-out;
        }
        .card-icon:hover {
          transform: scale(1.15);
        }
        .info-card {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .info-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }
        .wooriai-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(249, 200, 14, 0.5);
        }
        .footer-link {
          color: #555;
          text-decoration: none;
        }
        .footer-link:hover {
          text-decoration: underline;
        }
      `}</style>

    </div>
  );
}