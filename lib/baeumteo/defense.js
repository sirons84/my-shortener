// 외솔 배움터 — 우리말 지키기 (기획서 §8-2)
//
// 적은 바꿔 쓸 말(벤또)로 내려오고, 탑은 우리말(도시락)로 선다.
// 탑은 짝이 맞는 적에게만 명중한다. 그래서 탑을 고르는 순간이 곧
// "이 말의 우리말은 무엇인가"를 판단하는 순간이다.
//
// 여기는 판을 짜고 셈하는 자리다. 화면과 시간은 컴포넌트가 맡는다.

import { filterWords, getWord } from './words';

/** 씨앗에서 나오는 난수. 같은 씨앗이면 같은 판이 나온다 */
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  return function rng() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 한 물결에 나올 낱말을 고른다.
 * 시대에 든 낱말이 모자라면 다른 시대에서 채운다 (판이 서지 않는 것보다 낫다).
 */
function wavePool(wave, rng) {
  const inEra = shuffle(filterWords({ era: wave.era }), rng);
  if (inEra.length >= wave.distinct) return inEra.slice(0, wave.distinct);

  const rest = shuffle(
    filterWords().filter((w) => w.era !== wave.era),
    rng,
  );
  return [...inEra, ...rest].slice(0, wave.distinct);
}

/**
 * 탑 후보 더미. 이 물결에 오는 낱말과 남의 낱말을 하나씩 번갈아 쌓는다.
 * 섞기만 하면 첫 손패 넷이 모두 헛것일 수 있다. 그래서는 첫 물결에서 진다.
 */
function towerDeck(poolIds, rng) {
  const mine = shuffle(poolIds, rng);
  const decoys = shuffle(
    filterWords()
      .filter((w) => !poolIds.includes(w.id))
      .map((w) => w.id),
    rng,
  ).slice(0, poolIds.length);

  const deck = [];
  for (let i = 0; i < mine.length; i += 1) {
    deck.push(mine[i]);
    if (decoys[i]) deck.push(decoys[i]);
  }
  return deck;
}

/**
 * 한 판을 통째로 짠다.
 * 적은 시각(at, 물결 시작에서 몇 ms)과 줄(lane)을 미리 받아 둔다.
 * 시간이 흐르는 것 말고는 판 중에 무작위가 끼어들지 않는다.
 */
export function buildRun(config, seed = Date.now()) {
  const rng = makeRng(seed);

  const waves = config.waves.map((wave, index) => {
    const pool = wavePool(wave, rng);
    const poolIds = pool.map((w) => w.id);

    // 같은 말은 늘 같은 줄로 내려온다.
    // 이 규칙이 있어야 "저 말의 우리말"을 알아본 학생이 탑을 어디에 세울지 알고,
    // 한 번 잘 세운 탑이 그 말을 계속 막는다. 규칙이 없으면 운으로만 막힌다.
    const laneOf = new Map(poolIds.map((id, i) => [id, i % config.lanes]));

    const order = [];
    while (order.length < wave.count - 1) {
      order.push(...shuffle(poolIds, rng));
    }

    // 보스는 이 물결에서 가장 높은 학년군 낱말로 세운다
    const boss = [...pool].sort((a, b) => b.level - a.level)[0];

    const enemies = order.slice(0, wave.count - 1).map((wordId, i) => ({
      key: `w${index}e${i}`,
      wordId,
      lane: laneOf.get(wordId),
      at: i * wave.gap_ms,
      boss: false,
      hits: 1,
    }));

    enemies.push({
      key: `w${index}boss`,
      wordId: boss.id,
      lane: laneOf.get(boss.id),
      at: (wave.count - 1) * wave.gap_ms + wave.gap_ms,
      boss: true,
      hits: config.boss.hits,
    });

    return {
      index,
      era: wave.era,
      label: wave.label,
      multiplier: wave.multiplier,
      speed: wave.speed,
      fallMs: Math.round(config.fall_ms / wave.speed),
      bossFallMs: Math.round(config.fall_ms / wave.speed / config.boss.speed_scale),
      poolIds,
      deck: towerDeck(poolIds, rng),
      enemies,
    };
  });

  return { seed, waves };
}

/** 적이 내려온 정도. 0=꼭대기, 1=바닥 */
export function fallenRatio(enemy, wave, elapsed) {
  const span = enemy.boss ? wave.bossFallMs : wave.fallMs;
  return (elapsed - enemy.at) / span;
}

/** 탑이 이 적을 맞힐 수 있는가. 짝이 맞아야만 한다 */
export function hits(tower, enemy) {
  return tower.wordId === enemy.wordId;
}

/** 한 마리를 잡아 얻는 점수 */
export function killScore(enemy, wave, config) {
  return wave.multiplier * (enemy.boss ? config.boss.score_scale : 1);
}

/**
 * 이 판에서 나올 수 있는 가장 큰 점수.
 * 순위판이 이 값을 넘는 기록을 받지 않는다 (데이터설계 §6).
 */
export function maxScore(config) {
  return config.waves.reduce(
    (sum, wave) => sum + wave.multiplier * (wave.count - 1 + config.boss.score_scale),
    0,
  );
}

/** 판을 끝내고 받는 낱말 카드 수 */
export function reward(clearedWaves, config) {
  const perWave = clearedWaves * config.reward.per_wave;
  const bonus = clearedWaves >= config.waves.length ? config.reward.clear : 0;
  return perWave + bonus;
}

/** 화면에 낼 낱말 (짝이 사라진 id 가 들어와도 판이 서지 않게 막는다) */
export function word(id) {
  return getWord(id) || { id, ko: '', from: '', meaning: '', source: '' };
}
