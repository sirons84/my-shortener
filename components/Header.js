/* components/Header.js */
"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [user, setUser] = useState(null);
  
  // 로그인 모달 상태 관리
  const [showModal, setShowModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // true면 회원가입 모드
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 초기 세션 확인 및 상태 감지
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

  // 이메일/비밀번호 인증 처리 함수
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // --- 회원가입 로직 ---
        
        // 1. 도메인 체크
        if (!email.endsWith("@usedu.ai.kr")) {
          alert("회원가입은 @usedu.ai.kr 이메일만 가능합니다.");
          setLoading(false);
          return;
        }

        // 2. Supabase 회원가입 요청
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        alert("가입 인증 메일을 보냈습니다!\n이메일을 확인하여 인증 링크를 클릭해주세요.");
        setShowModal(false); // 모달 닫기
        setIsSignUp(false); // 로그인 모드로 복귀

      } else {
        // --- 로그인 로직 ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        // 로그인 성공 시 onAuthStateChange가 자동으로 감지하여 UI 업데이트
        setShowModal(false); 
      }
    } catch (error) {
      alert(error.message); // 에러 메시지 표시 (예: 비밀번호 틀림 등)
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
                <Link href="/dashboard" className={styles.myUrlButton}>
                  나의 URL
                </Link>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  로그아웃
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowModal(true)} 
                className={styles.myUrlButton}
              >
                선생님 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- 로그인/회원가입 모달 (팝업) --- */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)} // 배경 클릭 시 닫기
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
            onClick={e => e.stopPropagation()} // 내부 클릭 시 닫기 방지
          >
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {isSignUp ? "회원가입" : "로그인"}
            </h2>
            
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>이메일</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@usedu.ai.kr"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>비밀번호</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자리 이상 입력"
                  required
                  minLength={6}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#0984e3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1
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