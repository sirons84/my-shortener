// app/dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { FiLink, FiCopy, FiTrash2, FiLogOut, FiSettings, FiX } from 'react-icons/fi';

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiry, setExpiry] = useState('forever');
  const [createLoading, setCreateLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    checkUser();
    fetchUrls();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push('/');
    setUser(user);
  };

  const fetchUrls = async () => {
    try {
      const res = await fetch('/api/my-urls');
      if (res.ok) {
        const data = await res.json();
        setUrls(data.urls || []);
      }
    } catch (error) {
      console.error('URL 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput, customCode, expiry }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '생성 실패');

      setUrlInput('');
      setCustomCode('');
      fetchUrls(); // 목록 갱신
      alert('단축 URL이 생성되었습니다!');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      // 삭제 API 구현 필요 (생략 시 UI에서만 제거 or 별도 API 구현)
      // 여기서는 예시로 UI 갱신만 처리
      const { error } = await supabase.from('urls').delete().eq('id', id);
      if (error) throw error;
      setUrls(urls.filter(u => u.id !== id));
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 비밀번호 변경 로직
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });

    if (pwdForm.new !== pwdForm.confirm) {
      setPwdMsg({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }

    if (pwdForm.new.length < 6) {
      setPwdMsg({ type: 'error', text: '비밀번호는 6자 이상이어야 합니다.' });
      return;
    }

    try {
      // 1. 현재 비밀번호 확인 (로그인 시도)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwdForm.current,
      });

      if (signInError) {
        setPwdMsg({ type: 'error', text: '현재 비밀번호가 올바르지 않습니다.' });
        return;
      }

      // 2. 비밀번호 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        password: pwdForm.new
      });

      if (updateError) throw updateError;

      setPwdMsg({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setPwdForm({ current: '', new: '', confirm: '' }); // 폼 초기화
      setTimeout(() => setShowPasswordModal(false), 2000); // 2초 후 닫기

    } catch (error) {
      setPwdMsg({ type: 'error', text: '비밀번호 변경 실패: ' + error.message });
    }
  };

  if (loading) return <div className="p-8 text-center">로딩 중...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      {/* 상단 헤더 */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>내 단축 URL 관리</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowPasswordModal(true)}
            style={{ ...btnStyle, backgroundColor: '#4b5563' }}
          >
            <FiSettings style={{ marginRight: '5px' }} /> 비번 변경
          </button>
          <button 
            onClick={handleLogout}
            style={{ ...btnStyle, backgroundColor: '#ef4444' }}
          >
            <FiLogOut style={{ marginRight: '5px' }} /> 로그아웃
          </button>
        </div>
      </header>

      {/* URL 생성 폼 */}
      <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '15px', fontWeight: 'bold' }}>새 URL 만들기</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="url" 
            placeholder="긴 원본 URL을 입력하세요 (https://...)" 
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            required
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="원하는 단축 코드 (선택사항)" 
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              style={inputStyle}
            />
            <select 
              value={expiry} 
              onChange={(e) => setExpiry(e.target.value)}
              style={inputStyle}
            >
              <option value="forever">영구 보존</option>
              <option value="7d">7일 후 만료</option>
              <option value="30d">30일 후 만료</option>
              <option value="180d">6개월 후 만료</option>
            </select>
          </div>
          {errorMsg && <p style={{ color: 'red', fontSize: '14px' }}>{errorMsg}</p>}
          <button type="submit" disabled={createLoading} style={{ ...btnStyle, width: '100%', marginTop: '10px' }}>
            {createLoading ? '생성 중...' : '단축 URL 생성하기'}
          </button>
        </form>
      </section>

      {/* URL 목록 */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {urls.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>생성된 단축 URL이 없습니다.</p>
        ) : (
          urls.map((item) => (
            <div key={item.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ overflow: 'hidden', flex: 1, paddingRight: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold', color: '#2563eb' }}>/{item.code}</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                    {item.count}회 클릭
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.url}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/r/${item.code}`)}
                  style={{ ...iconBtnStyle, color: '#059669' }}
                  title="복사"
                >
                  <FiCopy />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  style={{ ...iconBtnStyle, color: '#dc2626' }}
                  title="삭제"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>비밀번호 변경</h3>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>현재 비밀번호</label>
                <input 
                  type="password" 
                  value={pwdForm.current}
                  onChange={(e) => setPwdForm({...pwdForm, current: e.target.value})}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>새 비밀번호</label>
                <input 
                  type="password" 
                  value={pwdForm.new}
                  onChange={(e) => setPwdForm({...pwdForm, new: e.target.value})}
                  required
                  placeholder="6자 이상 입력"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>새 비밀번호 확인</label>
                <input 
                  type="password" 
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm({...pwdForm, confirm: e.target.value})}
                  required
                  style={inputStyle}
                />
              </div>

              {pwdMsg.text && (
                <div style={{ 
                  padding: '10px', borderRadius: '5px', fontSize: '14px',
                  backgroundColor: pwdMsg.type === 'error' ? '#fee2e2' : '#dcfce7',
                  color: pwdMsg.type === 'error' ? '#b91c1c' : '#15803d'
                }}>
                  {pwdMsg.text}
                </div>
              )}

              <button type="submit" style={{ ...btnStyle, width: '100%', marginTop: '10px' }}>
                변경하기
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 스타일 정의
const btnStyle = {
  padding: '10px 16px', backgroundColor: '#2563eb', color: 'white',
  border: 'none', borderRadius: '6px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '500'
};

const iconBtnStyle = {
  background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
  padding: '8px', cursor: 'pointer', fontSize: '18px'
};

const inputStyle = {
  width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px'
};

const labelStyle = {
  display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '5px', color: '#374151'
};

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
};