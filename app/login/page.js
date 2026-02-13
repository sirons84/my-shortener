'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { FiAlertCircle, FiCheckCircle, FiLock, FiMail, FiRefreshCw } from 'react-icons/fi'; 
import Link from 'next/link';

export default function LoginPage() {
  const [isLoginMode, setIsLoginMode] = useState(true); // 로그인 vs 회원가입 모드
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // [추가] 로그인 실패 시 비밀번호 초기화 버튼 노출 여부
  const [showResetInError, setShowResetInError] = useState(false);

  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowResetInError(false);

    try {
      if (isLoginMode) {
        // --- 로그인 시도 ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        router.push('/'); 
        router.refresh();
      } else {
        // --- 회원가입 시도 ---
        const isAllowedDomain = email.endsWith('@usedu.ai.kr');
        const isAdmin = email === 'sirons@usedu.ai.kr';
        
        if (!isAllowedDomain && !isAdmin) {
           throw new Error("죄송합니다. @usedu.ai.kr 이메일만 가입할 수 있습니다.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        
        if (error) throw error;

        if (data?.user?.identities?.length === 0) {
           setErrorMsg("이미 가입된 이메일입니다. 로그인을 시도해주세요.");
        } else {
           setSuccessMsg("가입 성공! 이메일 인증 후 로그인해주세요.");
           setIsLoginMode(true); 
        }
      }
    } catch (err) {
      // 에러 메시지 처리 및 초기화 버튼 노출 로직
      if (err.message.includes('Invalid login credentials')) {
        setErrorMsg('아이디 또는 비밀번호가 일치하지 않습니다.');
        // [핵심] 로그인 실패 시 초기화 버튼을 에러 박스 안에 띄움
        setShowResetInError(true);
      } else if (err.message.includes('User already registered')) {
        setErrorMsg('이미 가입된 사용자입니다.');
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('비밀번호를 초기화하려면 이메일을 먼저 입력해주세요.');
      return;
    }
    if (!confirm(`${email} 주소로 임시 비밀번호를 발급하시겠습니까?`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || '초기화 실패');
      
      setSuccessMsg('임시 비밀번호가 발급되었습니다. (서버 로그 확인)');
      setErrorMsg(null); // 에러 메시지 제거
      setShowResetInError(false);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
           <Link href="/" style={{textDecoration: 'none', fontSize: '24px'}}>🏠</Link>
        </div>
        
        <h1 style={styles.title}>
          {isLoginMode ? '로그인' : '회원가입'}
        </h1>
        
        {/* 에러 메시지 박스 */}
        {errorMsg && (
          <div style={styles.errorBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiAlertCircle size={20} flexShrink={0} />
              <span>{errorMsg}</span>
            </div>
            
            {/* [추가 기능] 로그인 실패 시 바로 뜨는 '비밀번호 초기화' 버튼 */}
            {showResetInError && isLoginMode && (
              <button 
                onClick={handleResetPassword}
                style={styles.inlineResetBtn}
              >
                비밀번호 초기화하기 👉
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div style={styles.successBox}>
            <FiCheckCircle style={{ marginRight: '8px', flexShrink: 0 }} size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} style={styles.form}>
          <div style={styles.inputGroup}>
            <FiMail style={styles.icon} />
            <input
              type="email"
              placeholder="이메일 (@usedu.ai.kr)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.inputGroup}>
            <FiLock style={styles.icon} />
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              minLength={6}
            />
          </div>
          
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? <FiRefreshCw className="animate-spin" /> : (isLoginMode ? '로그인하기' : '가입하기')}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', display:'flex', flexDirection:'column', gap:'10px' }}>
          <button 
            type="button" 
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg(null);
              setSuccessMsg(null);
              setShowResetInError(false);
            }}
            style={{...styles.linkButton, fontWeight: 'bold'}}
          >
            {isLoginMode ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>

          {/* 하단 상시 노출 비밀번호 찾기 */}
          {isLoginMode && !showResetInError && (
            <button 
              type="button" 
              onClick={handleResetPassword}
              style={{...styles.linkButton, color: '#999', fontSize: '13px'}}
            >
              비밀번호를 잊으셨나요?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px'
  },
  card: {
    backgroundColor: 'white', padding: '40px', borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px'
  },
  title: {
    fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center', color: '#1f2937'
  },
  errorBox: {
    display: 'flex', flexDirection: 'column', // 세로 정렬로 변경
    backgroundColor: '#fee2e2', color: '#b91c1c',
    padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', wordBreak: 'keep-all'
  },
  inlineResetBtn: {
    marginTop: '8px',
    padding: '6px 10px',
    backgroundColor: '#fff',
    border: '1px solid #f87171',
    color: '#b91c1c',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    alignSelf: 'flex-start'
  },
  successBox: {
    display: 'flex', alignItems: 'center', backgroundColor: '#dcfce7', color: '#15803d',
    padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', wordBreak: 'keep-all'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { position: 'relative' },
  icon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
  input: {
    width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px',
    border: '1px solid #d1d5db', fontSize: '16px', outline: 'none'
  },
  button: {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s',
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  linkButton: {
    background: 'none', border: 'none', color: '#2563eb', 
    cursor: 'pointer', textDecoration: 'underline', fontSize: '14px'
  }
};