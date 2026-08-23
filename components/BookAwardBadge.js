import { useId } from 'react';

// 수상 마크 색상 톤 (mark/make_badge.py 와 동일한 값)
export const AWARD_TONES = {
  gold:   { light: '#FFF8DC', mid: '#F0CC6E', dark: '#B8912F', text: '#2B1204', caption: '#8A6A2A' },
  silver: { light: '#F7F9FB', mid: '#D2D8DE', dark: '#98A2AC', text: '#20262B', caption: '#6B747C' },
  bronze: { light: '#F8DFC4', mid: '#DDA46A', dark: '#A9713C', text: '#2E1708', caption: '#8A5A2E' },
};

// 월계수 잎 모양 — 끝이 위·바깥으로 휜 형태 (좌표는 make_badge.py 기준)
const LEAF = 'M0,0 C14,-23 48,-31 86,-11 C84,-6 82,-2 80,1 C54,15 16,19 0,0 Z';
const VEIN = 'M4,-1 C28,-4 58,-9 80,-9';

// 바깥(앞) 가지 / 안쪽(뒤) 가지 파라미터
const OUTER = { dr: 0,   a0: 24, a1: 156, n: 11, smin: 0.54, smax: 0.84, tilt: 18, grad: 'lg',  off: 0 };
const INNER = { dr: -14, a0: 32, a1: 150, n: 9,  smin: 0.44, smax: 0.64, tilt: 32, grad: 'lg2', off: 0.5 };

function buildBranch(cx, cy, R0, side, p) {
  const R = R0 + p.dr;
  const stem = [];
  for (let i = 0; i <= 60; i++) {
    const a = ((p.a0 + (p.a1 - p.a0) * (i / 60)) * Math.PI) / 180;
    stem.push(`${(cx + side * R * Math.sin(a)).toFixed(1)},${(cy - R * Math.cos(a)).toFixed(1)}`);
  }
  const leaves = [];
  for (let i = 0; i < p.n; i++) {
    const t = (i + p.off) / (p.n - 1 + p.off);
    const deg = p.a0 + (p.a1 - p.a0) * t;
    const a = (deg * Math.PI) / 180;
    const h = deg + 180 + p.tilt;
    leaves.push({
      x: cx + side * R * Math.sin(a),
      y: cy - R * Math.cos(a),
      rot: side === 1 ? h : 180 - h,
      s: p.smin + (p.smax - p.smin) * Math.sin(Math.PI * (0.18 + 0.82 * t)),
      grad: p.grad,
      key: `${p.grad}-${side}-${i}`,
    });
  }
  return { stem: stem.join(' '), leaves };
}

// 잎 좌표는 상수이므로 모듈 로드 시 1회만 계산
// 그리는 순서: 좌·우 각각 안쪽(INNER) 먼저, 바깥(OUTER) 나중 — 겹침 표현
const BRANCHES = [-1, 1].flatMap((side) =>
  [INNER, OUTER].map((p) => buildBranch(390, 420, 300, side, p))
);

// 대략적인 렌더 폭 추정 (한글 ≈ 1em, 영문·숫자 ≈ 0.55em) — 넘침 방지용
function estTextWidth(text, fontSize) {
  let units = 0;
  for (const ch of text) units += ch.charCodeAt(0) > 0x2e80 ? 1 : 0.55;
  return units * fontSize;
}

// 추정 폭이 한도를 넘으면 textLength로 글자 간격을 압축해 잘림을 막는다
function fitProps(text, fontSize, maxWidth) {
  return estTextWidth(text, fontSize) > maxWidth
    ? { textLength: maxWidth, lengthAdjust: 'spacingAndGlyphs' }
    : {};
}

