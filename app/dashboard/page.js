'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { FiCopy, FiTrash2, FiLogOut, FiSettings, FiX, FiGrid, FiEdit } from 'react-icons/fi';
import { QRCodeCanvas } from 'qrcode.react';
import { toUnicode } from 'punycode'; 

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  // QR코드 모달 상태
  const [qrModal, setQrModal] = useState({ show: false, url: '', code: '' });

  // URL 수정 모달 상태
  const [editModal, setEditModal] = useState({ show: false, id: null, url: '', code: '' });

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    // [수정 포인트] 로그인 상태 확인 로직을 안정적으로 개선
    const initDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 세션이 없으면 로그인 페이지로 튕겨냄
        router.push('/login');
        return;
      }
      
      // 세션이 있으면 유저 정보 저장 및 데이터 불러오기
      setUser(session.user);
      await fetchUrls(session.access_token);
    };

    initDashboard();
  }, []);

  // [수정 포인트] 위에서 확인한 토큰을 바로 전달받아 사용하도록 수정
  const fetchUrls = async (token) => {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('urls').delete().eq('id', id);
      if (error) throw error;
      setUrls(urls.filter(u => u.id !== id));
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // URL 수정 저장 함수
  const handleUpdateUrl = async (e) => {
    e.preventDefault();
    try {
      if (editModal.code) {
         const { error } = await supabase
           .from('urls')
           .update({ 
             url: editModal.url, 
             code: editModal.code 
           })
           .eq('id', editModal.id);

         if (error) throw error;

         setUrls(urls.map(u => 
           u.id === editModal.id 
             ? { ...u, url: editModal.url, code: editModal.code } 
             : u
         ));
         alert('수정되었습니다.');
         setEditModal({ show: false, id: null, url: '', code: '' });
      }
    } catch (error) {
      if (error.code === '23505') {
        alert('이미 사용 중인 단축 코드입니다. 다른 코드를 입력해주세요.');
      } else {
        alert('수정 중 오류가 발생했습니다: ' + error.message);
      }
    }
  };

  // 수정 모달 열기
  const openEditModal = (item) => {
    setEditModal({ 
      show: true, 
      id: item.id, 
      url: item.url, 
      code: item.code 
    });
  };

  const handleCopy = (code) => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    let displayHost = host;

    try {
      if (host.includes('xn--')) {
        displayHost = toUnicode(host);
      }
    } catch (e) {
      if (host.includes('xn--vhq94y')) displayHost = '외솔.한국'; 
    }

    const fullUrl = `${protocol}//${displayHost}/${code}`;

    navigator.clipboard.writeText(fullUrl).then(() => {
      alert(`복사되었습니다:\n${fullUrl}`);
    }).catch(() => {
      prompt("이 주소를 복사하세요:", fullUrl);
    });
  };

  const openQrModal = (code) => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const fullUrl = `${protocol}//${host}/${code}`;
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

  if (loading) return <div className="p-8 text-center">로딩 중...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
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

      <div style={{ display: 'grid', gap: '15px' }}>
        {urls.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            아직 생성한 단축 URL이 없습니다.<br/>
            메인 페이지에서 새로운 주소를 만들어보세요!
          </p>
        ) : (
          urls.map((item) => (
            <div key={item.id} style={cardStyle}>
              <div style={{ overflow: 'hidden', flex: 1, paddingRight: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '18px' }}>/{item.code}</span>
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
              
              <div style={{ display: 'flex', gap: '8px' }}>
                 <button 
                  onClick={() => openQrModal(item.code)}
                  style={{ ...iconBtnStyle, color: '#4f46e5' }}
                  title="QR코드 보기"
                >
                  <FiGrid />
                </button>

                <button 
                  onClick={() => handleCopy(item.code)}
                  style={{ ...iconBtnStyle, color: '#059669' }}
                  title="주소 복사"
                >
                  <FiCopy />
                </button>

                <button 
                  onClick={() => openEditModal(item)}
                  style={{ ...iconBtnStyle, color: '#d97706' }}
                  title="수정"
                >
                  <FiEdit />
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
                <input 
                  type="url" 
                  value={editModal.url}
                  onChange={(e) => setEditModal({...editModal, url: e.target.value})}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>단축 코드 (별칭)</label>
                <input 
                  type="text" 
                  value={editModal.code}
                  onChange={(e) => setEditModal({...editModal, code: e.target.value})}
                  required
                  style={inputStyle}
                />
                <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                  * 이미 사용 중인 코드는 사용할 수 없습니다.
                </p>
              </div>

              <button type="submit" style={{ ...btnStyle, width: '100%', marginTop: '10px' }}>
                수정 완료
              </button>
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
                imageSettings={{
                    src: "/qrlogo2.png",
                    height: 40,
                    width: 40,
                    excavate: true,
                }}
              />
            </div>
            <p style={{ color: '#666', marginBottom: '20px' }}>/{qrModal.code}</p>
            <button 
              onClick={() => setQrModal({ ...qrModal, show: false })}
              style={{ ...btnStyle, width: '100%' }}
            >
              닫기
            </button>
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
  padding: '10px', cursor: 'pointer', fontSize: '20px', transition: 'background 0.2s'
};

const cardStyle = {
  backgroundColor: 'white', padding: '20px', borderRadius: '12px', 
  border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

const badgeStyle = {
  fontSize: '12px', color: '#4b5563', backgroundColor: '#f3f4f6', 
  padding: '2px 8px', borderRadius: '12px', fontWeight: '500'
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
  backgroundColor: 'white', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '400px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
};

const modalHeaderStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'
};

const closeBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#6b7280'
};