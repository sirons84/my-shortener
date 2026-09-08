// 외솔 배움터 — 한글 리듬 (기획서 §8-5)
//
// 네 줄로 글자가 떨어지고 판정선에서 친다. 글자는 1~2학년 낱말의 음절이고,
// 한 낱말의 음절이 차례로 온다. 낱말이 끝나면 화면에 잠깐 크게 보인다.
//
// 악보(차트)는 파일이 아니라 박자와 씨앗에서 만든다. 같은 곡이면 늘 같은 악보가
// 나오므로 순위판이 공정하고, 서버도 같은 셈으로 최고 점수를 안다.

import { filterWords } from './words';
import { makeRng } from './defense';

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 한 박의 길이(ms) */
export function beatMs(track) {
  return 60000 / track.bpm;
}

/** 악보에 쓸 낱말. 띄어쓰기를 뺀 음절 수가 max_syllables 를 넘지 않는 것만 */
export function chartWords(config) {
  return filterWords({ level: config.note_pool.level })
    .map((w) => ({ id: w.id, ko: w.ko, from: w.from, chars: [...w.ko.replace(/\s+/g, '')] }))
    .filter((w) => w.chars.length >= 1 && w.chars.length <= config.note_pool.max_syllables);
}

/**
 * 악보를 만든다.
 * @returns {{ id:string, t:number, lane:number, ch:string, wordId:string, ko:string, from:string, first:boolean, last:boolean }[]}
 */
export function buildChart(config, track) {
  const rng = makeRng(track.seed ?? 1);
  const words = shuffle(chartWords(config), rng);
  if (words.length === 0) return [];

  const beat = beatMs(track);
  const start = track.offset_ms + beat * (track.skip_beats || 0);
  const end = track.end_ms ?? track.duration_ms - 1500;

  const notes = [];
  let wordIndex = 0;
  let charIndex = 0;
  let lastLane = -1;

  for (let b = 0; ; b += 1) {
    const t = start + b * beat;
    if (t > end) break;

    // 마디(4박)마다 몇 박에 하나씩 오는지가 바뀐다. 아이가 숨 돌릴 마디가 있어야 한다
    const bar = Math.floor(b / 4);
    const every = config.pattern[Math.floor(bar / config.pattern_bars) % config.pattern.length];
    if (b % every !== 0) continue;

    const word = words[wordIndex % words.length];
    const ch = word.chars[charIndex];

    // 같은 줄이 연달아 오지 않게
    let lane = Math.floor(rng() * config.lanes);
    if (lane === lastLane) lane = (lane + 1 + Math.floor(rng() * (config.lanes - 1))) % config.lanes;
    lastLane = lane;

    notes.push({
      id: `${wordIndex}-${charIndex}`,
      t: Math.round(t),
      lane,
      ch,
      wordId: word.id,
      ko: word.ko,
      from: word.from,
      first: charIndex === 0,
      last: charIndex === word.chars.length - 1,
    });

    charIndex += 1;
    if (charIndex >= word.chars.length) {
      charIndex = 0;
      wordIndex += 1;
    }
  }

  return notes;
}

/**
 * 판정. 판정선과의 시간 차(ms, 절댓값)로 가른다.
 * @returns {'good'|'ok'|null}
 */
export function judge(deltaMs, config) {
  const d = Math.abs(deltaMs);
  if (d <= config.judge.good_ms) return 'good';
  if (d <= config.judge.ok_ms) return 'ok';
  return null;
}

export const JUDGE_LABEL = { good: '좋아', ok: '괜찮아', miss: '놓침' };

/** 한 곡에서 나올 수 있는 최고 점수 (전부 좋아) */
export function trackMax(config, track) {
  return buildChart(config, track).length * config.score.good;
}

/** 이 게임에서 나올 수 있는 최고 점수 */
export function maxScore(config) {
  return Math.max(0, ...config.tracks.map((t) => trackMax(config, t)));
}

/** 가장 짧은 곡의 악보 길이. 이보다 빨리 낸 기록은 판을 돈 것이 아니다 */
export function minRunMs(config) {
  return Math.min(
    ...config.tracks.map((t) => {
      const notes = buildChart(config, t);
      return notes.length ? notes[notes.length - 1].t - notes[0].t : 0;
    }),
  );
}

/** 콤보가 every 의 배수에 닿았을 때 받는 카드 */
export function comboCards(combo, config) {
  return combo > 0 && combo % config.combo_reward.every === 0 ? config.combo_reward.cards : 0;
}
