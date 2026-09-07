"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 세션 정보 확인
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    checkUser();

    // 로그인 상태 변화 실시간 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();
      // 로그아웃 후에는 자동으로 상태가 업데이트 되어 헤더가 변경됩니다.
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.wrapper}>
        {/* 메인 로고 (클릭 시 홈으로) */}
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
        
        {/* 우측: 배움터로 가는 길 + 로그인/로그아웃 */}
        <div className={styles.authContainer}>
          {/* 배움터는 자기 껍데기를 쓰므로, 들어가는 길은 여기 하나뿐이다 */}
          <Link href="/배움터" className={styles.navLink}>외솔 배움터</Link>

          {user ? (
            <>
              {/* 로그인 상태: 대시보드 이동 및 로그아웃 버튼 */}
              <Link href="/dashboard" className={styles.myUrlButton}>나의 URL</Link>
              <button onClick={handleLogout} className={styles.logoutButton}>로그아웃</button>
            </>
          ) : (
            <>
              {/* 로그아웃 상태: 전용 로그인 페이지(/login)로 이동하는 버튼으로 통일 */}
              <Link href="/login" className={styles.myUrlButton} style={{ textDecoration: 'none' }}>
                선생님 로그인
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}