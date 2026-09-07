// 외솔 배움터 — 저장 코드 (개발기획서 §9, 데이터설계 §4)
//
// 진행도를 다른 기기로 옮기는 유일한 길. 서버에 백업하지 않는다.
// 코드를 잃으면 처음부터이고, 그것도 게임의 일부다.
//
//   저장 → 짧은 배열로 접기 → JSON → deflate → base32 → 네 자씩 끊기
//   예: SOL7-KX2M-Q9PA-3NDF
//
// 마지막 한 글자는 검사 글자다. 한 글자만 틀려도 바로 "코드가 맞지 않아요"가 된다.
// (데이터설계 문서는 4비트라고 적었지만 base32 한 글자가 5비트라 5비트를 쓴다.)

import { normalize, emptySave } from './save';

// 초등학생이 받아 적는 코드다. 헷갈리는 I·L·O·U 를 뺀 크록퍼드 배열을 쓴다.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// 받아 적다가 흔히 생기는 흔들림은 조용히 고쳐 준다
const FIXUP = { O: '0', I: '1', L: '1', U: 'V' };

const HEADER_DEFLATE = 1;
const HEADER_RAW = 0;

// ── 바이트 ↔ base32 ──────────────────────────────────────────────

function toBase32(bytes) {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

function fromBase32(text) {
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of text) {
    const value = ALPHABET.indexOf(ch);
    if (value < 0) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

function checksum(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return ALPHABET[hash & 31];
}

// ── 압축 ─────────────────────────────────────────────────────────

async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

// ── 저장 ↔ 짧은 배열 ─────────────────────────────────────────────
//
// 키 이름이 코드 길이의 절반을 먹는다. 자리로만 적는다.

/** 'wd_0007' → 7. 모양이 다르면 null */
function entryToNumber(id) {
  const match = /^wd_(\d{1,6})$/.exec(id);
  return match ? Number(match[1]) : null;
}

function numberToEntry(n) {
  return `wd_${String(n).padStart(4, '0')}`;
}

/**
 * 실어 본 낱말을 비트 하나씩으로 접는다 (데이터설계 §4).
 * 낱말 94개를 번호 목록으로 적으면 300자가 넘는다. 비트로 접으면 스무 자다.
 * 아이가 공책에 받아 적을 코드이므로 이 차이가 곧 쓸모의 차이다.
 */
function packKnown(ids) {
  let mask = 0n;
  for (const id of ids) {
    const n = entryToNumber(id);
    if (n !== null && n >= 1 && n <= 4096) mask |= 1n << BigInt(n - 1);
  }
  return mask === 0n ? '' : mask.toString(36);
}

function unpackKnown(text) {
  if (typeof text !== 'string' || text === '') return [];

  let mask = 0n;
  for (const ch of text) {
    const digit = parseInt(ch, 36);
    if (Number.isNaN(digit)) return [];
    mask = mask * 36n + BigInt(digit);
  }

  const ids = [];
  for (let n = 1; mask > 0n; n += 1) {
    if (mask & 1n) ids.push(numberToEntry(n));
    mask >>= 1n;
  }
  return ids;
}

/**
 * 진행도도 자리로만 적는다.
 * {"dictionary":{"best_entries":34,...}} 는 이름만으로 아흔 자를 먹는다.
 */
function packProgress(progress) {
  const dict = progress.dictionary || {};
  const def = progress.defense || {};
  const row = [
    dict.best_entries || 0,
    Math.round((dict.last_ms || 0) / 1000), // 초로 적는다. 코드에 밀리초까지 넣을 일은 없다
    def.best_score || 0,
    def.best_wave || 0,
  ];

  let end = row.length;
  while (end > 0 && !row[end - 1]) end -= 1;
  return row.slice(0, end);
}

function unpackProgress(row) {
  if (!Array.isArray(row)) return {};
  const [entries, seconds, score, wave] = row.map((n) => Math.max(0, Math.floor(Number(n) || 0)));

  const out = {};
  if (entries || seconds) out.dictionary = { best_entries: entries || 0, last_ms: (seconds || 0) * 1000 };
  if (score || wave) out.defense = { best_score: score || 0, best_wave: wave || 0 };
  return out;
}

// ── 저장 ↔ 짧은 배열 ─────────────────────────────────────────────
//
// 키 이름이 코드 길이의 절반을 먹는다. 자리로만 적는다.

/** 아직 아무것도 안 들어간 칸인지 (뒤에서부터 잘라 내려고 본다) */
function isEmptyCell(value) {
  if (value === 0 || value === '' || value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// 코드 판 번호.
//   1 — 사전 편찬소가 끝없이 자라던 때. 실은 낱말과 고용이 함께 들어 있었다
//   2 — 한 판짜리로 바뀐 뒤. 고용은 판이 끝나면 사라지므로 코드에 없고,
//       실어 본 낱말은 비트로, 진행도는 자리로 접는다
const ROW_V1 = 1;
const ROW_V2 = 2;

function pack(save) {
  // 자주 차는 것부터 앞에, 대개 비어 있는 것(별명·학교·반)은 뒤에 둔다.
  // 뒤쪽 빈 칸을 잘라 내면 첫 판의 코드가 스무 자 안쪽으로 줄어든다.
  const row = [
    ROW_V2,
    save.cards,
    packKnown(save.dict.known),
    packProgress(save.progress),
    save.nick,
    save.school,
    save.grade,
    save.class,
    save.class_code,
  ];

  let end = row.length;
  while (end > 2 && isEmptyCell(row[end - 1])) end -= 1;
  return row.slice(0, end);
}

function unpack(row) {
  if (!Array.isArray(row)) return null;

  // 예전 코드도 받아 준다. 실어 본 낱말만 살리고 고용은 버린다
  if (row[0] === ROW_V1) {
    const [, cards, entries, , progress, nick, school, grade, cls, classCode] = row;
    return normalize({
      nick, school, grade, class: cls, class_code: classCode, cards,
      progress: progress && typeof progress === 'object' ? progress : {},
      dict: { known: Array.isArray(entries) ? entries.map(numberToEntry) : [] },
    });
  }

  if (row[0] !== ROW_V2) return null;
  const [, cards, known, progress, nick, school, grade, cls, classCode] = row;
  return normalize({
    nick, school, grade, class: cls, class_code: classCode, cards,
    progress: unpackProgress(progress),
    dict: { known: unpackKnown(known) },
  });
}

// ── 바깥으로 내보내는 두 함수 ────────────────────────────────────

/** 저장 → 코드 문자열 (`SOL7-KX2M-...`) */
export async function encodeSave(save) {
  const json = JSON.stringify(pack(save));
  const raw = new TextEncoder().encode(json);

  const packed = await deflate(raw);
  // 압축이 없는 브라우저에서도 코드가 만들어져야 한다. 길어질 뿐이다.
  const useDeflate = packed !== null && packed.length < raw.length;
  const body = useDeflate ? packed : raw;

  const bytes = new Uint8Array(body.length + 1);
  bytes[0] = useDeflate ? HEADER_DEFLATE : HEADER_RAW;
  bytes.set(body, 1);

  const base = toBase32(bytes);
  const code = base + checksum(base);
  return code.replace(/(.{4})(?=.)/g, '$1-');
}

/**
 * 코드 문자열 → 저장. 실패하면 왜 안 되는지 한 줄로 알려 준다.
 * @returns {Promise<{ ok: true, save: object } | { ok: false, reason: string }>}
 */
export async function decodeSave(input) {
  const cleaned = String(input || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .split('')
    .map((ch) => FIXUP[ch] || ch)
    .join('');

  if (cleaned.length < 4) return { ok: false, reason: '코드가 너무 짧아요.' };

  const base = cleaned.slice(0, -1);
  const mark = cleaned.slice(-1);
  if (checksum(base) !== mark) return { ok: false, reason: '코드가 맞지 않아요. 한 글자씩 다시 봐 주세요.' };

  const bytes = fromBase32(base);
  if (!bytes || bytes.length < 2) return { ok: false, reason: '코드가 맞지 않아요.' };

  const body = bytes.subarray(1);
  const raw = bytes[0] === HEADER_DEFLATE ? await inflate(body) : body;
  if (!raw) return { ok: false, reason: '코드를 풀 수 없어요.' };

  try {
    const save = unpack(JSON.parse(new TextDecoder().decode(raw)));
    if (!save) return { ok: false, reason: '오래된 코드예요.' };
    return { ok: true, save };
  } catch {
    return { ok: false, reason: '코드가 맞지 않아요.' };
  }
}

/** 코드가 도무지 안 풀릴 때 화면이 기댈 빈 저장 */
export { emptySave };
