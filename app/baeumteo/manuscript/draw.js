/* 잃어버린 원고 — 판 그리기 (도트 그림).
   셈은 lib/baeumteo/manuscript.js 가 한다. 여기는 그 판을 캔버스에 옮길 뿐이다.

   캔버스는 한 칸 16픽셀의 저해상도로 그리고, CSS 가 image-rendering: pixelated 로
   세 배 키운다. 그래서 여기서 찍는 점 하나가 화면의 도트 하나다.

   그림 파일은 없다. 스프라이트는 아래 문자열이 전부라서 색을 바꾸거나 동작을
   더할 때 이 파일만 고치면 된다. */

import { fanPolygon, held } from '../../../lib/baeumteo/manuscript';

/** 한 칸의 픽셀 수. 스프라이트가 16×16 이라 여기서 바꾸면 스프라이트도 바꿔야 한다 */
export const TILE = 16;

// 배움터 토큰에 나무·살빛·외투색만 더했다
const C = {
  K: '#1f1d1a', // 먹
  W: '#faf8f2', // 한지
  S: '#e8c4a0', // 살빛
  G: '#2f4a3e', // 솔
  R: '#8a3b2e', // 경고
  B: '#5a3d24', // 짙은 나무
  b: '#c9a878', // 밝은 나무
  D: '#3d3b3f', // 형사 외투
  M: '#8c8577', // 돌
  dirt: '#dfd2ae',
  dirt2: '#cfc09a',
  pebble: '#b3a88e',
  roof: '#6f6a60',
  roof2: '#57534a',
  roofLight: '#8f8a7d',
  plank: '#bf9d6c',
  plank2: '#b18f5e',
  seam: '#8a6b42',
  crate: '#b8935f',
  crate2: '#a8895c',
  glow: '#f2e2b8',
};

// ── 스프라이트 ─────────────────────────────────────────────────
// '.' 은 비침. 나머지 글자는 위 C 의 열쇠다.

const PLAYER = {
  down: [
    '................',
    '......KKKK......',
    '.....KKKKKK.....',
    '.....KKKKKK.....',
    '.....SSSSSS.....',
    '.....SKSSKS.....',
    '.....SSSSSS.....',
    '......SSSS......',
    '....KWWWWWWK....',
    '...KWWWGWWWWK...',
    '...KWWWGGWWWK...',
    '...KWWWWWWWWK...',
    '...KWWWWWWWWK...',
    '....KWWWWWWK....',
    '....KK....KK....',
    '................',
  ],
  up: [
    '................',
    '......KKKK......',
    '.....KKKKKK.....',
    '.....KKKKKK.....',
    '.....KKKKKK.....',
    '.....KKKKKK.....',
    '......KKKK......',
    '......SSSS......',
    '....KWWWWWWK....',
    '...KWWWWWWWWK...',
    '...KWWWWWWWWK...',
    '...KWWWWWWWWK...',
    '...KWWWWWWWWK...',
    '....KWWWWWWK....',
    '....KK....KK....',
    '................',
  ],
  right: [
    '................',
    '......KKKK......',
    '.....KKKKKK.....',
    '.....KKKKKK.....',
    '.....KKSSSS.....',
    '.....KKSSKS.....',
    '.....KKSSSS.....',
    '......SSSS......',
    '.....KWWWWK.....',
    '....KWWWWWWK....',
    '....KWWWWWWK....',
    '....KWWWWWWK....',
    '....KWWWWWWK....',
    '.....KWWWWK.....',
    '.....KK.KK......',
    '................',
  ],
};

const GUARD = {
  down: [
    '......BBBB......',
    '......BBBB......',
    '.....BKKKKB.....',
    '....BBBBBBBB....',
    '.....SSSSSS.....',
    '.....SKSSKS.....',
    '.....SSSSSS.....',
    '......SSSS......',
    '....KDDDDDDK....',
    '...KDDWWDDDDK...',
    '...KDDDDDDDDK...',
    '...KDDDDDDDDK...',
    '...KDDDDDDDDK...',
    '....KDDDDDDK....',
    '....KK....KK....',
    '................',
  ],
  up: [
    '......BBBB......',
    '......BBBB......',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '.....KKKKKK.....',
    '.....KKKKKK.....',
    '......KKKK......',
    '......SSSS......',
    '....KDDDDDDK....',
    '...KDDDDDDDDK...',
    '...KDDDDDDDDK...',
    '...KDDDDDDDDK...',
    '...KDDDDDDDDK...',
    '....KDDDDDDK....',
    '....KK....KK....',
    '................',
  ],
  right: [
    '......BBBB......',
    '......BBBB......',
    '.....BKKKKB.....',
    '....BBBBBBBB....',
    '.....KKSSSS.....',
    '.....KKSSKS.....',
    '.....KKSSSS.....',
    '......SSSS......',
    '.....KDDDDK.....',
    '....KDDDDDDK....',
    '....KDDDDDDK....',
    '....KDDDDDDK....',
    '....KDDDDDDK....',
    '.....KDDDDK.....',
    '.....KK.KK......',
    '................',
  ],
};

