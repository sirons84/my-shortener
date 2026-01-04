/* components/Header.js */
"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); 
  const [loading, setLoading] = useState(false);

  // 입력 폼 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); 
  const [region, setRegion] = useState("울산광역시교육청"); // 기본값을 울산으로 변경
  const [schoolLevel, setSchoolLevel] = useState("초등학교");

  const regionList = [
    "울산광역시교육청", "서울특별시교육청", "부산광역시교육청", "대구광역시교육청", 
    "인천광역시교육청", "광주광역시교육청", "대전광역시교육청", "세종특별자치시교육청", 
    "경기도교육청", "강원특별자치도교육청", "충청북도교육청", "충청남도교육청", 
    "전북특별자치도교육청", "전라남도교육청", "경상북도교육청", "경상남도교육청", 
    "제주특별자치도교육청"
  ];

  const schoolLevelList = ["초등학교", "중학교", "고등학교", "기타"];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // 인증 처리 함수
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // --- [수정] 회원가입 검증 로직 ---
        
        // 1. 울산교육청일 경우에만 도메인 체크
        if (region === "울산광역시교육청") {
          if (!email.endsWith("@usedu.ai.kr")) {
            alert("울산광역시교육청 선생님은 @usedu.ai.kr 이메일로만 가입할 수 있습니다.");
            setLoading(false);
            return;
          }
        }
        // (다른 교육청은 제한 없음)

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              region: region,
              school_level: schoolLevel,
            },
          },
        });

        if (error) throw error;

        alert("가입 인증 메일을 보냈습니다!\n이메일을 확인하여 인증 링크를 클릭해주세요.");
        setShowModal(false);
        setIsSignUp(false);

      } else {
        // --- 로그인 ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setShowModal(false); 
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.wrapper}>
          <Link href="/">
            <Image 
              src="/images/logo-woori-ai.svg" 
              alt="우리아이 로고"
              width={180}
              height={50}
              className={styles.logo}
              priority
            />
          </Link>
          <div className={styles.authContainer}>
            {user ? (
              <>
                <Link href="/dashboard" className={styles.myUrlButton}>나의 URL</Link>
                <button onClick={handleLogout} className={styles.logoutButton}>로그아웃</button>
              </>
            ) : (
              <button onClick={() => setShowModal(true)} className={styles.myUrlButton}>선생님 로그인</button>
            )}
          </div>
        </div>
      </header>

      {showModal && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white', padding: '2rem', borderRadius: '12px',
              width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {isSignUp ? "선생님 회원가입" : "로그인"}
            </h2>
            
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* --- [수정] 회원가입 시 추가 정보가 '위'에 오도록 배치 --- */}
              {isSignUp && (
                <>
                  {/* 1. 소속 교육청 (가장 위) */}
                  <div>
                    <label style={labelStyle}>소속 교육청</label>
                    <select 
                      value={region} onChange={(e) => setRegion(e.target.value)}
                      style={inputStyle}
                    >
                      {regionList.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {/* 안내 문구 추가 */}
                    {region === "울산광역시교육청" && (
                      <p style={{ marginTop: '5px', fontSize: '0.85rem', color: '#0984e3', fontWeight: '600' }}>
                        * 나이스아이디@usedu.ai.kr로 가입해주세요
                      </p>
                    )}
                  </div>

                  {/* 2. 학교급 */}
                  <div>
                    <label style={labelStyle}>학교급</label>
                    <select 
                      value={schoolLevel} onChange={(e) => setSchoolLevel(e.target.value)}
                      style={inputStyle}
                    >
                      {schoolLevelList.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. 성명 */}
                  <div>
                    <label style={labelStyle}>성명</label>
                    <input 
                      type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동" required
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* --- 공통 입력 (이메일/비번) --- */}
              <div>
                <label style={labelStyle}>이메일</label>
                <input 
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={region === "울산광역시교육청" && isSignUp ? "neis_id@usedu.ai.kr" : "example@email.com"}
                  required
                  style={inputStyle}
                />
              </div>
              
              <div>
                <label style={labelStyle}>비밀번호</label>
                <input 
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자리 이상 입력" required minLength={6}
                  style={inputStyle}
                />
              </div>

              <button 
                type="submit" disabled={loading}
                style={{
                  marginTop: '1rem', padding: '0.75rem',
                  backgroundColor: '#0984e3', color: 'white',
                  border: 'none', borderRadius: '6px',
                  fontSize: '1rem', fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? "처리 중..." : (isSignUp ? "가입하기" : "로그인")}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
              {isSignUp ? "이미 계정이 있으신가요? " : "아직 계정이 없으신가요? "}
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                style={{ background: 'none', border: 'none', color: '#0984e3', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
              >
                {isSignUp ? "로그인하기" : "회원가입하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const labelStyle = { display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' };
const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' };