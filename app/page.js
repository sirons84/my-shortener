/* 파일 경로: app/page.js (이 코드로 전체를 덮어쓰세요) */
"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";
import { toUnicode, toASCII } from "punycode";
import Image from 'next/image'; 

// --- 컴포넌트 임포트 ---
import styles from "./page.module.css";
import InfoSidebar from "../components/InfoSidebar";
import StyledInput from "../components/StyledInput";
import SubmitButton from "../components/SubmitButton";
import PrefixedInput from "../components/PrefixedInput";
import StyledSelect from "../components/StyledSelect";

// QR코드 설정 (로고 등)
const qrImageSettings = {
  src: "/qrlogo2.png", 
  height: 32,
  width: 32,
  excavate: true,
};

export default function Home() {
  // --- 상태 변수 ---
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiry, setExpiry] = useState("7d");
  const [shortCode, setShortCode] = useState(""); 
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false); 
  const [user, setUser] = useState(null); 

  // --- 사용자 인증 상태 감지 ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => authListener?.subscription.unsubscribe();
  }, []);

  
  // --- URL 줄이기 함수 ---
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setShortCode("");
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ url, customCode, expiry }),
      });
// ▼▼▼ 여기부터 수정해주세요 ▼▼▼
      const data = await res.json(); // 응답 데이터를 먼저 받습니다.

      if (res.ok) {
        setShortCode(data.code); 
      } else if (res.status === 409) {
        setError("이미 사용 중인 단축 주소입니다.");
      } else {
        // 서버가 보내준 진짜 에러 메시지를 화면에 보여줍니다.
        setError(data.error || "URL을 줄이는 데 실패했습니다.");
      }
      // ▲▲▲ 여기까지 수정 ▲▲▲
            
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // --- 결과 표시용 변수 ---
  let functionalShortUrl = "";
  let displayShortUrl = "";    

  if (shortCode) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      const displayCode = shortCode.startsWith('xn--') ? toUnicode(shortCode) : shortCode;
      const displayHost = toUnicode(window.location.hostname);
      displayShortUrl = `${displayHost}/${displayCode}`;
    } catch (e) {
      displayShortUrl = `${window.location.hostname}/${shortCode}`;
    }
    try {
      const punycodeHost = window.location.hostname;
      functionalShortUrl = `https://${punycodeHost}/${shortCode}`;
    } catch (e) {
      functionalShortUrl = `${origin}/${shortCode}`;
    }
  }

  async function copyToClipboard() {
    if (!displayShortUrl) return;
    const textToCopy = `https://${displayShortUrl}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      alert("클립보드에 복사되었습니다: " + textToCopy);
    } catch (err) {
      // 폴백(Fallback) 복사
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("클립보드에 복사되었습니다: " + textToCopy);
    }
  }
  
  // --- JSX 렌더링 ---
  return (
    <div className={styles.wrapper}>
      <InfoSidebar />

      <section className={styles.mainContent}>
        <h2 className={styles.title}>긴~주소 짧게 줄이기</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <StyledInput
            label="원본 주소(url)"
            type="url"
            placeholder="긴 URL을 입력하세요"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <div className={styles.arrowWrapper}>
            <Image src="/icons/arrow-down.svg" alt="아래 화살표" width={24} height={24} />
          </div>

          <div className={styles.selectWrapper}>
            <div className={styles.customCodeInput}>
              <PrefixedInput
                label="단축 주소"
                placeholder="나만의 주소 (선택)"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
              />
            </div>
            <div>
              <StyledSelect
                label="유지 기간"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
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
              </StyledSelect>
            </div>
          </div>

          <SubmitButton disabled={loading} />
        </form>

        {error && <div style={{ color: 'red', textAlign: 'center', marginTop: '15px' }}>{error}</div>}
        {loading && <div style={{ textAlign: 'center', marginTop: '20px', fontWeight: '600' }}>생성 중...</div>}
        
        {/* --- 결과 카드 (QR코드 디자인 개선) --- */}
        {shortCode && !loading && ( 
          <div className={styles.resultCard}>
            <p style={{marginBottom: '10px', fontSize: '18px', fontWeight: '600'}}>✅ 생성 완료!</p>
            <p style={{marginBottom: '20px', wordBreak: 'break-all', fontSize: '16px', color:'#0984e3'}}>
              <strong>{displayShortUrl}</strong>
            </p>
            
            {/* QR코드 박스 */}
            <div className={styles.qrContainer}>
              <div className={styles.qrBox}>
                <QRCodeCanvas 
                  value={functionalShortUrl}
                  size={140} 
                  level="H"
                  imageSettings={qrImageSettings}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            </div>

            <button onClick={copyToClipboard} className={styles.copyButton}>
              {/* 복사 아이콘 SVG */}
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>주소 복사하기</span>
            </button>
          </div>
        )}
      </section>

      {/* --- 캐릭터 (배경 고정) --- */}


    </div>
  );
}