// 걷는 동작: 발 줄만 바꾼다
const FEET_A = { down: '....KK....KK....', right: '.....KK.KK......' };
const FEET_B = { down: '.....KK..KK.....', right: '....KK...KK.....' };

// 보자기로 싼 원고 묶음
const BUNDLE = [
  '...KK...',
  '..KWWK..',
  '.KGGGGK.',
  'KGGGGGGK',
  'KGGGGGGK',
  '.KGGGGK.',
  '..KKKK..',
];

// 어깨에 멘 묶음 (작게)
const PACK = [
  '.KK.',
  'KGGK',
  'KGGK',
  '.KK.',
];

function paint(ctx, rows, x, y, { flip = false, feet = null } = {}) {
  const h = rows.length;
  for (let r = 0; r < h; r += 1) {
    let row = rows[r];
    if (feet && r === 14) row = feet; // 발 줄
    const w = row.length;
    for (let c = 0; c < w; c += 1) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = C[ch];
      const px = flip ? w - 1 - c : c;
      ctx.fillRect(x + px, y + r, 1, 1);
    }
  }
}

/** 각도 → 바라보는 쪽 */
function facing(angle) {
  const cx = Math.cos(angle);
  const cy = Math.sin(angle);
  if (Math.abs(cx) >= Math.abs(cy)) return cx >= 0 ? 'right' : 'left';
  return cy >= 0 ? 'down' : 'up';
}

/** 사람 한 명. 발 그림자, 걷는 동작, 방향 */
function person(ctx, set, x, y, angle, moving, clock) {
  const face = facing(angle);
  const flip = face === 'left';
  const rows = set[flip ? 'right' : face];
  const feetSet = face === 'right' || face === 'left' ? 'right' : 'down';
  const stepB = moving && Math.floor(clock / 160) % 2 === 1;
  const feet = (stepB ? FEET_B : FEET_A)[feetSet];

  // 그림자
  ctx.fillStyle = 'rgba(31, 29, 26, 0.22)';
  ctx.fillRect(x + 4, y + 14, 8, 2);

  paint(ctx, rows, x, y, { flip, feet });
}

/** 칸마다 다른 잡음. 판이 바뀌어도 같은 칸은 같은 무늬다 */
function hash(x, y, salt = 0) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) % 1000;
}

// ── 바닥과 벽 ──────────────────────────────────────────────────

function dirtTile(ctx, x, y, tx, ty) {
  ctx.fillStyle = C.dirt;
  ctx.fillRect(x, y, TILE, TILE);
  // 흙 얼룩
  for (let i = 0; i < 5; i += 1) {
    const h = hash(tx, ty, i);
    ctx.fillStyle = C.dirt2;
    ctx.fillRect(x + (h % 14), y + ((h >> 4) % 14), 2, 1);
  }
  // 가끔 조약돌
  if (hash(tx, ty, 9) < 180) {
    const h = hash(tx, ty, 10);
    ctx.fillStyle = C.pebble;
    ctx.fillRect(x + 2 + (h % 11), y + 2 + ((h >> 3) % 11), 2, 2);
  }
}

/** 기와를 얹은 담장. 위에서 내려다본 지붕 무늬 */
function roofTile(ctx, x, y, tx, ty, stage) {
  ctx.fillStyle = C.roof;
  ctx.fillRect(x, y, TILE, TILE);
  for (let r = 0; r < TILE; r += 4) {
    const shift = (r / 4) % 2 === 0 ? 0 : 2;
    // 칸 밖으로 나가면 옆 칸을 더럽히므로 칸 안에서만 찍는다
    const dot = (cx, cy, w, color) => {
      const from = Math.max(0, cx);
      const to = Math.min(TILE, cx + w);
      if (to <= from) return;
      ctx.fillStyle = color;
      ctx.fillRect(x + from, y + cy, to - from, 1);
    };
    for (let c = -2; c < TILE; c += 4) {
      dot(c + shift, r + 3, 4, C.roof2);
      dot(c + shift + 1, r, 2, C.roofLight);
    }
  }
  // 길과 맞닿은 아래쪽은 처마 그림자, 위쪽은 밝은 마루
  if (!stage.walls[ty + 1]?.[tx] && ty + 1 < stage.h) {
    ctx.fillStyle = C.K;
    ctx.fillRect(x, y + TILE - 1, TILE, 1);
  }
  if (ty > 0 && !stage.walls[ty - 1][tx]) {
    ctx.fillStyle = C.roofLight;
    ctx.fillRect(x, y, TILE, 1);
  }
}

function plankTile(ctx, x, y, tx, ty) {
  for (let r = 0; r < TILE; r += 4) {
    ctx.fillStyle = (r / 4 + ty) % 2 === 0 ? C.plank : C.plank2;
    ctx.fillRect(x, y + r, TILE, 4);
    ctx.fillStyle = C.seam;
    ctx.fillRect(x, y + r + 3, TILE, 1);
    // 널빤지 이음매를 어긋나게
    const gap = (hash(tx, ty, r) % 12) + 2;
    ctx.fillRect(x + gap, y + r, 1, 3);
  }
}

