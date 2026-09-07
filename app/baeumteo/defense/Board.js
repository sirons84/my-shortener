'use client';

/* 우리말 지키기 — 세 줄로 내려오는 말을 우리말 탑으로 막는다 (기획서 §8-2)
   판을 짜는 셈은 lib/baeumteo/defense.js 에 있다. 여기는 시간과 손이 닿는 자리다.

   시간은 화면 상태(useState)에 두지 않는다. 초당 예순 번 setState 를 하면
   낡은 교실 컴퓨터가 버티지 못한다. 판은 ref 에 두고, 그림만 다시 그린다. */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from './page.module.css';
import config from '../../../data/games/defense.json';
import { buildRun, fallenRatio, hits as pairHits, killScore, reward, word } from '../../../lib/baeumteo/defense';
import { earn, emptySave, loadSave, recordProgress, spend, writeSave } from '../../../lib/baeumteo/save';
import Ranking from '../Ranking';

// 줄 안에서 탑이 선 자리. 0 이 꼭대기, 1 이 바닥이다.
// 한 줄에 둘씩 두는 것은 같은 줄에 서로 다른 말이 올 때를 위해서다.
const SLOT_Y = [0.56, 0.78];

const FLASH_MS = 1100;

function num(n) {
  return Math.floor(n).toLocaleString('ko-KR');
}

