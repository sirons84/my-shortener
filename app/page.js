/* 파일 경로: app/page.js */
"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
// [수정 핵심 1] 쿠키 기반 인증 클라이언트 불러오기
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toUnicode, toASCII } from "punycode";
import Image from 'next/image'; 
import Link from 'next/link';

import { FiShare2, FiDownload } from 'react-icons/fi';
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
  // [수정 핵심 2] supabase 객체 생성
  const supabase = createClientComponentClient();
  
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiry, setExpiry] = useState("7d");
  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

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
  }, [supabase.auth]);

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

  // 공유 (Web Share API → 미지원 시 복사 fallback)
  async function handleShare() {
    if (!displayShortUrl) return;
    const shareUrl = `https://${displayShortUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title: '단축 주소 공유' });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (e) {
        if (e.name !== 'AbortError') setError('공유에 실패했습니다.');
      }
    } else {
      await copyToClipboard();
    }
  }

  // QR PNG 다운로드
  function handleQrDownload() {
    const canvas = document.querySelector('#main-qr-canvas canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${shortCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function copyToClipboard() {
    if (!displayShortUrl) return;
    const textToCopy = `https://${displayShortUrl}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
      // 구형 브라우저 폴백
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  
  return (
    <div className={styles.wrapper}>
      <InfoSidebar />

      <section className={styles.mainContent}>
        {/* 상단 버튼 추가: 로그인 상태에 따라 대시보드 또는 로그인 이동 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          {user ? (
            <Link href="/dashboard" style={{ fontSize: '14px', color: '#666', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              ⚙️ 내 주소 관리 (대시보드)
            </Link>
          ) : (
            <Link href="/login" style={{ fontSize: '14px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>
              🔑 로그인 / 회원가입
            </Link>
          )}
        </div>

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
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <StyledSelect
                label="유지 기간"
                value={expiry}
                onChange={(newValue) => setExpiry(newValue)} 
                options={expiryOptions} 
              />
              {!user && (
                <span className={styles.loginHintLink} style={{ cursor: 'default' }}>
                  <span className={styles.loginHintIcon}>🔒</span> 
                  로그인하면 무제한 가능
                </span>
              )}
            </div>
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
              <div id="main-qr-canvas" className={styles.qrBox}>
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

            {/* 버튼 3개: 복사 · 공유 · QR 저장 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={copyToClipboard} className={styles.copyButton} style={{ flex: 1 }}>
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
                <span>{copied ? '복사 완료!' : '복사'}</span>
              </button>

              <button onClick={handleShare} className={styles.copyButton} style={{ flex: 1, backgroundColor: shared ? '#7c3aed' : undefined }}>
                <FiShare2 size={18} />
                <span>{shared ? '공유됨!' : '공유'}</span>
              </button>

              <button onClick={handleQrDownload} className={styles.copyButton} style={{ flex: 1, backgroundColor: '#059669' }}>
                <FiDownload size={18} />
                <span>QR 저장</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}