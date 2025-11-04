// 파일 경로: app/page.js
// (이 코드로 파일 전체를 덮어쓰세요)

"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";
// !! CHANGED: toASCII 추가
import { toUnicode, toASCII } from "punycode";

// QR 코드 로고 설정
const qrImageSettings = {
  src: "/logo.png", // public/logo.png 사용
  height: 48,
  width: 48,
  excavate: true,
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiry, setExpiry] = useState("7d");
  // !! CHANGED: state는 Punycode 경로(code)만 저장하도록 변경
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
      // !! CHANGED: state에 Punycode 경로(code)만 저장
      setShortCode(data.code); // 예: "xn--9t4b11yi5a"
    }
  }

  // !! FIX:
  // QR/링크에 사용할 100% Punycode URL과 
  // 화면 표시/복사용 한글 URL을 분리 생성
  let functionalShortUrl = ""; // QR/링크용 (예: https://xn--.../xn--...)
  let displayShortUrl = "";    // 표시/복사용 (예: https://외솔.한국/테스트)

  if (shortCode) {
    try {
      // 1. 현재 도메인(https://외솔.한국)을 가져옴
      // Vercel 환경 변수(Punycode) 또는 브라우저의 한글 도메인
      const originString = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const originUrl = new URL(originString);

      // 2. 표시용/복사용 한글 URL 생성 (도메인, 경로 모두 한글)
      const unicodeDomain = toUnicode(originUrl.hostname);
      const unicodePath = toUnicode(shortCode);
      displayShortUrl = `${originUrl.protocol}//${unicodeDomain}/${unicodePath}`;

      // 3. QR/링크용 100% Punycode URL 생성 (도메인, 경로 모두 Punycode)
      const punycodeDomain = toASCII(originUrl.hostname); // (예: xn--im4bl3g.xn--3e0b707e)
      functionalShortUrl = `${originUrl.protocol}//${punycodeDomain}/${shortCode}`;

    } catch (e) {
      console.error("URL generation error:", e);
      // 오류 시 안전하게 Punycode 원본 표시
      functionalShortUrl = `${window.location.origin}/${shortCode}`;
      displayShortUrl = functionalShortUrl;
    }
  }

  async function copyToClipboard() {
    if (!displayShortUrl) return;
    // !! FIX: 복사할 URL은 한글로 변환된 displayShortUrl
    await navigator.clipboard.writeText(displayShortUrl);
    alert("단축 URL이 클립보드에 복사되었습니다!");
  }


  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f5f6fa",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2rem",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          textAlign: "center",
          width: 440,
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

          {/* !! CHANGED: 커스텀 코드 입력 UI (flex wrapper) */}
          <div style={{
            display: "flex",
            width: "100%",
            marginBottom: 8,
          }}>
            <span style={{
              padding: "10px",
              border: "1px solid #dcdde1",
              borderRight: "none",
              borderRadius: "8px 0 0 8px", // 왼쪽만 둥글게
              background: "#e9ecef", // 회색 배경
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
              // !! CHANGED: placeholder 수정 (한글 가능 명시)
              placeholder="단축주소 (한글, 영어, 숫자)"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              style={{
                width: "100%", // 남은 너비 모두 사용
                padding: "10px",
                border: "1px solid #dcdde1",
                borderRadius: "0 8px 8px 0", // 오른쪽만 둥글게
                borderLeft: "none", // 왼쪽 테두리 제거
                flex: 1, // input이 늘어나도록
              }}
            />
          </div>
          {/* !! END CHANGED SECTION */}
          
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
            {/* 공통 옵션 */}
            <option value="7d">1주</option>
            <option value="30d">1달</option>

            {/* 로그인 한 경우만 더 많은 옵션 표시 */}
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
        {shortCode && ( // shortCode(Punycode)가 생성되었을 때만 표시
          <div
            style={{
              background: "#f1f2f6",
              padding: "1rem",
              borderRadius: 8,
            }}
          >
            <p style={{ margin: 0, fontWeight: "bold" }}>Shortened URL</p>
            <a
              href={functionalShortUrl} // !! FIX: 링크는 100% Punycode URL
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#0984e3",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              {displayShortUrl} {/* !! FIX: 표시는 한글 URL */}
            </a>
            <div style={{ marginTop: 12 }}>
              <QRCodeCanvas 
                value={functionalShortUrl} // !! FIX: QR도 100% Punycode URL
                size={256} 
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
    </div>
  );
}