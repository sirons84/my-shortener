/* 파일 경로: app/HomeMain.js — 홈 상단(단축 URL 생성) 클라이언트 영역 */
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
// QR 코드는 URL 생성 후에만 필요하므로 초기 번들에서 분리(지연 로딩)
const QRCodeCanvas = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeCanvas),
  { ssr: false }
);
// [수정 핵심 1] 쿠키 기반 인증 클라이언트 불러오기
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toUnicode } from "punycode";
import Image from 'next/image'; 
import Link from 'next/link';

import { FiShare2, FiDownload } from 'react-icons/fi';
import styles from "./page.module.css";
import InfoSidebar from "../components/InfoSidebar";
import StyledInput from "../components/StyledInput";
import SubmitButton from "../components/SubmitButton";
import PrefixedInput from "../components/PrefixedInput";
import StyledSelect from "../components/StyledSelect";

const QR_DISPLAY_SIZE = 140;
const qrImageSettings = {
  src: "/qrlogo2.png", 
  height: 32,
  width: 32,
  excavate: true,
};

// 다운로드용 고해상도 QR: 화면 표시용과 같은 비율로 확대해 숨겨진 캔버스에 렌더링
const QR_DOWNLOAD_SIZE = 1024;
const QR_DOWNLOAD_SCALE = QR_DOWNLOAD_SIZE / QR_DISPLAY_SIZE;
const qrDownloadImageSettings = {
  src: "/qrlogo2.png",
  height: Math.round(qrImageSettings.height * QR_DOWNLOAD_SCALE),
  width: Math.round(qrImageSettings.width * QR_DOWNLOAD_SCALE),
  excavate: true,
};

export default function HomeMain() {
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
    // onAuthStateChange가 마운트 시 초기 세션(INITIAL_SESSION)을 즉시 발화하므로
    // 별도의 getUser() 네트워크 호출 없이 이 리스너 하나로 초기 상태까지 처리한다.
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
  let unicodeShortUrl = "";
  if (shortCode) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      const displayCode = shortCode.startsWith('xn--') ? toUnicode(shortCode) : shortCode;
      const displayHost = toUnicode(window.location.hostname);
      displayShortUrl = `${displayHost}/${displayCode}`;
      unicodeShortUrl = `https://${displayShortUrl}`;
    } catch (e) {
      displayShortUrl = `${window.location.hostname}/${shortCode}`;
      unicodeShortUrl = `${origin}/${shortCode}`;
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
    // 실제 공유되는 값은 퓨니코드(ASCII) URL로 통일 — 유니코드 도메인을
    // 제대로 열지 못하는 앱/메신저에서도 안전하게 동작하도록.
    if (!functionalShortUrl) return;
    const shareUrl = functionalShortUrl;
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
    // 고해상도 캔버스를 우선 사용하고, 없으면 화면 표시용으로 폴백
    const canvas =
      document.querySelector('#qr-download-canvas canvas') ||
      document.querySelector('#main-qr-canvas canvas');
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
    // 복사되는 값도 표시와 동일하게 유니코드 URL (예: https://외솔.한국/코드)
    if (!unicodeShortUrl) return;
    const textToCopy = unicodeShortUrl;
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
                  size={QR_DISPLAY_SIZE}
                  level="H"
                  imageSettings={qrImageSettings}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
            </div>

            {/* 다운로드 전용 고해상도 QR (화면에는 보이지 않음) */}
            <div
              id="qr-download-canvas"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-99999px', top: 0, pointerEvents: 'none' }}
            >
              <QRCodeCanvas
                value={functionalShortUrl}
                size={QR_DOWNLOAD_SIZE}
                level="H"
                imageSettings={qrDownloadImageSettings}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            {/* 버튼 3개: 복사 · 공유 · QR 저장 */}
            <div className={styles.actionRow}>
              <button onClick={copyToClipboard} className={styles.copyButton}>
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

              <button onClick={handleShare} className={styles.copyButton} style={{ backgroundColor: shared ? '#7c3aed' : undefined }}>
                <FiShare2 size={18} />
                <span>{shared ? '공유됨!' : '공유'}</span>
              </button>

              <button onClick={handleQrDownload} className={styles.copyButton} style={{ backgroundColor: '#059669' }}>
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