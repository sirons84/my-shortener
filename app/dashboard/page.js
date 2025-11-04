// 파일 경로: app/dashboard/page.js
// (기존 파일 덮어쓰기)

"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
// CHANGED: FaPencilAlt 아이콘 추가
import { FaTrashAlt, FaQrcode, FaExternalLinkAlt, FaPencilAlt } from "react-icons/fa";
import Link from "next/link";

// + CHANGED: QR 코드에 로고를 넣기 위한 설정 (2번 기능)
const qrImageSettings = {
  src: "/favicon.ico", // public 폴더의 favicon.ico 사용
  height: 48,
  width: 48,
  excavate: true, // 아이콘 뒤쪽의 QR을 비움
};

export default function DashboardPage() {
  const [urls, setUrls] = useState([]);
  const [user, setUser] = useState(null);
  // + CHANGED: 토큰을 state로 관리
  const [token, setToken] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setUser(data.user);

      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
      // + CHANGED: 토큰 state에 저장
      setToken(sessionToken);

      const res = await fetch("/api/my-urls", {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      const d = await res.json();
      setUrls(d.urls || []);
    }
    load();
  }, []);

  // + CHANGED: 삭제 함수 (인증 토큰 추가)
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
  
  // + NEW: 수정 함수 (1번 기능)
  async function handleEdit(code, currentUrl) {
    const newUrl = prompt("새로운 원본 URL을 입력하세요:", currentUrl);

    if (newUrl && newUrl !== currentUrl && token) {
      const res = await fetch(`/api/url/${code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newUrl })
      });

      if (res.ok) {
        alert("URL이 성공적으로 변경되었습니다.");
        // UI 즉시 반영
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
              {/* + CHANGED: '관리' 컬럼으로 변경 */}
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {urls.map((u) => (
              <tr key={u.code}>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                  {u.code}
                </td>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                  <a
                    href={`/${u.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0984e3", textDecoration: "none", wordBreak: "break-all" }} // + CHANGED: 긴 URL 줄바꿈
                  >
                    {u.url} <FaExternalLinkAlt style={{ marginLeft: 6, color: "#636e72" }} />
                  </a>
                </td>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                  {u.expires_at ? new Date(u.expires_at).toLocaleString() : "무제한"}
                </td>
                <td style={{
                  padding: 8, border: "1px solid #dfe6e9", textAlign: "center"
                }}>
                  {/* + CHANGED: QR 코드에 로고 설정 (2번 기능) */}
                  <QRCodeCanvas 
                    value={`${window.location.origin}/${u.code}`} 
                    size={64} 
                    imageSettings={qrImageSettings} 
                  />
                </td>
                <td style={{
                  padding: 8, border: "1px solid #dfe6e9", textAlign: "center"
                }}>
                  {/* + NEW: 수정 버튼 (1번 기능) */}
                  <button
                    onClick={() => handleEdit(u.code, u.url)}
                    style={{
                      background: "#0984e3", color: "#fff", border: "none",
                      padding: "6px 12px", borderRadius: 6,
                      display: "flex", alignItems: "center", gap: "6px",
                      justifyContent: "center", cursor: "pointer", marginBottom: "4px"
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
                      justifyContent: "center", cursor: "pointer"
                    }}
                  >
                    <FaTrashAlt /> 삭제
                  </button>
                </td>
              </tr>
            ))}
            {urls.length === 0 && (
              <tr>
                {/* + CHANGED: ColSpan 5로 변경 */}
                <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                  등록된 URL이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}