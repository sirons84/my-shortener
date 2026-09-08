/* 잃어버린 원고 — 판 그리기.
   셈은 lib/baeumteo/manuscript.js 가 한다. 여기는 그 판을 캔버스에 옮길 뿐이다.

   색은 배움터 토큰(먹·한지·괘선·솔·경고)만 쓴다. 장식은 없다.
   벽은 괘선색 면, 길은 어두운 한지, 사람은 점 하나, 시야는 옅은 부채꼴. */

import { fanPolygon, held } from '../../../lib/baeumteo/manuscript';

const FALLBACK = {
  ink: '#1f1d1a',
  paper: '#faf8f2',
  paper2: '#f3efe5',
  rule: '#d8d2c4',
  pine: '#2f4a3e',
  muted: '#6f6a60',
  alarm: '#8a3b2e',
};

/** 캔버스가 놓인 자리의 CSS 변수를 한 번 읽어 둔다 */
export function readPalette(el) {
  if (typeof window === 'undefined' || !el) return FALLBACK;
  const css = window.getComputedStyle(el);
  const pick = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    ink: pick('--ink', FALLBACK.ink),
    paper: pick('--paper', FALLBACK.paper),
    paper2: pick('--paper2', FALLBACK.paper2),
    rule: pick('--rule', FALLBACK.rule),
    pine: pick('--pine', FALLBACK.pine),
    muted: pick('--muted', FALLBACK.muted),
    alarm: pick('--alarm', FALLBACK.alarm),
    font: css.fontFamily || 'serif',
  };
}

/** 16진 색에 투명도를 붙인다 (#rrggbb → rgba) */
function alpha(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function box(ctx, x, y, t, pal) {
  const w = t * 0.56;
  const h = t * 0.42;
  ctx.fillStyle = pal.paper;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  // 원고 묶음의 끈
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x, y + h / 2);
  ctx.stroke();
}

/**
 * 판 한 장을 그린다.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} world  lib 의 판
 * @param {object} config 게임 설정
 * @param {number} t      한 칸의 픽셀 수
 * @param {object} pal    readPalette 의 결과
 */
export function drawWorld(ctx, world, config, t, pal) {
  const { stage } = world;
  const W = stage.w * t;
  const H = stage.h * t;

  ctx.fillStyle = pal.paper2;
  ctx.fillRect(0, 0, W, H);

  // 벽
  ctx.fillStyle = pal.rule;
  for (let y = 0; y < stage.h; y += 1) {
    for (let x = 0; x < stage.w; x += 1) {
      if (stage.walls[y][x]) ctx.fillRect(x * t, y * t, t, t);
    }
  }

  // 출구. 상자가 하나라도 있어야 열린다
  const open = held(world) >= 1;
  const ex = stage.exit.x * t;
  const ey = stage.exit.y * t;
  ctx.strokeStyle = open ? pal.pine : pal.muted;
  ctx.lineWidth = 2;
  ctx.setLineDash(open ? [] : [4, 4]);
  ctx.strokeRect(ex - t / 2 + 4, ey - t / 2 + 4, t - 8, t - 8);
  ctx.setLineDash([]);
  ctx.fillStyle = open ? pal.pine : pal.muted;
  ctx.font = `600 ${Math.round(t * 0.4)}px ${pal.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('문', ex, ey + 1);

  // 시야. 사람보다 먼저 그려야 사람이 위에 선다
  for (const g of world.guards) {
    const pts = fanPolygon(g, stage, config);
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * t, p.y * t) : ctx.lineTo(p.x * t, p.y * t)));
    ctx.closePath();
    ctx.fillStyle = alpha(pal.alarm, g.sees ? 0.34 : 0.14);
    ctx.fill();
    ctx.strokeStyle = alpha(pal.alarm, 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 상자
  for (const b of world.boxes) {
    if (!b.taken) box(ctx, b.x * t, b.y * t, t, pal);
  }

  // 형사
  for (const g of world.guards) {
    const gx = g.x * t;
    const gy = g.y * t;
    ctx.beginPath();
    ctx.arc(gx, gy, t * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = pal.ink;
    ctx.fill();
    // 보는 쪽
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + Math.cos(g.angle) * t * 0.46, gy + Math.sin(g.angle) * t * 0.46);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // 나
  const p = world.player;
  const px = p.x * t;
  const py = p.y * t;
  ctx.beginPath();
  ctx.arc(px, py, t * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = pal.pine;
  ctx.fill();
  ctx.strokeStyle = pal.paper;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 들고 있는 상자는 어깨 위에 작은 점으로
  const carrying = held(world);
  for (let i = 0; i < carrying; i += 1) {
    ctx.fillStyle = pal.paper;
    ctx.fillRect(px - t * 0.22 + i * t * 0.16, py - t * 0.5, t * 0.11, t * 0.11);
  }

  // 들킴 눈금. 시야에 든 동안 차오른다
  if (world.seen > 0) {
    const ratio = Math.min(1, world.seen / config.seen_ms);
    const bw = t * 1.1;
    const bx = px - bw / 2;
    const by = py - t * 0.72;
    ctx.fillStyle = pal.paper;
    ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = pal.alarm;
    ctx.fillRect(bx, by, bw * ratio, 5);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 4);
  }
}
