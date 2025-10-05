"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { FaTrashAlt, FaQrcode, FaExternalLinkAlt } from "react-icons/fa";

export default function DashboardPage() {
  const [urls, setUrls] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setUser(data.user);

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch("/api/my-urls", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      setUrls(d.urls || []);
    }
    load();
  }, []);

  async function deleteUrl(code) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`/api/url/${code}`, { method: "DELETE" });
    setUrls(urls.filter((u) => u.code !== code));
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
              <th style={{ padding: 8, border: "1px solid #dfe6e9" }}>삭제</th>
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
                    style={{ color: "#0984e3", textDecoration: "none" }}
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
                  <QRCodeCanvas value={`${window.location.origin}/${u.code}`} size={256} />
                </td>
                <td style={{
                  padding: 8, border: "1px solid #dfe6e9", textAlign: "center"
                }}>
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
