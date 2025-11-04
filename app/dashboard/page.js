// 파일 경로: app/dashboard/page.js
// (이 코드로 파일 전체를 덮어쓰세요)

"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { FaTrashAlt, FaQrcode, FaExternalLinkAlt, FaPencilAlt } from "react-icons/fa";
import Link from "next/link";
// !! CHANGED: toASCII 추가
import { toUnicode, toASCII } from "punycode";

// QR 코드 로고 설정 (대시보드 전용)
const qrImageSettings = {
  src: "/logo.png", // public/logo.png 사용
  height: 16, // 대시보드용 작은 아이콘
  width: 16,
  excavate: true,
};

export default function DashboardPage() {
  const [urls, setUrls] = useState([]);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // !! NEW: 100% Punycode로 변환된 origin을 저장할 state
  const [punycodeOrigin, setPunycodeOrigin] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setUser(data.user);

      // !! NEW: origin을 가져와서 100% Punycode 버전으로 변환 후 state에 저장
      // (Galaxy Tab 오류 해결용)
      try {
        const urlObj = new URL(window.location.origin);
        // (예: "외솔.한국" -> "xn--im4bl3g.xn--3e0b707e")
        urlObj.hostname = toASCII(urlObj.hostname);
        setPunycodeOrigin(urlObj.origin);
      } catch (e) {
        setPunycodeOrigin(window.location.origin); // 실패 시 그대로 사용
      }

      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
      setToken(sessionToken);

      const res = await fetch("/api/my-urls", {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      const d = await res.json();
      setUrls(d.urls || []);
    }
    load();
  }, []);

  async function deleteUrl(code) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    
    if (!token) {
      alert("인증 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    await fetch(`/api/url/${code}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setUrls(urls.filter((u) => u.code !== code));
  }
  
  async function handleEdit(code, currentUrl) {
    const newUrl = prompt("새로운 원본 URL을 입력하세요:", currentUrl);
    
    // !! FIX: 사용자에게 보여줄 한글 코드 (오류 방지)
    let displayCode = code;
    try {
      // 'xn--'로 시작할 때만 한글로 변환
      if (code && code.startsWith('xn--')) {
        displayCode = toUnicode(code);
      }
    } catch (e) {} // 에러 시 Punycode 원본(code) 사용

    if (newUrl && newUrl !== currentUrl && token) {
      // API 호출은 Punycode(code)로
      const res = await fetch(`/api/url/${code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newUrl })
      });

      if (res.ok) {
        alert(`'${displayCode}'의 URL이 성공적으로 변경되었습니다.`);
        setUrls(urls.map(u => u.code === code ? { ...u, url: newUrl } : u));
      } else {
        const data = await res.json();
        alert(`오류: ${data.error}`);
      }
    }
  }

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", background: "#f5f6fa", fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        background: "#fff", padding: "2rem", borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "95%", maxWidth: 900
      }}>
        <h1 style={{ marginBottom: "1rem" }}>📊 내 URL 대시보드</h1>
        <Link
            href="/"
            style={{
              padding: "8px 14px",
              background: "#636e72",
              color: "#fff",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "0.9rem",
              transition: "background 0.2s ease"
            }}
            onMouseOver={(e) => (e.target.style.background = "#2d3436")}
            onMouseOut={(e) => (e.target.style.background = "#636e72")}
          >
            🏠 메인으로
          </Link>

        {user && <p>안녕하세요, {user.email}</p>}
        
        {/* !! FIX: punycodeOrigin이 로드된 후에 테이블을 렌더링 (오류 방지) */}
        {punycodeOrigin && ( 
        <table style={{
          width: "100%", borderCollapse: "collapse", marginTop: 16
        }}>
          <thead>
            <tr style={{ background: "#f1f2f6" }}>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>코드</th>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>원본 URL</th>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>만료일</th>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                <FaQrcode style={{ marginRight: 6 }} /> QR
              </th>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {urls.map((u) => {
              // !! FIX:
              // functionalShortUrl: QR/링크용 (예: https://xn--.../xn--...)
              const functionalShortUrl = `${punycodeOrigin}/${u.code}`;
              
              // displayCode: 표시용 (예: 테스트 / ming2)
              let displayCode = u.code;
              try {
                // 'xn--'로 시작할 때만 한글로 변환 (RangeError 방지)
                if (u.code && u.code.startsWith('xn--')) {
                  displayCode = toUnicode(u.code);
                }
              } catch (e) {
                console.error("Punycode conversion error in map:", e);
              }

              return (
              <tr key={u.code}>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                  {displayCode} {/* !! FIX: 한글 또는 영문 코드로 표시 */}
                </td>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                  <a
                    href={functionalShortUrl} // !! FIX: 링크는 100% Punycode
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0984e3", textDecoration: "none", wordBreak: "break-all" }}
                  >
                    {u.url} 
                    <FaExternalLinkAlt style={{ marginLeft: 6, color: "#636e72" }} />
                  </a>
                </td>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                  {u.expires_at ? new Date(u.expires_at).toLocaleString() : "무제한"}
                </td>
                <td style={{
                  padding: 8, border: "1px solid #dfe6e9", textAlign: "center"
                }}>
                  <QRCodeCanvas 
                    value={functionalShortUrl} // !! FIX: QR은 100% Punycode
                    size={64} 
                    imageSettings={qrImageSettings}
                  />
                </td>
                <td style={{
                  padding: 8, border: "1px solid #dfe6e9", textAlign: "center"
                }}>
                  <button
                    onClick={() => handleEdit(u.code, u.url)}
                    style={{
                      background: "#0984e3", color: "#fff", border: "none",
                      padding: "6px 12px", borderRadius: 6,
                      display: "flex", alignItems: "center", gap: "6px",
                      justifyContent: "center", cursor: "pointer", marginBottom: "4px", width: "80px"
                    }}
                  >
                    <FaPencilAlt /> 수정
                  </button>
                  <button
                    onClick={() => deleteUrl(u.code)}
                    style={{
                      background: "#d63031", color: "#fff", border: "none",
                      padding: "6px 12px", borderRadius: 6,
                      display: "flex", alignItems: "center", gap: "6px",
                      justifyContent: "center", cursor: "pointer", width: "80px"
                    }}
                  >
                    <FaTrashAlt /> 삭제
                  </button>
                </td>
              </tr>
            )})}
            {urls.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                  등록된 URL이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )} 
      </div>
    </div>
  );
}