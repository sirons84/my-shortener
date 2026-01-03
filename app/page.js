/* 파일 경로: app/page.js (이 코드로 덮어쓰세요) */
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

// QR코드 중앙에 들어갈 로고 이미지 설정
const qrImageSettings = {
  src: "/logo.png", // public/logo.png (캐릭터 로고)
  height: 32,
  width: 32,
  excavate: true,
};

export default function Home() {
  // --- 상태 변수 정의 ---
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiry, setExpiry] = useState("7d");
  const [shortCode, setShortCode] = useState(""); 
  const [error, setError] = useState(""); // 오류 메시지 상태
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [user, setUser] = useState(null); // 사용자 로그인 상태

  // --- 사용자 인증 상태 감지 ---
  useEffect(() => {
    // 1. 페이지 로드 시 사용자 정보 가져오기
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    // 2. 인증 상태 변경 시 (로그인/로그아웃) user 상태 실시간 업데이트
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // 3. 리스너 해제
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); // 페이지 로드 시 1회만 실행

  
  // --- "URL 줄이기" 버튼 클릭 시 실행될 함수 ---
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); // 로딩 시작
    setShortCode("");
    setError("");

    // 1. 로그인한 사용자의 인증 토큰(JWT) 가져오기
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
      "Content-Type": "application/json",
    };
    
    // 2. 로그인 상태라면 Authorization 헤더에 토큰 추가
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      // 3. /api/shorten 에 POST 요청 전송
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ url, customCode, expiry }),
      });

      if (res.ok) {
        const data = await res.json();
        // 4. (성공) 응답으로 받은 단축 코드를 state에 저장 (-> 결과 카드 표시됨)
        setShortCode(data.code); 
      } else if (res.status === 409) {
        // 409 Conflict (중복 코드)
        setError("이미 사용 중인 단축 주소입니다. 다른 주소를 입력해 주세요.");
      } else {
        // 기타 서버 오류
        setError("URL을 줄이는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false); // 로딩 종료
    }
  }

  // --- 결과 표시 및 복사 기능 함수 ---
  let functionalShortUrl = ""; // 실제 QR코드/복사에 사용될 URL (Punycode)
  let displayShortUrl = "";    // 화면에 표시될 URL (한글)

  if (shortCode) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    
    // 1. 화면 표시용 URL (예: 외솔.한국/테스트)
    try {
      const displayCode = shortCode.startsWith('xn--') ? toUnicode(shortCode) : shortCode;
      const displayHost = toUnicode(window.location.hostname);
      displayShortUrl = `${displayHost}/${displayCode}`;
    } catch (e) {
      displayShortUrl = `${window.location.hostname}/${shortCode}`;
    }

    // 2. 기능성 URL (예: xn--im4bl3g.xn--3e0b707e/xn--9w3b)
    try {
      // hostname이 이미 Punycode이므로 toASCII는 필요 없음.
      const punycodeHost = window.location.hostname;
      functionalShortUrl = `https://${punycodeHost}/${shortCode}`;
    } catch (e) {
      functionalShortUrl = `${origin}/${shortCode}`;
    }
  }

  // (!! 중요 !!) "removeChild" 오류를 수정한 클립보드 복사 함수
  async function copyToClipboard() {
    if (!displayShortUrl) return;

    const textToCopy = `https://${displayShortUrl}`;
    const textArea = document.createElement("textarea");

    try {
      // (iFrame 환경에서 가장 안정적인 복사 방법)
      
      // 1. textarea를 보이지 않게 설정
      textArea.value = textToCopy;
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      
      // 2. body에 추가
      document.body.appendChild(textArea);
      
      // 3. 선택 및 복사
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      
      alert("클립보드에 복사되었습니다: " + textToCopy);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      alert("복사에 실패했습니다. 수동으로 복사해주세요.");
    } finally {
      // 4. (!! 안전하게 제거 !!)
      // textArea가 body의 자식인 경우에만 제거
      if (textArea.parentNode === document.body) {
        document.body.removeChild(textArea);
      }
    }
  }
  
  // --- (JSX 렌더링) ---
  return (
    <div className={styles.wrapper}>
      <InfoSidebar />

      <section className={styles.mainContent}>
        <h2 className={styles.title}>최현배 선생님과 함께하는 한글주소 만들기</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          
          <StyledInput
            label="원본 주소(url)"
            type="url"
            placeholder="긴 URL을 입력하세요"
            value={url}
            // (!! 오타 수정됨 !!)
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <div className={styles.arrowWrapper}>
            <Image
              src="/icons/arrow-down.svg" 
              alt="아래 화살표"
              width={24} 
              height={24}
            />
          </div>

          <div className={styles.selectWrapper}>
            <div className={styles.customCodeInput}>
              <PrefixedInput
                label="단축 주소"
                placeholder="나만의 단축 주소 (한글, 영어, 숫자)"
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
                
                {/* 로그인 시(user가 true일 때) 추가 옵션 표시 */}
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

          {/* 로딩 중일 때 버튼 비활성화 (disabled=true) */}
          <SubmitButton disabled={loading} />
        </form>

        {/* --- 오류 메시지 표시 영역 --- */}
        {error && (
          <div style={{ color: 'red', textAlign: 'center', marginTop: '15px' }}>
            {error}
          </div>
        )}

        {/* --- 로딩 중 표시 영역 --- */}
        {loading && (
           <div style={{ textAlign: 'center', marginTop: '20px', fontWeight: '600' }}>
             URL을 생성하는 중입니다...
           </div>
        )}
        
        {/* --- (!! 중요 !!) 결과 카드 표시 영역 --- */}
        {/* shortCode가 있고, 로딩 중이 아닐 때만 표시 */}
        {shortCode && !loading && ( 
          <div className={styles.resultCard}>
            <p style={{marginBottom: '10px', fontSize: '18px', fontWeight: '600'}}>
              ✅ URL 생성 완료!
            </p>
            <p style={{marginBottom: '15px', wordBreak: 'break-all', fontSize: '16px'}}>
              단축 URL: <strong>{displayShortUrl}</strong>
            </p>
            
            {/* QR 코드 캔버스 */}
            <QRCodeCanvas 
              value={functionalShortUrl} // 기능 URL (Punycode)
              size={128} 
              level="H" // 높은 복원력
              imageSettings={qrImageSettings}
            />
            <br />
            
            {/* 복사하기 버튼 */}
            <button 
              onClick={copyToClipboard} 
              style={{
                marginTop: '15px', 
                padding: '10px 16px',
                cursor: 'pointer',
                background: '#0984e3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600'
              }}
            >
              📋 단축 URL 복사하기
            </button>
          </div>
        )}
      </section>
    </div>
  );
}