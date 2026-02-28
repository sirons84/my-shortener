'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { FiCopy, FiTrash2, FiLogOut, FiSettings, FiX, FiGrid, FiEdit, FiCheck } from 'react-icons/fi';
import { QRCodeCanvas } from 'qrcode.react';
import { toUnicode } from 'punycode';
import Link from 'next/link';

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [punycodeOrigin, setPunycodeOrigin] = useState("");

  // 토스트 알림 상태
  const [toast, setToast] = useState({ show: false, type: '', text: '' });
  // 삭제 인라인 확인 상태 (해당 항목의 id)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // 복사 완료 표시 상태 (해당 항목의 code)
  const [copiedCode, setCopiedCode] = useState(null);

  // 모달 상태 관리
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [qrModal, setQrModal] = useState({ show: false, url: '', code: '' });
  // originalCode: API 경로에 쓸 원본 코드 / code: 편집 중인 코드
  const [editModal, setEditModal] = useState({ show: false, id: null, url: '', code: '', originalCode: '' });
  const [editMsg, setEditMsg] = useState({ type: '', text: '' });

  const supabase = createClientComponentClient();
  const router = useRouter();

  const showToast = (type, text) => {
    setToast({ show: true, type, text });
    setTimeout(() => setToast({ show: false, type: '', text: '' }), 3000);
  };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  useEffect(() => {
    let isMounted = true;

    const initDashboard = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        if (isMounted) router.push('/login');
        return;
      }

      try {
        const urlObj = new URL(window.location.origin);
        let host = urlObj.hostname;
        if (host.includes('xn--')) host = toUnicode(host);
        setPunycodeOrigin(`${urlObj.protocol}//${host}`);
      } catch (e) {
        setPunycodeOrigin(window.location.origin);
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (isMounted) {
        setUser(user);
        await fetchUrls(session?.access_token);
      }
    };

    initDashboard();

    return () => {
      isMounted = false;
    };
  }, [router, supabase.auth]);

  const fetchUrls = async (token) => {
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/my-urls', { headers });

      if (res.ok) {
        const data = await res.json();
        setUrls(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('URL 불러오기 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // 삭제: API 라우트를 통해 서버에서 권한 검증 후 삭제
  const handleDeleteConfirm = async (item) => {
    const token = await getToken();
    try {
      const res = await fetch(`/api/${encodeURIComponent(item.code)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '삭제 실패');
      }

      setUrls(urls.filter(u => u.id !== item.id));
      showToast('success', '삭제되었습니다.');
    } catch (error) {
      showToast('error', '삭제 중 오류가 발생했습니다.');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // 수정: API 라우트를 통해 서버에서 권한 검증 후 수정
  const handleUpdateUrl = async (e) => {
    e.preventDefault();
    setEditMsg({ type: '', text: '' });
    const token = await getToken();

    try {
      const res = await fetch(`/api/${encodeURIComponent(editModal.originalCode)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newUrl: editModal.url, newCode: editModal.code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditMsg({ type: 'error', text: data.error || '수정에 실패했습니다.' });
        return;
      }

      setUrls(urls.map(u =>
        u.id === editModal.id
          ? { ...u, url: editModal.url, code: editModal.code }
          : u
      ));
      showToast('success', '수정되었습니다.');
      setEditModal({ show: false, id: null, url: '', code: '', originalCode: '' });
    } catch (error) {
      setEditMsg({ type: 'error', text: '수정 중 오류가 발생했습니다.' });
    }
  };

  const openEditModal = (item) => {
    setEditModal({ show: true, id: item.id, url: item.url, code: item.code, originalCode: item.code });
    setEditMsg({ type: '', text: '' });
  };

  // 복사: alert 대신 버튼 아이콘 피드백
  const handleCopy = async (code) => {
    const fullUrl = `${punycodeOrigin || window.location.origin}/${code}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      // 구형 브라우저 폴백
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openQrModal = (code) => {
    const fullUrl = `${window.location.origin}/${code}`;
    setQrModal({ show: true, url: fullUrl, code: code });
  };

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwdForm.current,
      });

      if (signInError) {
        setPwdMsg({ type: 'error', text: '현재 비밀번호가 올바르지 않습니다.' });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: pwdForm.new
      });

      if (updateError) throw updateError;

      setPwdMsg({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setPwdForm({ current: '', new: '', confirm: '' });
      setTimeout(() => setShowPasswordModal(false), 2000);

    } catch (error) {
      setPwdMsg({ type: 'error', text: '비밀번호 변경 실패: ' + error.message });
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div style={{ fontSize: '18px', color: '#666' }}>로딩 중입니다...</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>내 단축 URL 관리</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowPasswordModal(true)} style={{ ...btnStyle, backgroundColor: '#4b5563' }}>
            <FiSettings style={{ marginRight: '5px' }} /> 비번 변경
          </button>
          <button onClick={handleLogout} style={{ ...btnStyle, backgroundColor: '#ef4444' }}>
            <FiLogOut style={{ marginRight: '5px' }} /> 로그아웃
          </button>
        </div>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <Link href="/" style={{ padding: "8px 14px", background: "#636e72", color: "#fff", borderRadius: 6, textDecoration: "none", fontWeight: "bold", fontSize: "0.9rem", display: "inline-block", marginBottom: "1rem" }}>
          🏠 메인으로
        </Link>
        {user && <p style={{ color: '#4b5563' }}>안녕하세요, <strong>{user.email}</strong>님</p>}
      </div>

      <div style={{ display: 'grid', gap: '15px' }}>
        {urls.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            아직 생성한 단축 URL이 없습니다.<br/>
            메인 페이지에서 새로운 주소를 만들어보세요!
          </p>
        ) : (
          urls.map((item) => {
            let displayCode = item.code;
            try {
              if (item.code && item.code.startsWith('xn--')) {
                displayCode = toUnicode(item.code);
              }
            } catch (e) {}

            const isPendingDelete = confirmDeleteId === item.id;

            return (
              <div key={item.id} style={cardStyle}>
                <div style={{ overflow: 'hidden', flex: 1, paddingRight: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '18px' }}>/{displayCode}</span>
                    <span style={badgeStyle}>
                      {item.count || 0}회 클릭
                    </span>
                    {item.expires_at && (
                      <span style={{ ...badgeStyle, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                        {new Date(item.expires_at).toLocaleDateString()} 만료
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '14px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.url}
                  </p>
                </div>

                {isPendingDelete ? (
                  // 인라인 삭제 확인 UI (confirm() 대체)
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', color: '#dc2626', whiteSpace: 'nowrap' }}>정말 삭제할까요?</span>
                    <button
                      onClick={() => handleDeleteConfirm(item)}
                      style={{ ...btnStyle, backgroundColor: '#dc2626', padding: '6px 12px', fontSize: '13px' }}
                    >
                      예
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ ...btnStyle, backgroundColor: '#6b7280', padding: '6px 12px', fontSize: '13px' }}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => openQrModal(item.code)} style={{ ...iconBtnStyle, color: '#4f46e5' }} title="QR코드 보기">
                      <FiGrid />
                    </button>
                    <button
                      onClick={() => handleCopy(item.code)}
                      style={{ ...iconBtnStyle, color: copiedCode === item.code ? '#059669' : '#6b7280' }}
                      title={copiedCode === item.code ? '복사됨!' : '주소 복사'}
                    >
                      {copiedCode === item.code ? <FiCheck /> : <FiCopy />}
                    </button>
                    <button onClick={() => openEditModal(item)} style={{ ...iconBtnStyle, color: '#d97706' }} title="수정">
                      <FiEdit />
                    </button>
                    <button onClick={() => setConfirmDeleteId(item.id)} style={{ ...iconBtnStyle, color: '#dc2626' }} title="삭제">
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 토스트 알림 */}
      {toast.show && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          padding: '12px 20px', borderRadius: '8px', zIndex: 2000,
          backgroundColor: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: toast.type === 'success' ? '#15803d' : '#b91c1c',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: '500',
        }}>
          {toast.text}
        </div>
      )}

      {/* URL 수정 모달 */}
      {editModal.show && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>단축 주소 수정</h3>
              <button onClick={() => setEditModal({...editModal, show: false})} style={closeBtnStyle}><FiX /></button>
            </div>

            <form onSubmit={handleUpdateUrl} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>원본 URL (이동할 곳)</label>
                <input type="url" value={editModal.url} onChange={(e) => setEditModal({...editModal, url: e.target.value})} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>단축 코드 (별칭)</label>
                <input type="text" value={editModal.code} onChange={(e) => setEditModal({...editModal, code: e.target.value})} required style={inputStyle} />
                <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>* 이미 사용 중인 코드는 사용할 수 없습니다.</p>
              </div>

              {editMsg.text && (
                <div style={{
                  padding: '10px', borderRadius: '5px', fontSize: '14px',
                  backgroundColor: editMsg.type === 'error' ? '#fee2e2' : '#dcfce7',
                  color: editMsg.type === 'error' ? '#b91c1c' : '#15803d',
                }}>
                  {editMsg.text}
                </div>
              )}

              <button type="submit" style={{ ...btnStyle, width: '100%', marginTop: '10px' }}>수정 완료</button>
            </form>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>비밀번호 변경</h3>
              <button onClick={() => setShowPasswordModal(false)} style={closeBtnStyle}><FiX /></button>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>현재 비밀번호</label>
                <input type="password" value={pwdForm.current} onChange={(e) => setPwdForm({...pwdForm, current: e.target.value})} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>새 비밀번호</label>
                <input type="password" value={pwdForm.new} onChange={(e) => setPwdForm({...pwdForm, new: e.target.value})} required placeholder="6자 이상 입력" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>새 비밀번호 확인</label>
                <input type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm({...pwdForm, confirm: e.target.value})} required style={inputStyle} />
              </div>

              {pwdMsg.text && (
                <div style={{ padding: '10px', borderRadius: '5px', fontSize: '14px', backgroundColor: pwdMsg.type === 'error' ? '#fee2e2' : '#dcfce7', color: pwdMsg.type === 'error' ? '#b91c1c' : '#15803d' }}>
                  {pwdMsg.text}
                </div>
              )}

              <button type="submit" style={{ ...btnStyle, width: '100%', marginTop: '10px' }}>변경하기</button>
            </form>
          </div>
        </div>
      )}

      {/* QR코드 모달 */}
      {qrModal.show && (
        <div style={modalOverlayStyle} onClick={() => setQrModal({ ...qrModal, show: false })}>
          <div style={{ ...modalContentStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>QR 코드</h3>
              <button onClick={() => setQrModal({ ...qrModal, show: false })} style={closeBtnStyle}><FiX /></button>
            </div>

            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
              <QRCodeCanvas
                value={qrModal.url}
                size={200}
                level={"H"}
                bgColor="#ffffff"
                fgColor="#000000"
                imageSettings={{ src: "/qrlogo2.png", height: 40, width: 40, excavate: true }}
              />
            </div>
            <p style={{ color: '#666', marginBottom: '20px' }}>/{qrModal.code}</p>
            <button onClick={() => setQrModal({ ...qrModal, show: false })} style={{ ...btnStyle, width: '100%' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = { padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '500' };
const iconBtnStyle = { background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', cursor: 'pointer', fontSize: '20px', transition: 'background 0.2s' };
const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const badgeStyle = { fontSize: '12px', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '5px', color: '#374151' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const closeBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#6b7280' };
