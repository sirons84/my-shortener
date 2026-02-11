/* 파일 경로: app/login/page.js */
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { FiAlertCircle, FiCheckCircle, FiLock, FiMail } from 'react-icons/fi'; 
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('아이디 또는 비밀번호가 일치하지 않습니다.');
      setLoading(false);
    } else {
      router.push('/'); // 로그인 후 메인 페이지로 이동
      router.refresh();
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('비밀번호를 초기화하려면 이메일을 입력해주세요.');
      return;
    }
    
    if (!confirm(`${email} 주소로 임시 비밀번호를 발송하시겠습니까?`)) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '초기화 실패');

      setSuccessMsg('임시 비밀번호가 발급되었습니다. (콘솔 로그 확인)');
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
        <h1 style={styles.title}>로그인</h1>
        
        {errorMsg && (
          <div style={styles.errorBox}>
            <FiAlertCircle style={{ marginRight: '8px', flexShrink: 0 }} size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={styles.successBox}>
            <FiCheckCircle style={{ marginRight: '8px', flexShrink: 0 }} size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <FiMail style={styles.icon} />
            <input
              type="email"
              placeholder="이메일 주소"
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
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>
          
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? '처리 중...' : '로그인'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>
            비밀번호를 잊으셨나요?{' '}
            <button 
              type="button" 
              onClick={handleResetPassword}
              style={styles.linkButton}
            >
              비밀번호 초기화
            </button>
          </p>
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
    display: 'flex', alignItems: 'center', backgroundColor: '#fee2e2', color: '#b91c1c',
    padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px'
  },
  successBox: {
    display: 'flex', alignItems: 'center', backgroundColor: '#dcfce7', color: '#15803d',
    padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px'
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
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
  },
  linkButton: {
    background: 'none', border: 'none', color: '#2563eb', 
    cursor: 'pointer', textDecoration: 'underline', fontSize: '14px'
  }
};