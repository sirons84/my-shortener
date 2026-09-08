/* 우리말 지키기 — 도트 그림.
   글자(낱말)는 DOM 이 맡고, 여기는 그 뒤에 깔리는 흙길·담장과 탑 스프라이트만 그린다.

   배경은 화면 4픽셀을 도트 하나로 삼아 작은 캔버스에 그리고 CSS 가 키운다.
   탑 스프라이트는 한 번 그려 data URL 로 만들어 <img> 에 꽂는다. 그림 파일은 없다. */

export const PX = 4; // 배경 도트 하나의 화면 픽셀 수
export const SPRITE_SCALE = 3; // 탑 스프라이트 배율

const C = {
  K: '#1f1d1a',
  W: '#faf8f2',
  R: '#8a3b2e',
  B: '#5a3d24',
  b: '#c9a878',
  M: '#8c8577',
  m: '#b5ad9c',
  dirt: '#dfd2ae',
  dirt2: '#cfc09a',
  dirt3: '#e9dfc2',
  pebble: '#b3a88e',
  roof: '#6f6a60',
  roof2: '#57534a',
  roofLight: '#8f8a7d',
};

// 장승. 위 자리에 선다
export const JANGSEUNG = [
  '....BBBBBBBB....',
  '...BbbbbbbbbB...',
  '...BbbbbbbbbB...',
  '....BBBBBBBB....',
  '....BbbbbbbB....',
  '....BbWWbWWB....',
  '....BbWKbWKB....',
  '....BbbbbbbB....',
  '....BbbKKbbB....',
  '....BbbbbbbB....',
  '....BKKKKKKB....',
  '....BbKbbKbB....',
  '....BbbbbbbB....',
  '....BbbbbbbB....',
  '....BbbbbbbB....',
  '....BbbbbbbB....',
  '....BbbbbbbB....',
  '....BbbbbbbB....',
  '....BbbbbbbB....',
  '....BbbbbbbB....',
  '....BbbbbbbB....',
  '...KKKKKKKKKK...',
  '..KMMMMMMMMMMK..',
  '..KKKKKKKKKKKK..',
];

// 돌탑. 아래 자리에 선다
export const STONE = [
  '.......KK.......',
  '......KMMK......',
  '......KmMK......',
  '.....KMMMMK.....',
  '....KMmMMMMK....',
  '....KMMMMMMK....',
  '.....KKKKKK.....',
  '...KMMMMMMMMK...',
  '..KMmMMMMMMMMK..',
  '..KMMMMMMMMMMK..',
  '...KKKKKKKKKK...',
  '..KMMMMMMMMMMK..',
  '.KMMmMMMMMMMMMK.',
  '.KMMMMMMMMMMMMK.',
  '..KKKKKKKKKKKK..',
  '.KMMMMMMMMMMMMK.',
  'KMmMMMMMMMMMMMMK',
  'KMMMMMMMMMMMMMMK',
  'KKKKKKKKKKKKKKKK',
];

/** 문자열 스프라이트를 data URL 로 (브라우저에서만) */
export function spriteUrl(rows, scale = SPRITE_SCALE) {
  if (typeof document === 'undefined') return '';
  const w = rows[0].length;
  const h = rows.length;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = C[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  return canvas.toDataURL();
}

function hash(x, y, salt = 0) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) % 1000;
}

/** 기와 담장 한 줄(가로) 또는 한 기둥(세로) */
function roof(ctx, x, y, w, h) {
  ctx.fillStyle = C.roof;
  ctx.fillRect(x, y, w, h);
  for (let r = 0; r < h; r += 4) {
    const shift = (r / 4) % 2 === 0 ? 0 : 2;
    for (let c = -2; c < w; c += 4) {
      const from = Math.max(0, c + shift);
      const to = Math.min(w, c + shift + 4);
      if (to > from && r + 3 < h) {
        ctx.fillStyle = C.roof2;
        ctx.fillRect(x + from, y + r + 3, to - from, 1);
      }
      const lf = Math.max(0, c + shift + 1);
      const lt = Math.min(w, c + shift + 3);
      if (lt > lf) {
        ctx.fillStyle = C.roofLight;
        ctx.fillRect(x + lf, y + r, lt - lf, 1);
      }
    }
  }
}

/**
 * 판 배경. 흙길 세 갈래, 사이사이 담장 기둥, 맨 아래 마을 담장.
 * @param {HTMLCanvasElement} canvas
 * @param {{lanes:number, width:number, height:number}} size 화면 픽셀
 */
export function drawScene(canvas, { lanes, width, height }) {
  const w = Math.max(1, Math.ceil(width / PX));
  const h = Math.max(1, Math.ceil(height / PX));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 흙길
  ctx.fillStyle = C.dirt;
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const n = hash(x, y, 1);
      if (n < 45) {
        ctx.fillStyle = C.dirt2;
        ctx.fillRect(x, y, 2, 1);
      } else if (n < 62) {
        ctx.fillStyle = C.dirt3;
        ctx.fillRect(x, y, 1, 1);
      } else if (n < 65) {
        ctx.fillStyle = C.pebble;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  // 멀리(위쪽)는 어둡게. 길이 저 너머에서 내려온다
  for (let y = 0; y < 10; y += 1) {
    ctx.fillStyle = `rgba(31, 29, 26, ${0.22 - y * 0.02})`;
    ctx.fillRect(0, y, w, 1);
  }

  // 길 사이 담장 기둥
  const laneW = w / lanes;
  const post = 3;
  for (let i = 1; i < lanes; i += 1) {
    const x = Math.round(i * laneW - post / 2);
    roof(ctx, x, 0, post, h);
    ctx.fillStyle = C.K;
    ctx.fillRect(x + post, 0, 1, h); // 그림자
  }

  // 마을 담장 (바닥). 여기 닿으면 생명이 준다
  const wallH = 6;
  roof(ctx, 0, h - wallH, w, wallH);
  ctx.fillStyle = C.K;
  ctx.fillRect(0, h - wallH - 1, w, 1);
}