/** 쌓인 궤짝 */
function crateTile(ctx, x, y, tx, ty) {
  const dark = hash(tx, ty, 3) < 500;
  ctx.fillStyle = dark ? C.crate2 : C.crate;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = C.B;
  ctx.fillRect(x, y, TILE, 1);
  ctx.fillRect(x, y + TILE - 1, TILE, 1);
  ctx.fillRect(x, y, 1, TILE);
  ctx.fillRect(x + TILE - 1, y, 1, TILE);
  // 띠
  for (let i = 1; i < TILE - 1; i += 1) {
    ctx.fillRect(x + i, y + i, 1, 1);
    ctx.fillRect(x + TILE - 1 - i, y + i, 1, 1);
  }
  // 못
  ctx.fillStyle = C.K;
  ctx.fillRect(x + 2, y + 2, 1, 1);
  ctx.fillRect(x + TILE - 3, y + 2, 1, 1);
  ctx.fillRect(x + 2, y + TILE - 3, 1, 1);
  ctx.fillRect(x + TILE - 3, y + TILE - 3, 1, 1);
}

function doorTile(ctx, x, y, open) {
  ctx.fillStyle = C.B;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = open ? C.glow : C.K;
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  if (open) {
    // 반쯤 열린 문짝
    ctx.fillStyle = C.b;
    ctx.fillRect(x + 2, y + 2, 5, TILE - 4);
    ctx.fillStyle = C.K;
    ctx.fillRect(x + 5, y + 8, 1, 1);
  } else {
    // 빗장
    ctx.fillStyle = C.b;
    ctx.fillRect(x + 2, y + 7, TILE - 4, 2);
    ctx.fillStyle = C.K;
    ctx.fillRect(x + 7, y + 7, 2, 2);
  }
}

// ── 판 한 장 ───────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} world  lib 의 판
 * @param {object} config 게임 설정
 * @param {number} clock  걷는 동작을 넘기는 시계(ms)
 */
export function drawWorld(ctx, world, config, clock = 0) {
  const { stage } = world;
  const T = TILE;
  const station = stage.id === 'st_station';

  ctx.imageSmoothingEnabled = false;

  // 바닥과 벽
  for (let y = 0; y < stage.h; y += 1) {
    for (let x = 0; x < stage.w; x += 1) {
      const px = x * T;
      const py = y * T;
      if (stage.walls[y][x]) {
        if (station) crateTile(ctx, px, py, x, y);
        else roofTile(ctx, px, py, x, y, stage);
      } else if (station) {
        plankTile(ctx, px, py, x, y);
      } else {
        dirtTile(ctx, px, py, x, y);
      }
    }
  }

  // 문. 상자가 하나라도 있어야 열린다
  doorTile(ctx, (stage.exit.x - 0.5) * T, (stage.exit.y - 0.5) * T, held(world) >= 1);

  // 시야. 사람보다 먼저 그려야 사람이 위에 선다. 안쪽을 한 번 더 칠해 손전등처럼
  for (const g of world.guards) {
    const pts = fanPolygon(g, stage, config);
    const fill = (scale, alpha) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = (g.x + (p.x - g.x) * scale) * T;
        const y = (g.y + (p.y - g.y) * scale) * T;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = g.sees ? `rgba(138, 59, 46, ${alpha * 1.7})` : `rgba(90, 61, 36, ${alpha})`;
      ctx.fill();
    };
    fill(1, 0.2);
    fill(0.62, 0.14);
    ctx.strokeStyle = g.sees ? 'rgba(138, 59, 46, 0.8)' : 'rgba(90, 61, 36, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 상자
  for (const b of world.boxes) {
    if (b.taken) continue;
    const x = Math.round(b.x * T) - 4;
    const y = Math.round(b.y * T) - 3;
    ctx.fillStyle = 'rgba(31, 29, 26, 0.2)';
    ctx.fillRect(x, y + 5, 8, 2);
    paint(ctx, BUNDLE, x, y - 1);
  }

  // 형사
  for (const g of world.guards) {
    const moving = g.pause <= 0 && g.path.length > 1;
    person(ctx, GUARD, Math.round(g.x * T) - 8, Math.round(g.y * T) - 10, g.angle, moving, clock);
  }

  // 나
  const p = world.player;
  const px = Math.round(p.x * T) - 8;
  const py = Math.round(p.y * T) - 10;
  person(ctx, PLAYER, px, py, p.face, !!p.moving, clock);
  if (held(world) > 0) paint(ctx, PACK, px + (facing(p.face) === 'left' ? 11 : 1), py + 8);

  // 들킴 눈금. 시야에 든 동안 차오른다
  if (world.seen > 0) {
    const ratio = Math.min(1, world.seen / config.seen_ms);
    const bw = 14;
    const bx = px + 1;
    const by = py - 3;
    ctx.fillStyle = C.K;
    ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
    ctx.fillStyle = C.W;
    ctx.fillRect(bx, by, bw, 2);
    ctx.fillStyle = C.R;
    ctx.fillRect(bx, by, Math.round(bw * ratio), 2);
  }
}
