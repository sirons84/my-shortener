/* 파일 경로: app/page.js */
"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";
import { toUnicode, toASCII } from "punycode";
import Image from 'next/image'; 
import Link from 'next/link';

import styles from "./page.module.css";
import InfoSidebar from "../components/InfoSidebar";
import StyledInput from "../components/StyledInput";
import SubmitButton from "../components/SubmitButton";
import PrefixedInput from "../components/PrefixedInput";
import StyledSelect from "../components/StyledSelect";

const qrImageSettings = {
  src: "/qrlogo2.png", 
  height: 32,
  width: 32,
  excavate: true,
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiry, setExpiry] = useState("7d");
  const [shortCode, setShortCode] = useState(""); 
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false); 
  const [user, setUser] = useState(null); 

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
      const data = await res.json(); 

      if (res.ok) {
        setShortCode(data.code); 
      } else if (res.status === 409) {
        setError("이미 사용 중인 단축 주소입니다.");
      } else {
        setError(data.error || "URL을 줄이는 데 실패했습니다.");
      }
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // --- [중요] 드롭다운 메뉴 데이터 생성 ---
  const expiryOptions = [
    { value: "7d", label: "1주일" },
    { value: "30d", label: "1개월" },
  ];

  if (user) {
    expiryOptions.push(
      { value: "180d", label: "6개월" },
      { value: "365d", label: "1년" },
      { value: "forever", label: "무제한 (영구)" }
    );
  }
  // ------------------------------------

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
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("클립보드에 복사되었습니다: " + textToCopy);
    }
  }
  
  return (
    <div className={styles.wrapper}>
      <InfoSidebar />

      <section className={styles.mainContent}>
        <h2 className={styles.title}>외솔 최현배 선생님과 한글 주소 만들기</h2>

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
            
            {/* ▼▼▼ [수정됨] StyledSelect에 options 배열 전달 ▼▼▼ */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <StyledSelect
                label="유지 기간"
                value={expiry}
                // (이전 방식: e.target.value) -> (새 방식: 값만 바로 전달됨)
                onChange={(newValue) => setExpiry(newValue)} 
                options={expiryOptions} 
              />

              {!user && (
                <Link href="/login" className={styles.loginHintLink}>
                  <span className={styles.loginHintIcon}>🔒</span> 
                  로그인하면 무제한 가능
                </Link>
              )}
            </div>
            {/* ▲▲▲ ------------------------------------ ▲▲▲ */}

          </div>

          <SubmitButton disabled={loading} />
        </form>

        {error && <div style={{ color: 'red', textAlign: 'center', marginTop: '15px' }}>{error}</div>}
        {loading && <div style={{ textAlign: 'center', marginTop: '20px', fontWeight: '600' }}>생성 중...</div>}
        
        {shortCode && !loading && ( 
          <div className={styles.resultCard}>
            <p style={{marginBottom: '10px', fontSize: '18px', fontWeight: '600'}}>✅ 생성 완료!</p>
            <p style={{marginBottom: '20px', wordBreak: 'break-all', fontSize: '16px', color:'#0984e3'}}>
              <strong>{displayShortUrl}</strong>
            </p>
            
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
              <svg 
                width="20" height="20" viewBox="0 0 24 24" 
                fill="none" stroke="currentColor" strokeWidth="2" 
                strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>주소 복사하기</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}