/**
 * 세로형 월계관 수상 마크 (인라인 SVG)
 *
 * @param {object}   props
 * @param {string}   props.rank      월계관 안 숫자. "1", "2", "10" 등
 * @param {string}   props.ribbon    리본 문구. 예: "교육 베스트 1위" (권장 9자, 최대 14자)
 * @param {string[]} [props.captions] 리본 아래 부가 설명. 최대 2줄
 * @param {number}   [props.width]   렌더링 가로 폭(px). 기본 108
 * @param {'gold'|'silver'|'bronze'} [props.tone] 색상 톤. 기본 'gold'
 * @param {string}   [props.className]
 */
export default function BookAwardBadge({
  rank,
  ribbon,
  captions,
  width = 108,
  tone = 'gold',
  className,
}) {
  const uid = useId();
  const t = AWARD_TONES[tone] || AWARD_TONES.gold;
  const D = t.dark;
  const caps = (captions || []).map((c) => String(c || '').trim()).filter(Boolean).slice(0, 2);

  // viewBox: 가로 240 고정, 세로는 캡션 수에 따라 288 / 310 / 340
  const H = caps.length === 0 ? 288 : caps.length === 1 ? 310 : 340;
  const capY = caps.length === 1 ? [308] : [304, 326];

  // 리본 글자 자동 축소
  const rbText = String(ribbon || '');
  const rf = rbText.length <= 8 ? 22 : rbText.length <= 11 ? 18 : 15;

  // 한 페이지에 배지가 여러 개 떠도 그라디언트 id가 충돌하지 않도록 고유화
  const gid = (name) => `award-${uid}-${name}`;

  const label = `${rbText}${caps.length ? ', ' + caps.join(', ') : ''}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      viewBox={`0 0 240 ${H}`}
      role="img"
      aria-label={label}
      className={className}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={gid('lg')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={t.light} />
          <stop offset="45%" stopColor={t.mid} />
          <stop offset="100%" stopColor={t.dark} />
        </linearGradient>
        <linearGradient id={gid('lg2')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={t.mid} />
          <stop offset="100%" stopColor={t.dark} />
        </linearGradient>
        <linearGradient id={gid('rb')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.light} />
          <stop offset="50%" stopColor={t.mid} />
          <stop offset="100%" stopColor={t.dark} />
        </linearGradient>
      </defs>

      {/* 월계관 + 순위 숫자 */}
      <g transform="translate(0,10) scale(0.3) translate(10,0)">
        {BRANCHES.map((br, bi) => (
          <g key={bi}>
            <polyline
              points={br.stem}
              fill="none"
              stroke={D}
              strokeWidth={7}
              strokeLinecap="round"
              opacity={0.95}
            />
            {br.leaves.map((lf) => (
              <g
                key={lf.key}
                transform={`translate(${lf.x.toFixed(2)},${lf.y.toFixed(2)}) rotate(${lf.rot.toFixed(2)}) scale(${lf.s.toFixed(3)})`}
              >
                <path d={LEAF} fill={`url(#${gid(lf.grad)})`} stroke={D} strokeWidth={2.6} strokeLinejoin="round" />
                <path d={VEIN} fill="none" stroke={D} strokeWidth={2} opacity={0.5} />
              </g>
            ))}
          </g>
        ))}
        <text
          x="390"
          y="528"
          fontSize="300"
          fontWeight="900"
          fill={`url(#${gid('lg')})`}
          stroke={D}
          strokeWidth={7}
          textAnchor="middle"
        >
          {rank}
        </text>
      </g>

      {/* 리본 */}
      <path
        d="M22,232 L218,232 L204,255 L218,278 L22,278 L36,255 Z"
        fill={`url(#${gid('rb')})`}
        stroke={D}
        strokeWidth={2}
      />
      <text x="120" y="263" fontSize={rf} fontWeight="900" fill={t.text} textAnchor="middle" {...fitProps(rbText, rf, 164)}>
        {rbText}
      </text>

      {/* 부가 설명 (최대 2줄) */}
      {caps.map((ln, i) => (
        <text key={i} x="120" y={capY[i]} fontSize="17" fontWeight="700" fill={t.caption} textAnchor="middle" {...fitProps(ln, 17, 228)}>
          {ln}
        </text>
      ))}
    </svg>
  );
}
