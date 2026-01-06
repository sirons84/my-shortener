"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { FaTrashAlt, FaQrcode, FaExternalLinkAlt, FaPencilAlt } from "react-icons/fa";
import Link from "next/link";
import { toUnicode, toASCII } from "punycode";

// QR 코드 로고 설정
const qrImageSettings = {
  src: "/logo.png",
  height: 16,
  width: 16,
  excavate: true,
};

export default function DashboardPage() {
  const [urls, setUrls] = useState([]);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [punycodeOrigin, setPunycodeOrigin] = useState("");

  useEffect(() => {
    async function load() {
      // 1. 유저 확인
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setUser(data.user);

      // 2. 현재 도메인 파악 (한글 도메인 처리)
      try {
        const urlObj = new URL(window.location.origin);
        urlObj.hostname = toASCII(urlObj.hostname);
        setPunycodeOrigin(urlObj.origin);
      } catch (e) {
        setPunycodeOrigin(window.location.origin);
      }

      // 3. 토큰 가져오기
      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;
      setToken(sessionToken);

      // 4. 내 URL 목록 가져오기
      const res = await fetch("/api/my-urls", {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      
      const d = await res.json();
      
      // [수정 핵심] API가 배열을 바로 반환하므로 d.urls가 아니라 d를 사용해야 합니다.
      if (Array.isArray(d)) {
        setUrls(d);
      } else {
        setUrls([]);
      }
    }
    load();
  }, []);

  // 삭제 기능
  async function deleteUrl(code) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    
    if (!token) {
      alert("인증 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    // [수정] 경로를 /api/[code]에 맞춤
    const res = await fetch(`/api/${code}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      setUrls(urls.filter((u) => u.code !== code));
    } else {
      alert("삭제 실패");
    }
  }
  
  // 수정 기능
  async function handleEdit(code, currentUrl) {
    const newUrl = prompt("새로운 원본 URL을 입력하세요:", currentUrl);
    
    let displayCode = code;
    try {
      if (code && code.startsWith('xn--')) {
        displayCode = toUnicode(code);
      }
    } catch (e) {}

    if (newUrl && newUrl !== currentUrl && token) {
      // [수정] 경로를 /api/[code]에 맞춤
      const res = await fetch(`/api/${code}`, {
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
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      minHeight: "calc(100vh - 160px)",
      padding: "20px"
    }}>
      <div style={{
        background: "#fff", padding: "2rem", borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "95%", maxWidth: 900
      }}>
        <div>
          <h1 style={{ marginBottom: "1rem" }}>나의 URL 대시보드</h1>
          <Link
              href="/"
              style={{
                padding: "8px 14px", background: "#636e72", color: "#fff",
                borderRadius: 6, textDecoration: "none", fontWeight: "bold",
                fontSize: "0.9rem", transition: "background 0.2s ease",
                display: "inline-block", marginBottom: "1rem"
              }}
              onMouseOver={(e) => (e.target.style.background = "#2d3436")}
              onMouseOut={(e) => (e.target.style.background = "#636e72")}
            >
              🏠 메인으로
            </Link>
        </div>
        {user && <p>안녕하세요, {user.email}</p>}
        
        {punycodeOrigin && ( 
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ background: "#f1f2f6" }}>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>코드</th>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>원본 URL</th>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>만료일</th>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>QR</th>
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {urls.map((u) => {
              const functionalShortUrl = `${punycodeOrigin}/${u.code}`;
              let displayCode = u.code;
              try {
                if (u.code && u.code.startsWith('xn--')) {
                  displayCode = toUnicode(u.code);
                }
              } catch (e) {}

              return (
              <tr key={u.code}>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>{displayCode}</td>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                  <a
                    href={u.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0984e3", textDecoration: "none", wordBreak: "break-all" }}
                  >
                    {u.url.length > 30 ? u.url.slice(0,30) + '...' : u.url}
                    <FaExternalLinkAlt style={{ marginLeft: 6, color: "#636e72" }} />
                  </a>
                </td>
                <td style={{ padding: 8, border: "1px solid #dfe6e9" }}>
                  {u.expires_at ? new Date(u.expires_at).toLocaleDateString() : "무제한"}
                </td>
                <td style={{ padding: 8, border: "1px solid #dfe6e9", textAlign: "center" }}>
                  <QRCodeCanvas value={functionalShortUrl} size={64} level="H" imageSettings={qrImageSettings} />
                </td>
                <td style={{ padding: 8, border: "1px solid #dfe6e9", textAlign: "center" }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button onClick={() => handleEdit(u.code, u.url)} style={{ cursor: "pointer", background:"none", border:"1px solid #ccc", borderRadius:4, padding:4 }}>
                      <FaPencilAlt />
                    </button>
                    <button onClick={() => deleteUrl(u.code)} style={{ cursor: "pointer", background:"#d63031", color:"white", border:"none", borderRadius:4, padding:4 }}>
                      <FaTrashAlt />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
            {urls.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 16 }}>등록된 URL이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
        )} 
      </div>
    </div>
  );
}