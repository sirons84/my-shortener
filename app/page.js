// 파일 경로: app/page.js
// (기존 파일 덮어쓰기)

"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";
import { toUnicode } from "punycode";

// + NEW: QR 코드에 로고를 넣기 위한 설정 (2번 기능)
const qrImageSettings = {
  src: "/favicon.ico", // public 폴더의 favicon.ico 사용
  height: 48, // 로고 높이
  width: 48, // 로고 너비
  excavate: true, // 로고 뒤쪽의 QR 코드 영역을 비워서 선명하게
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiry, setExpiry] = useState("7d"); // 기본은 1주
  const [shortUrl, setShortUrl] = useState("");
  const [user, setUser] = useState(null);

  // 로그인된 사용자 가져오기
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
  }, []);

  // URL 단축 요청
  async function handleSubmit(e) {
    e.preventDefault();

    // 비회원이 무제한 선택하면 막기
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
      // 에러 메시지 커스터마이즈
      if (data.error.includes("duplicate key")) {
        alert("이미 사용 중인 주소입니다. 다른 코드를 입력하세요.");
      } else {
        alert(data.error);
      }
    } else {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      setShortUrl(`${siteUrl}/${data.code}`);
    }
  }

  // URL 복사하기
  async function copyToClipboard() {
    if (!shortUrl) return;
    const unicodeUrl = shortUrl.replace(
      /^https?:\/\/([^/]+)/,
      (m, domain) => `https://${toUnicode(domain)}`
    );
    await navigator.clipboard.writeText(unicodeUrl);
    alert("단축 URL이 클립보드에 복사되었습니다!");
  }

  // punycode → 한글 도메인으로 변환된 URL
  const unicodeShortUrl = shortUrl
    ? shortUrl.replace(
        /^https?:\/\/([^/]+)/,
        (m, domain) => `https://${toUnicode(domain)}`
      )
    : "";

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
          <input
            type="text"
            // + CHANGED: 한글 입력도 가능함을 안내
            placeholder="커스텀 코드 (선택, 한글 가능)"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: 8,
              border: "1px solid #dcdde1",
              borderRadius: 8,
            }}
          />
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
        {unicodeShortUrl && (
          <div
            style={{
              background: "#f1f2f6",
              padding: "1rem",
              borderRadius: 8,
            }}
          >
            <p style={{ margin: 0, fontWeight: "bold" }}>Shortened URL</p>
            <a
              href={unicodeShortUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#0984e3",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              {unicodeShortUrl}
            </a>
            <div style={{ marginTop: 12 }}>
              {/* // + CHANGED: QR 코드에 로고 설정 (2번 기능) */}
              <QRCodeCanvas 
                value={unicodeShortUrl} 
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