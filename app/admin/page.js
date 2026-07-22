'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ADMIN_EMAIL } from '../../lib/constants';

export default function AdminPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [token, setToken] = useState(null);
  const [reportMonth, setReportMonth] = useState(() => {
    // 기본값: 지난달 (보고서는 보통 전월 기준)
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [downloading, setDownloading] = useState(false);
  const emptyBook = { title: '', author: '', url: '', cover: '' };
  const [books, setBooks] = useState([{ ...emptyBook }, { ...emptyBook }, { ...emptyBook }]);
  const [savingBooks, setSavingBooks] = useState(false);

  useEffect(() => {
    const init = async () => {
      // getSession()은 로컬 캐시에서 즉시 읽어 네트워크 오류 없이 안정적으로 동작
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || session.user?.email !== ADMIN_EMAIL) {
        router.push('/');
        return;
      }

      const token = session.access_token;
      setToken(token);
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, usersRes, booksRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/books'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (booksRes.ok) {
        const rows = await booksRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          setBooks([1, 2, 3].map(p => {
            const r = rows.find(x => x.position === p) || {};
            return { title: r.title || '', author: r.author || '', url: r.url || '', cover: r.cover || '' };
          }));
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // 월간 통계 보고서(xlsx) 다운로드
  const downloadReport = async () => {
    if (!token || !reportMonth) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/report?month=${reportMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        alert(error || '보고서 생성에 실패했습니다.');
        return;
      }
      const blob = await res.blob();
      const [year, month] = reportMonth.split('-');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `외솔.한국 단축URL 이용 통계(${year}년 ${Number(month)}월).xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  };

  // 추천도서 입력값 수정
  const updateBook = (i, field, value) => {
    setBooks(prev => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  };

  // 추천도서 저장
  const saveBooks = async () => {
    if (!token) return;
    setSavingBooks(true);
    try {
      const res = await fetch('/api/admin/books', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(books),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || '저장에 실패했습니다.');
        return;
      }
      alert('추천도서가 저장되었습니다. 메인 화면에 바로 반영됩니다.');
    } finally {
      setSavingBooks(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', fontSize: '18px', color: '#666' }}>
      로딩 중...
    </div>
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold' }}>🛠 관리자 대시보드</h1>
        <Link href="/" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none' }}>← 메인으로</Link>
      </div>

      {/* 요약 카드 4개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: '전체 URL', value: stats?.totalUrls ?? '-', color: '#2563eb' },
          { label: '전체 사용자', value: stats?.totalUsers ?? '-', color: '#7c3aed' },
          { label: '전체 클릭', value: (stats?.totalClicks ?? 0).toLocaleString(), color: '#059669' },
          { label: '오늘 생성', value: stats?.urlsToday ?? '-', color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}` }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{label}</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 일별 URL 생성 차트 */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>최근 30일 URL 생성 추이</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats?.dailyUrls || []} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v) => [`${v}개`, '생성']}
              labelFormatter={(l) => `날짜: ${l}`}
              contentStyle={{ fontSize: '13px' }}
            />
            <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 월간 보고서 다운로드 */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>📊 월간 이용 통계 보고서</h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          선택한 월의 단축URL별 이용 현황과 일별 추이를 엑셀 파일로 내려받습니다. (교육청 보고용)
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="month"
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
          />
          <button
            onClick={downloadReport}
            disabled={downloading || !reportMonth}
            style={{
              padding: '9px 18px', borderRadius: '6px', border: 'none',
              backgroundColor: downloading ? '#93c5fd' : '#2563eb', color: 'white',
              fontSize: '14px', fontWeight: '600', cursor: downloading ? 'default' : 'pointer',
            }}
          >
            {downloading ? '생성 중...' : '엑셀 다운로드'}
          </button>
        </div>
      </div>

      {/* 금주의 추천도서 관리 */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px', color: '#1f2937' }}>📚 금주의 추천도서 관리</h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          메인 화면에 표시되는 추천도서 3권입니다. 제목을 비워 두면 해당 자리는 &quot;준비 중&quot;으로 표시됩니다.
          표지는 이미지 주소(서점 표지 이미지 우클릭 → 이미지 주소 복사)를 붙여넣으세요.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {books.map((book, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>{i + 1}번 도서</span>
                {book.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.cover} alt="표지 미리보기" width={32} height={40} style={{ objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                )}
              </div>
              {[
                { field: 'title', placeholder: '책 제목' },
                { field: 'author', placeholder: '지은이' },
                { field: 'url', placeholder: '책 소개 링크 (https://...)' },
                { field: 'cover', placeholder: '표지 이미지 주소 (선택)' },
              ].map(({ field, placeholder }) => (
                <input
                  key={field}
                  type="text"
                  value={book[field]}
                  placeholder={placeholder}
                  onChange={e => updateBook(i, field, e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box' }}
                />
              ))}
            </div>
          ))}
        </div>
        <button
          onClick={saveBooks}
          disabled={savingBooks}
          style={{
            padding: '9px 18px', borderRadius: '6px', border: 'none',
            backgroundColor: savingBooks ? '#93c5fd' : '#2563eb', color: 'white',
            fontSize: '14px', fontWeight: '600', cursor: savingBooks ? 'default' : 'pointer',
          }}
        >
          {savingBooks ? '저장 중...' : '추천도서 저장'}
        </button>
      </div>

      {/* 사용자 목록 */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
            사용자 목록 ({filteredUsers.length}명)
          </h2>
          <input
            type="text"
            placeholder="이메일 검색..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', width: '220px' }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {['이메일', '가입일', 'URL 수', '총 클릭'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', color: '#1f2937' }}>
                    {u.email}
                    {u.email === ADMIN_EMAIL && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: '10px' }}>관리자</span>
                    )}
                    {u.email.endsWith('@usedu.ai.kr') && u.email !== ADMIN_EMAIL && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', backgroundColor: '#dbeafe', color: '#2563eb', padding: '1px 6px', borderRadius: '10px' }}>교원</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#2563eb' }}>{u.urlCount}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{u.totalClicks.toLocaleString()}</td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>검색 결과가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
