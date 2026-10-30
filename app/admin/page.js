'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { isAdmin, TIERS, TIER_ORDER } from '../../lib/constants';
import BookAwardBadge from '../../components/BookAwardBadge';

// 리본 문구 원클릭 입력 칩
const RIBBON_PRESETS = ['교육 베스트 1위', '사회 정치 TOP20', '종합 베스트 1위', '주간 베스트 1위'];

// 바이트 → 사람이 읽는 단위 (드롭 총 용량 카드)
function formatBytes(n) {
  if (n === undefined || n === null) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// 한도 숫자 표기 (null = 무제한)
function fmtLimit(v) { return v === null || v === undefined ? '무제한' : String(v); }

// 사용자 목록의 「등급」「한도」 칸. 등급 select + 개별 한도 입력(빈칸 = 등급 기본, "무제한" = 무제한)
function TierCell({ user, token, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ urls: '', drops: '', db: '' });
  const admin = isAdmin(user.email);
  const base = TIERS[user.tier] || TIERS.basic;
  const custom = user.customLimits || {};

  const parse = (text) => {
    const t = String(text).trim();
    if (t === '') return undefined;              // 등급 기본값
    if (/^(무제한|∞|unlimited)$/i.test(t)) return null; // 무제한
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };

  const save = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/tier`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || '저장에 실패했습니다.'); return; }
      onSaved(user.id, data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    const show = (k) => (Object.prototype.hasOwnProperty.call(custom, k) ? (custom[k] === null ? '무제한' : String(custom[k])) : '');
    setDraft({ urls: show('urls'), drops: show('drops'), db: show('db') });
    setEditing(true);
  };

  const saveLimits = () => {
    const limits = {};
    for (const k of ['urls', 'drops', 'db']) {
      const v = parse(draft[k]);
      if (v !== undefined) limits[k] = v;
    }
    save({ limits: Object.keys(limits).length ? limits : null });
  };

  const inputStyle = { width: '64px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' };
  const smallBtn = (bg) => ({ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: bg, color: 'white', fontSize: '12px', cursor: 'pointer' });

  return (
    <>
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        {admin ? (
          <span style={{ fontSize: '12px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>관리자</span>
        ) : (
          <select
            value={user.tier}
            disabled={saving}
            onChange={(e) => save({ tier: e.target.value })}
            style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
          >
            {TIER_ORDER.filter((t) => t !== 'admin').map((t) => (
              <option key={t} value={t}>{TIERS[t].label}</option>
            ))}
          </select>
        )}
      </td>
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '13px', color: '#374151' }}>
        {admin ? (
          <span style={{ color: '#9ca3af' }}>무제한</span>
        ) : editing ? (
          <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <input style={inputStyle} placeholder={fmtLimit(base.urls)} value={draft.urls} onChange={(e) => setDraft({ ...draft, urls: e.target.value })} title="URL" />
            <input style={inputStyle} placeholder={fmtLimit(base.drops)} value={draft.drops} onChange={(e) => setDraft({ ...draft, drops: e.target.value })} title="누리집" />
            <input style={inputStyle} placeholder={fmtLimit(base.db)} value={draft.db} onChange={(e) => setDraft({ ...draft, db: e.target.value })} title="곳간 표" />
            <button type="button" onClick={saveLimits} disabled={saving} style={smallBtn('#2563eb')}>{saving ? '저장 중' : '저장'}</button>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} style={smallBtn('#9ca3af')}>취소</button>
          </span>
        ) : (
          <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            <span>URL {fmtLimit(user.limits?.urls)} · 누리집 {fmtLimit(user.limits?.drops)} · 곳간 {fmtLimit(user.limits?.db)}</span>
            {user.limits?.custom && (
              <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '10px' }}>개별</span>
            )}
            <button type="button" onClick={startEdit} style={{ ...smallBtn('#e5e7eb'), color: '#374151' }}>수정</button>
          </span>
        )}
      </td>
    </>
  );
}

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
  const emptyAward = { enabled: false, rank: '', ribbon: '', caption1: '', caption2: '', tone: 'gold' };
  const emptyBook = { title: '', author: '', url: '', cover: '', award: { ...emptyAward } };
  const [books, setBooks] = useState([{ ...emptyBook }, { ...emptyBook }, { ...emptyBook }].map(b => ({ ...b, award: { ...emptyAward } })));
  const [savingBooks, setSavingBooks] = useState(false);

  useEffect(() => {
    const init = async () => {
      // getSession()은 로컬 캐시에서 즉시 읽어 네트워크 오류 없이 안정적으로 동작
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !isAdmin(session.user?.email)) {
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
            return {
              title: r.title || '', author: r.author || '', url: r.url || '', cover: r.cover || '',
              award: {
                enabled: !!(r.award_rank && r.award_ribbon),
                rank: r.award_rank ? String(r.award_rank) : '',
                ribbon: r.award_ribbon || '',
                caption1: r.award_caption1 || '',
                caption2: r.award_caption2 || '',
                tone: r.award_tone || 'gold',
              },
            };
          }));
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const applyTierSaved = (id, data) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, tier: data.tier, limits: data.limits, customLimits: data.customLimits } : u)));
  };

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

  // 수상 마크 입력값 수정
  const updateAward = (i, field, value) => {
    setBooks(prev => prev.map((b, idx) => (idx === i ? { ...b, award: { ...b.award, [field]: value } } : b)));
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

      {/* 요약 카드: 단축 URL / 누리집 펴내기 / 기록 곳간 */}
      {[
        {
          title: '단축 URL',
          cards: [
            { label: '전체 URL', value: stats?.totalUrls ?? '-', color: '#2563eb' },
            { label: '전체 사용자', value: stats?.totalUsers ?? '-', color: '#7c3aed' },
            { label: '전체 클릭', value: (stats?.totalClicks ?? 0).toLocaleString(), color: '#059669' },
            { label: '오늘 생성', value: stats?.urlsToday ?? '-', color: '#d97706' },
          ],
        },
        {
          title: '누리집 펴내기',
          cards: [
            { label: '전체 배포', value: stats?.drops?.total ?? '-', color: '#2563eb' },
            { label: '오늘 배포', value: stats?.drops?.today ?? '-', color: '#d97706' },
            { label: '총 조회', value: (stats?.drops?.views ?? 0).toLocaleString(), color: '#059669' },
            { label: '총 용량', value: formatBytes(stats?.drops?.bytes), color: '#7c3aed' },
          ],
        },
        {
          title: '기록 곳간',
          note: stats && !stats.db ? '기록 곳간 서버가 응답하지 않습니다.' : null,
          cards: [
            { label: '전체 표', value: stats?.db?.tables ?? '-', color: '#2563eb' },
            { label: '전체 기록(행)', value: (stats?.db?.rows ?? 0).toLocaleString(), color: '#059669' },
            { label: '사용 교사', value: stats?.db?.owners ?? '-', color: '#7c3aed' },
            { label: '오늘 기록', value: stats?.db?.rowsToday ?? '-', color: '#d97706' },
          ],
        },
      ].map(({ title, note, cards }) => (
        <div key={title} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#6b7280', marginBottom: '10px' }}>
            {title}
            {note && <span style={{ marginLeft: '10px', fontWeight: 'normal', color: '#dc2626' }}>{note}</span>}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {cards.map(({ label, value, color }) => (
              <div key={label} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}` }}>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{label}</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 최근 30일 추이: 생성 수(URL·드롭·DB 표) / 기록 곳간 기록 수 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '32px', marginTop: '8px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>최근 30일 생성 추이</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.daily || []} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => [`${v}개`, name]} labelFormatter={(l) => `날짜: ${l}`} contentStyle={{ fontSize: '13px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="urls" name="단축 URL" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="drops" name="누리집 펴내기" fill="#d97706" radius={[3, 3, 0, 0]} />
              <Bar dataKey="dbTables" name="기록 곳간 표" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>최근 30일 기록 곳간 기록 추이</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.daily || []} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}건`, '기록']} labelFormatter={(l) => `날짜: ${l}`} contentStyle={{ fontSize: '13px' }} />
              <Bar dataKey="dbRows" name="기록" fill="#059669" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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

              {/* 수상 마크 */}
              <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px dashed #e5e7eb' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    checked={book.award.enabled}
                    onChange={e => updateAward(i, 'enabled', e.target.checked)}
                  />
                  🏆 수상 마크 표시
                </label>

                {book.award.enabled && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* 입력 필드 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={book.award.rank}
                        placeholder="순위 숫자 (1~99)"
                        onChange={e => updateAward(i, 'rank', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box' }}
                      />
                      <input
                        type="text"
                        maxLength={14}
                        value={book.award.ribbon}
                        placeholder="리본 문구 (예: 교육 베스트 1위)"
                        onChange={e => updateAward(i, 'ribbon', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      <div style={{ fontSize: '11px', textAlign: 'right', margin: '2px 0 6px', color: book.award.ribbon.length > 9 ? '#ea580c' : '#9ca3af' }}>
                        {book.award.ribbon.length}/14{book.award.ribbon.length > 9 ? ' — 9자 이하 권장' : ''}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {RIBBON_PRESETS.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => updateAward(i, 'ribbon', preset)}
                            style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', border: '1px solid #d1d5db', backgroundColor: book.award.ribbon === preset ? '#eff6ff' : 'white', color: '#374151', cursor: 'pointer' }}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        maxLength={30}
                        value={book.award.caption1}
                        placeholder="부가 설명 1 (예: 예스24 '26.8.23)"
                        onChange={e => updateAward(i, 'caption1', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box' }}
                      />
                      <input
                        type="text"
                        maxLength={30}
                        value={book.award.caption2}
                        placeholder="부가 설명 2 (예: 일간 기준)"
                        onChange={e => updateAward(i, 'caption2', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box' }}
                      />
                      <select
                        value={book.award.tone}
                        onChange={e => updateAward(i, 'tone', e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box', backgroundColor: 'white' }}
                      >
                        <option value="gold">금 (gold)</option>
                        <option value="silver">은 (silver)</option>
                        <option value="bronze">동 (bronze)</option>
                      </select>
                    </div>

                    {/* 실시간 미리보기 — 카드와 같은 BookAwardBadge 재사용 */}
                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      <BookAwardBadge
                        rank={book.award.rank || '1'}
                        ribbon={book.award.ribbon || '리본 문구'}
                        captions={[book.award.caption1, book.award.caption2]}
                        tone={book.award.tone}
                        width={140}
                      />
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', width: '140px' }}>
                        실제 카드에서는 108px로 표시됩니다
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
              사용자 목록 ({filteredUsers.length}명)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
              등급 기본 한도 (URL · 누리집 · 곳간 표):{' '}
              {TIER_ORDER.map((t) => `${TIERS[t].label} ${fmtLimit(TIERS[t].urls)}·${fmtLimit(TIERS[t].drops)}·${fmtLimit(TIERS[t].db)}`).join(' / ')}
              {' '}· 등급을 안 정한 계정은 @usedu.ai.kr·울산 소속이면 울산, 아니면 일반
            </p>
          </div>
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
                {['이메일', '가입일', '등급', '한도 (URL · 누리집 · 곳간)', 'URL 수', '총 클릭', '누리집 수', '누리집 조회', '곳간 표 수'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', color: '#1f2937' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <TierCell user={u} token={token} onSaved={applyTierSaved} />
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#2563eb' }}>{u.urlCount}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{u.totalClicks.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#d97706' }}>{u.dropCount ?? 0}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{(u.dropViews ?? 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#7c3aed' }}>
                    {stats?.db ? (stats.db.byOwner?.[u.id]?.tables ?? 0) : '-'}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>검색 결과가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
