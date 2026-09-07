// 외솔 배움터 — 판 표(票)와 열쇠 (데이터설계 §6)
//
// 순위판은 로그인 없이 기록을 받는다. 점수 조작을 완전히 막을 수는 없고,
// 막으려 들면 로그인을 붙여야 한다. 그래서 목표는 "귀찮게 만들기"다.
//
//  - 판을 시작할 때 서버가 표를 하나 끊어 준다. 표에는 게임 이름과 끊은 시각이
//    들어 있고 서버 열쇠로 서명돼 있다.
//  - 기록을 낼 때 그 표를 함께 낸다. 표가 없거나, 서명이 다르거나, 점수에
//    견줘 너무 빨리 돌아왔으면 받지 않는다.
//
// 서버 전용이다. 브라우저 번들에 들어가면 안 된다.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// 표 서명에만 쓰는 열쇠. 따로 두지 않았으면 서비스 롤 키에서 뽑아 쓴다
// (원본을 그대로 쓰지 않으려고 한 번 해시한다).
function secret() {
  const explicit = process.env.BAEUMTEO_SIGN_SECRET;
  if (explicit) return explicit;
  return createHash('sha256')
    .update(`baeumteo:${process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev'}`)
    .digest('hex');
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function sameString(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** 판을 시작하는 표를 끊는다 */
export function issueTicket(game) {
  const payload = b64url(JSON.stringify({ g: game, t: Date.now(), n: randomBytes(6).toString('hex') }));
  return `${payload}.${sign(payload)}`;
}

/**
 * 표를 확인한다.
 * @returns {{ ok: boolean, ageMs?: number, reason?: string }}
 */
export function readTicket(ticket, game, { maxAgeMs = 2 * 3600 * 1000 } = {}) {
  const [payload, mac] = String(ticket || '').split('.');
  if (!payload || !mac) return { ok: false, reason: '판 표가 없습니다.' };
  if (!sameString(mac, sign(payload))) return { ok: false, reason: '판 표가 맞지 않습니다.' };

  let body;
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: '판 표를 읽을 수 없습니다.' };
  }

  if (body.g !== game) return { ok: false, reason: '다른 게임의 판 표입니다.' };

  const ageMs = Date.now() - Number(body.t || 0);
  if (!Number.isFinite(ageMs) || ageMs < 0) return { ok: false, reason: '판 표의 시각이 이상합니다.' };
  if (ageMs > maxAgeMs) return { ok: false, reason: '판 표가 오래됐습니다. 판을 다시 시작해 주세요.' };

  return { ok: true, ageMs };
}

/** 브라우저에만 두는 열쇠를 만든다 (기록 삭제·반 관리에 쓴다) */
export function makeKey() {
  return randomBytes(16).toString('base64url');
}

/** 열쇠는 원본을 두지 않고 해시만 둔다 */
export function hashKey(key) {
  return createHash('sha256').update(`baeumteo-key:${key}`).digest('base64url');
}

/** 열쇠 맞춰 보기 */
export function keyMatches(key, hashed) {
  return sameString(hashKey(key), hashed);
}