export default function Board() {
  const [save, setSave] = useState(emptySave);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState('ready'); // ready | brief | play | wave | over
  const [, setFrame] = useState(0);
  const [picked, setPicked] = useState(null); // 손에 든 탑 후보 자리
  const [notice, setNotice] = useState('');

  const g = useRef(null); // 판. 시간마다 바뀌므로 화면 상태로 두지 않는다
  const raf = useRef(0);
  const ticket = useRef('');

  useEffect(() => {
    setSave(loadSave());
    setReady(true);
  }, []);

  const draw = () => setFrame((n) => n + 1);

  const commit = useCallback((updater) => {
    setSave((prev) => writeSave(typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  // ── 판 짜기 ────────────────────────────────────────────────────

  const start = async () => {
    const run = buildRun(config, Date.now());
    g.current = {
      run,
      waveIndex: 0,
      elapsed: 0,
      last: 0,
      towers: [],
      hand: [],
      deckPos: 0,
      damage: new Map(),
      done: new Set(),
      lives: config.lives,
      score: 0,
      kills: 0,
      clearedWaves: 0,
      flash: null,
    };
    setPicked(null);
    setNotice('');
    setPhase('brief');

    // 순위판에 낼 표. 못 받아도 판은 돈다 (순위판에만 못 오른다)
    ticket.current = '';
    try {
      const res = await fetch('/api/baeumteo/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'defense' }),
      });
      if (res.ok) ticket.current = (await res.json()).ticket || '';
    } catch {
      /* 순위판 없이 논다 */
    }
  };

  const beginWave = () => {
    const s = g.current;
    const wave = s.run.waves[s.waveIndex];
    s.hand = wave.deck.slice(0, config.hand_size);
    s.deckPos = config.hand_size;
    // 물결이 바뀌면 낱말이 통째로 바뀐다. 지난 물결의 탑을 남겨 두면
    // 판을 시작하자마자 헛발 다섯 개를 헐어야 한다. 그래서 흩는다.
    s.towers = [];
    s.elapsed = 0;
    s.last = 0;
    s.flash = null;
    setPicked(null);
    setPhase('play');
  };

  // ── 시간 ───────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'play') return undefined;

    const step = (now) => {
      const s = g.current;
      if (!s) return;

      // 다른 탭에 가 있는 동안에는 판을 멈춰 세운다.
      // 브라우저가 안 보이는 탭의 그림 그리기를 늦추므로, 흐른 시간을 그대로
      // 얹으면 돌아왔을 때 적이 바닥에 가 있고 생명이 사라져 있다.
      const delta = s.last && !document.hidden ? Math.min(now - s.last, 100) : 0;
      s.last = now;

      const before = s.elapsed;
      s.elapsed += delta;
      resolve(s, before);

      const wave = s.run.waves[s.waveIndex];
      if (s.lives <= 0) {
        setPhase('over');
      } else if (wave.enemies.every((e) => s.done.has(e.key))) {
        s.clearedWaves = s.waveIndex + 1;
        setPhase(s.waveIndex + 1 >= s.run.waves.length ? 'over' : 'wave');
      } else {
        raf.current = requestAnimationFrame(step);
      }
      draw();
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [phase]);

  /** 지난 그림과 이번 그림 사이에 일어난 일을 셈한다 */
  function resolve(s, before) {
    const wave = s.run.waves[s.waveIndex];

    for (const enemy of wave.enemies) {
      if (s.done.has(enemy.key)) continue;

      const now = fallenRatio(enemy, wave, s.elapsed);
      if (now <= 0) continue;
      const prev = fallenRatio(enemy, wave, before);

      // 탑 자리를 지나는 순간에만 맞는다. 지나간 뒤에 세운 탑은 소용없다
      for (const tower of s.towers) {
        if (tower.lane !== enemy.lane || !pairHits(tower, enemy)) continue;
        const y = SLOT_Y[tower.slot];
        if (prev < y && now >= y) {
          s.damage.set(enemy.key, (s.damage.get(enemy.key) || 0) + 1);
          s.flash = { at: s.elapsed, from: word(enemy.wordId).from, ko: word(enemy.wordId).ko };
        }
      }

      if ((s.damage.get(enemy.key) || 0) >= enemy.hits) {
        s.done.add(enemy.key);
        s.kills += 1;
        s.score += killScore(enemy, wave, config);
        continue;
      }

      if (now >= 1) {
        s.done.add(enemy.key);
        s.lives -= 1;
      }
    }
  }

  // ── 손 ─────────────────────────────────────────────────────────

  const place = (lane, slot) => {
    const s = g.current;
    if (!s || picked === null) return;
    if (s.towers.length >= config.tower_slots) {
      setNotice(`탑은 ${config.tower_slots}개까지 세울 수 있습니다. 하나를 헐어야 합니다.`);
      return;
    }
    if (s.towers.some((t) => t.lane === lane && t.slot === slot)) return;

    const wave = s.run.waves[s.waveIndex];
    s.towers = [...s.towers, { id: `${lane}-${slot}`, lane, slot, wordId: s.hand[picked] }];

    // 낸 자리에 다음 후보가 들어온다. 더미가 바닥나면 처음부터 다시 돈다
    const next = wave.deck[s.deckPos % wave.deck.length];
    s.deckPos += 1;
    s.hand = s.hand.map((id, i) => (i === picked ? next : id));

    setPicked(null);
    setNotice('');
    draw();
  };

  const remove = (tower) => {
    const s = g.current;
    if (!s) return;
    if (save.cards < config.remove_cost) {
      setNotice(`탑을 헐려면 낱말 카드 ${config.remove_cost}장이 있어야 합니다.`);
      return;
    }
    s.towers = s.towers.filter((t) => t.id !== tower.id);
    commit((prev) => spend(prev, config.remove_cost));
    setNotice('');
    draw();
  };

  // ── 판이 끝났을 때 ─────────────────────────────────────────────

  const finished = useRef(false);
  useEffect(() => {
    if (phase !== 'over' || !g.current || finished.current) return;
    finished.current = true;

    const s = g.current;
    const gained = reward(s.clearedWaves, config);
    commit((prev) =>
      recordProgress(earn(prev, gained), 'defense', {
        best_score: s.score,
        best_wave: s.clearedWaves,
      }),
    );
  }, [phase, commit]);

  useEffect(() => {
    if (phase === 'ready' || phase === 'brief') finished.current = false;
  }, [phase]);

  // ── 화면 ───────────────────────────────────────────────────────

  const known = save.dict.known.length;
  const locked = ready && known < config.unlock_entries;
  const s = g.current;
  const wave = s ? s.run.waves[s.waveIndex] : null;

  if (!ready) {
    return <div className={styles.game}><p className={styles.empty}>불러오는 중입니다.</p></div>;
  }

  if (locked) {
    return (
      <div className={styles.game}>
        <div className={styles.gate}>
          <h2>아직 잠겨 있습니다</h2>
          <p>
            사전에 낱말 {config.unlock_entries}개를 실어 보면 열립니다. 지금까지 {known}개입니다.
          </p>
          <p className={styles.small}>
            먼저 사전 편찬소에서 낱말을 실어 보세요. 여기서 막을 말들의 짝을 그때 익히게 됩니다.
          </p>
          <Link href="/배움터/사전편찬소" className={styles.gateLink}>사전 편찬소로</Link>
        </div>
      </div>
    );
  }

  const flashing = s?.flash && s.elapsed - s.flash.at < FLASH_MS ? s.flash : null;

  return (
    <div className={styles.game}>
      {/* 셈판 */}
      <div className={styles.counter}>
        <div className={styles.lives}>
          <span className={styles.muted}>생명</span>
          <b>{s ? '●'.repeat(Math.max(0, s.lives)) + '○'.repeat(config.lives - Math.max(0, s.lives)) : '—'}</b>
        </div>
        <div>
          <span className={styles.muted}>점수</span> <b className={styles.score}>{s ? num(s.score) : 0}</b>
        </div>
        <div>
          <span className={styles.muted}>낱말 카드</span> <b>{num(save.cards)}</b>
        </div>
        <div className={styles.spacer} />
        <div className={styles.waveTag}>
          {wave ? `${wave.index + 1}번째 물결 · ${wave.label}` : `물결 ${config.waves.length}개`}
        </div>
      </div>

      {notice && (
        <p className={styles.notice}>
          {notice}
          <button type="button" onClick={() => setNotice('')}>닫기</button>
        </p>
      )}

      {/* 판 */}
      <div className={styles.field}>
        {Array.from({ length: config.lanes }, (_, lane) => (
          <div key={lane} className={styles.lane}>
            {phase === 'play' &&
              wave.enemies
                .filter((e) => e.lane === lane && !s.done.has(e.key))
                .map((enemy) => {
                  const ratio = fallenRatio(enemy, wave, s.elapsed);
                  if (ratio <= 0) return null;
                  const hurt = (s.damage.get(enemy.key) || 0) > 0;
                  return (
                    <span
                      key={enemy.key}
                      className={`${styles.enemy} ${enemy.boss ? styles.boss : ''} ${hurt ? styles.hurt : ''}`}
                      style={{ top: `${Math.min(100, ratio * 100)}%` }}
                    >
                      {word(enemy.wordId).from}
                    </span>
                  );
                })}

            {SLOT_Y.map((y, slot) => {
              const tower = s?.towers.find((t) => t.lane === lane && t.slot === slot);
              return (
                <div key={slot} className={styles.slot} style={{ top: `${y * 100}%` }}>
                  {tower ? (
                    <button
                      type="button"
                      className={styles.tower}
                      onClick={() => remove(tower)}
                      title={`헐기 (낱말 카드 ${config.remove_cost}장)`}
                    >
                      {word(tower.wordId).ko}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.empty2}
                      onClick={() => place(lane, slot)}
                      disabled={picked === null || phase !== 'play'}
                    >
                      빈 자리
                    </button>
                  )}
                </div>
              );
            })}

            <div className={styles.floor} />
          </div>
        ))}

        {/* 판 위에 덮이는 화면들 */}
        {phase === 'ready' && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <h2>우리말 지키기</h2>
              <ol className={styles.rules}>
                <li>바꿔 쓸 말이 세 줄로 내려옵니다. 같은 말은 늘 같은 줄로 옵니다.</li>
                <li>아래 후보 {config.hand_size}개 가운데 그 말의 우리말을 골라 그 줄의 빈 자리에 세웁니다.</li>
                <li>짝이 맞는 탑만 맞힙니다. 헛발인 탑은 낱말 카드 {config.remove_cost}장으로 헐 수 있습니다.</li>
                <li>탑은 {config.tower_slots}개까지 세울 수 있고, 물결이 끝나면 흩어집니다.</li>
                <li>바닥에 닿으면 생명이 하나 줄고, 생명 {config.lives}개가 다하면 판이 끝납니다.</li>
              </ol>
              <button type="button" className={styles.big} onClick={start}>시작</button>
            </div>
          </div>
        )}

        {phase === 'brief' && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <p className={styles.muted}>{wave.index + 1}번째 물결</p>
              <h2>{wave.label}</h2>
              <p>
                {wave.enemies.length}개가 내려옵니다. 서로 다른 말은 {wave.poolIds.length}개이고, 같은 말은 같은 줄로만
                옵니다. 마지막 하나는 크고 느리게 오는 대신 점수가 {config.boss.score_scale}곱입니다.
              </p>
              <button type="button" className={styles.big} onClick={beginWave}>물결 맞기</button>
            </div>
          </div>
        )}

        {phase === 'wave' && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <h2>{s.waveIndex + 1}번째 물결을 막았습니다</h2>
              <p>
                지금까지 {num(s.kills)}개를 맞혔고 점수는 {num(s.score)}점입니다. 낱말 카드{' '}
                {config.reward.per_wave}장을 받았습니다.
              </p>
              <p className={styles.small}>
                다음 물결은 낱말이 통째로 바뀝니다. 세웠던 탑은 흩어지고 자리는 다시 빕니다.
              </p>
              <button
                type="button"
                className={styles.big}
                onClick={() => {
                  const now = g.current;
                  now.waveIndex += 1;
                  commit((prev) => earn(prev, config.reward.per_wave));
                  setPhase('brief');
                }}
              >
                다음 물결
              </button>
            </div>
          </div>
        )}

        {phase === 'over' && (
          /* 끝난 판에는 순위판이 함께 뜬다. 판 넓이(460px) 안에 가두면 목록이 눌린다 */
          <div className={`${styles.veil} ${styles.veilFull}`}>
            <div className={styles.sheetWide}>
              <h2>{s.clearedWaves >= config.waves.length ? '끝까지 막았습니다' : '판이 끝났습니다'}</h2>
              <p>
                물결 {s.clearedWaves}개를 넘겼고 {num(s.kills)}개를 맞혔습니다. 점수는 {num(s.score)}점,
                낱말 카드 {num(reward(s.clearedWaves, config))}장을 받았습니다.
              </p>

              <Ranking
                game="defense"
                score={s.score}
                ticket={ticket.current}
                save={save}
                onSave={commit}
                unit="점"
              />

              <div className={styles.overFoot}>
                <button type="button" onClick={start}>다시 하기</button>
                <Link href="/배움터/사전편찬소">사전 편찬소로</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 맞힌 짝을 잠깐 보여 준다. 학습 접점은 이 한 줄이다 */}
      <div className={styles.strip} aria-live="polite">
        {flashing ? (
          <span className={styles.pair}>
            <b>{flashing.from}</b> 대신 <b className={styles.pine}>{flashing.ko}</b>
          </span>
        ) : (
          <span className={styles.muted}>
            {phase === 'play'
              ? `남은 말 ${wave.enemies.filter((e) => !s.done.has(e.key)).length}개 · 세운 탑 ${s.towers.length}/${config.tower_slots}`
              : '맞힌 낱말의 짝이 여기에 잠깐 보입니다.'}
          </span>
        )}
      </div>

      {/* 손패 */}
      <div className={styles.hand}>
        {(s?.hand || Array(config.hand_size).fill(null)).map((id, i) => (
          <button
            key={`${id}-${i}`}
            type="button"
            className={`${styles.card} ${picked === i ? styles.cardOn : ''}`}
            onClick={() => setPicked(picked === i ? null : i)}
            disabled={phase !== 'play'}
          >
            {id ? word(id).ko : '—'}
          </button>
        ))}
        <span className={styles.handHint}>
          {picked === null ? '탑으로 세울 우리말을 고르세요.' : '세울 빈 자리를 누르세요.'}
        </span>
      </div>
    </div>
  );
}
