'use client';

import { getLimits } from '../lib/constants';

// 등급별 배지 색 (관리자 → 외솔 → 한국 → 연수 → 교원 → 일반)
const TONES = {
  admin:    { bg: '#fee2e2', fg: '#b91c1c' },
  vvip:     { bg: '#ede9fe', fg: '#6d28d9' },
  vip:      { bg: '#dbeafe', fg: '#1d4ed8' },
  training: { bg: '#dcfce7', fg: '#15803d' },
  teacher:  { bg: '#e0f2fe', fg: '#0369a1' },
  basic:    { bg: '#f3f4f6', fg: '#4b5563' },
};

const fmt = (v) => (v === null || v === undefined ? '무제한' : `${v}개`);

/**
 * 로그인한 계정의 등급 배지. 헤더·첫 화면·대시보드 위쪽에 같은 모양으로 보인다.
 * 마우스를 올리면 한도(URL·누리집·곳간 표)가 보인다.
 * @param {{ user: object|null, size?: 'sm'|'md' }} props
 */
export default function TierBadge({ user, size = 'sm' }) {
  if (!user) return null;
  const limits = getLimits(user);
  const tone = TONES[limits.tier] || TONES.basic;
  const title = `${limits.label} 등급 · URL ${fmt(limits.urls)} · 누리집 ${fmt(limits.drops)} · 곳간 표 ${fmt(limits.db)}`;
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'md' ? '3px 10px' : '2px 8px',
        borderRadius: '999px',
        backgroundColor: tone.bg,
        color: tone.fg,
        fontSize: size === 'md' ? '13px' : '12px',
        fontWeight: 700,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {limits.label}
    </span>
  );
}
