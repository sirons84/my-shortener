'use client';

/* 외솔의 서재 — 방 셋을 오가며 단서 셋을 차례로 푼다 (기획서 §8-4)
   답을 맞춰 보는 셈과 단서의 재료는 lib/baeumteo/study.js 에 있다.
   여기는 방과 손이 닿는 자리다.

   틀려도 끝나지 않는다. 틀리면 힌트가 한 단계 열릴 뿐이다.
   학급 모드는 교사가 한 화면으로 띄우는 것이라 글씨와 단추가 크고, 사전 잠금을
   묻지 않는 대신 낱말 카드도 주지 않는다. */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import styles from './page.module.css';
import config from '../../../data/games/study.json';
import { MAX_HINTS, check, material, openHint, playableClues, shuffle } from '../../../lib/baeumteo/study';
import { earn, emptySave, loadSave, recordProgress, writeSave } from '../../../lib/baeumteo/save';
import { getAsset } from '../../../lib/oesol';
import { josa } from '../../../lib/baeumteo/hangul';

const CLUES = playableClues(config);
const DIGITS = 4;

function roomOf(id) {
  return config.rooms.find((r) => r.id === id);
}

export default function Escape({ brushClassName }) {
  const [save, setSave] = useState(emptySave);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState(null); // solo | class
  const [phase, setPhase] = useState('ready'); // ready | play | done
  const [room, setRoom] = useState(config.rooms[0].id);
  const [solved, setSolved] = useState([]);
  const [hints, setHints] = useState({});
  const [msg, setMsg] = useState('');
  const [gained, setGained] = useState(0);

  // 손에 든 답
  const [text, setText] = useState('');
  const [digits, setDigits] = useState(Array(DIGITS).fill(0));
  const [picks, setPicks] = useState([]);
  const [deck, setDeck] = useState([]); // 순서 맞추기 쪽지, 섞은 차례

  useEffect(() => {
    setSave(loadSave());
    setReady(true);
  }, []);

  const commit = useCallback((updater) => {
    setSave((prev) => writeSave(typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const known = save.dict.known.length;
  const locked = ready && known < config.unlock_entries;

  const current = CLUES.find((c) => !solved.includes(c.id)) || null;
  const totalHints = Object.values(hints).reduce((n, h) => n + h, 0);

  // ── 시작·끝 ────────────────────────────────────────────────────

  const start = (which) => {
    setMode(which);
    setSolved([]);
    setHints({});
    setMsg('');
    setText('');
    setDigits(Array(DIGITS).fill(0));
    setPicks([]);
    const order = CLUES.find((c) => c.type === 'order');
    setDeck(order ? shuffle(material(order).items) : []);
    setRoom(CLUES[0]?.room || config.rooms[0].id);
    setGained(0);
    setPhase('play');
  };

  const finish = (which, usedHints) => {
    setPhase('done');
    if (which === 'class') {
      setGained(0);
      return;
    }
    commit((prev) => {
      const before = prev.progress?.study || {};
      const first = !before.cleared;
      const reward = first || !config.reward.once ? config.reward.clear : 0;
      setGained(reward);
      return recordProgress(earn(prev, reward), 'study', {
        cleared: true,
        clears: (Number(before.clears) || 0) + 1,
        hints_used: usedHints,
      });
    });
  };

  // ── 답 맞춰 보기 ───────────────────────────────────────────────

  const answer = (clue, input) => {
    if (check(clue, input)) {
      const nextSolved = [...solved, clue.id];
      setSolved(nextSolved);
      setMsg('');
      setText('');
      setPicks([]);
      if (nextSolved.length >= CLUES.length) finish(mode, totalHints);
      return;
    }

    const opened = openHint(hints[clue.id]);
    setHints({ ...hints, [clue.id]: opened });
    setMsg(
      opened > (hints[clue.id] || 0)
        ? '맞지 않습니다. 힌트가 하나 열렸습니다.'
        : '맞지 않습니다. 힌트를 다시 읽어 보세요.',
    );
  };

  const turn = (i, delta) => {
    setDigits((prev) => prev.map((d, k) => (k === i ? (d + delta + 10) % 10 : d)));
  };

  const pick = (id) => {
    setPicks((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // ── 화면 ───────────────────────────────────────────────────────

  if (!ready) {
    return (
      <div className={styles.game}>
        <p className={styles.empty}>불러오는 중입니다.</p>
      </div>
    );
  }

  if (CLUES.length === 0) {
    return (
      <div className={styles.game}>
        <p className={styles.empty}>단서의 출처를 확인하는 중입니다. 확인이 끝나면 열립니다.</p>
      </div>
    );
  }

  const wrap = `${styles.game} ${mode === 'class' ? styles.classMode : ''}`;

  if (phase === 'ready') {
    return (
      <div className={wrap}>
        <div className={styles.sheet}>
          <h2>외솔의 서재</h2>
          <ol className={styles.rules}>
            <li>책장, 책상, 창가를 오가며 단서 {CLUES.length}개를 차례로 풉니다.</li>
            <li>틀려도 끝나지 않습니다. 틀릴 때마다 힌트가 하나씩 열립니다(최대 {MAX_HINTS}개).</li>
            <li>단서는 외솔의 말과 연표에서 나옵니다. 첫 화면의 연표를 열어 두고 풀어도 됩니다.</li>
            <li>다 풀면 낱말 카드 {config.reward.clear}장. 순위는 없습니다.</li>
          </ol>
          <div className={styles.modes}>
            {config.modes.map((m) => {
              const off = m.id === 'solo' && locked;
              return (
                <div key={m.id} className={styles.mode}>
                  <button type="button" className={styles.big} onClick={() => start(m.id)} disabled={off}>
                    {m.name}
                  </button>
                  <p className={styles.small}>
                    {off
                      ? `사전에 낱말 ${config.unlock_entries}개를 실어 보면 열립니다. 지금까지 ${known}개입니다.`
                      : m.desc}
                    {m.id === 'class' && ' 낱말 카드는 주지 않습니다.'}
                  </p>
                </div>
              );
            })}
          </div>
          {locked && (
            <p className={styles.small}>
              <Link href="/배움터/사전편찬소">사전 편찬소로</Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className={wrap}>
        <div className={styles.sheet}>
          <h2>서재를 나왔습니다</h2>
          <p>{config.found}</p>
          <p>
            힌트를 {totalHints}개 열었습니다.
            {mode === 'class'
              ? ' 학급 모드는 낱말 카드를 주지 않습니다.'
              : gained > 0
                ? ` 낱말 카드 ${gained}장을 받았습니다.`
                : ' 낱말 카드는 처음 나왔을 때 한 번만 받습니다.'}
          </p>

          <h3 className={styles.recapHead}>오늘 찾은 것</h3>
          <ul className={styles.recap}>
            {CLUES.map((clue) => {
              const m = material(clue);
              return (
                <li key={clue.id}>
                  <span className={styles.muted}>{roomOf(clue.room).name}</span>
                  {clue.type === 'quote_fill' && (
                    <span>
                      「{m.full}」 <span className={styles.small}>{m.source}</span>
                    </span>
                  )}
                  {clue.type === 'date_lock' && (
                    <span>
                      {m.year}년, {m.title}
                    </span>
                  )}
                  {clue.type === 'order' && (
                    <span>{m.items.map((it) => `${it.year} ${it.title}`).join(' → ')}</span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className={styles.overFoot}>
            <button type="button" onClick={() => start(mode)}>
              다시 풀기
            </button>
            <button type="button" onClick={() => setPhase('ready')}>
              모드 고르기
            </button>
            <Link href="/배움터/사전편찬소">사전 편찬소로</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 방 ─────────────────────────────────────────────────────────

  const here = roomOf(room);
  const clue = CLUES.find((c) => c.room === room) || null;
  const isSolved = clue ? solved.includes(clue.id) : false;
  const isCurrent = clue && current && clue.id === current.id;
  const m = clue ? material(clue) : null;
  const opened = clue ? hints[clue.id] || 0 : 0;
  const prevClue = clue ? CLUES[CLUES.indexOf(clue) - 1] : null;
  const nextClue = clue ? CLUES[CLUES.indexOf(clue) + 1] : null;
  const reveal = clue?.reveal && opened >= MAX_HINTS ? getAsset(clue.reveal) : null;

  return (
    <div className={wrap}>
      <div className={styles.counter}>
        <div>
          <span className={styles.muted}>단서</span>{' '}
          <b>
            {solved.length}
            <span className={styles.of}>/{CLUES.length}</span>
          </b>
        </div>
        <div>
          <span className={styles.muted}>연 힌트</span> <b>{totalHints}</b>
        </div>
        <div className={styles.spacer} />
        <div className={styles.modeTag}>{config.modes.find((x) => x.id === mode)?.name}</div>
      </div>

      <div className={styles.tabs}>
        {config.rooms.map((r) => {
          const c = CLUES.find((x) => x.room === r.id);
          const done = c && solved.includes(c.id);
          return (
            <button
              key={r.id}
              type="button"
              className={`${styles.tab} ${room === r.id ? styles.tabOn : ''}`}
              onClick={() => {
                setRoom(r.id);
                setMsg('');
              }}
            >
              {r.name}
              {done && <span className={styles.tabDone}>풀었음</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.room}>
        <h2>{here.name}</h2>
        <p className={styles.desc}>{here.desc}</p>

        {!clue && <p className={styles.small}>여기에는 단서가 없습니다.</p>}

        {clue && isSolved && (
          <div className={styles.solvedBox}>
            <p>{clue.done}</p>
            {clue.type === 'quote_fill' && (
              <p className={`${styles.quote} ${brushClassName || ''}`}>{m.full}</p>
            )}
            {clue.type === 'date_lock' && (
              <p className={styles.fact}>
                {m.year}년 · {m.title}
              </p>
            )}
            {clue.type === 'order' && (
              <ol className={styles.factList}>
                {m.items.map((it) => (
                  <li key={it.id}>
                    <span className={styles.yr}>{it.year}</span> {it.title}
                  </li>
                ))}
              </ol>
            )}
            {nextClue && (
              <button type="button" className={styles.big} onClick={() => setRoom(nextClue.room)}>
                {roomOf(nextClue.room).name}
                {josa(roomOf(nextClue.room).name, '으로/로')}
              </button>
            )}
          </div>
        )}

        {clue && !isSolved && !isCurrent && (
          <p className={styles.lockedNote}>
            아직 열 수 없습니다. 먼저 {roomOf(prevClue.room).name}에서 찾은 것이 필요합니다.
          </p>
        )}

        {clue && isCurrent && (
          <div className={styles.puzzle}>
            <p className={styles.lead}>{clue.lead}</p>

            {clue.type === 'quote_fill' && (
              <form
                className={styles.fill}
                onSubmit={(e) => {
                  e.preventDefault();
                  answer(clue, text);
                }}
              >
                <p className={`${styles.quote} ${brushClassName || ''}`}>{m.blank}</p>
                {reveal && (
                  <figure className={styles.figure}>
                    <Image src={reveal.file} alt={reveal.desc} width={288} height={466} />
                    <figcaption>
                      {reveal.desc} · {reveal.credit}
                    </figcaption>
                  </figure>
                )}
                <div className={styles.row}>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={10}
                    placeholder="지워진 글자"
                    aria-label="지워진 글자"
                  />
                  <button type="submit" className={styles.big} disabled={!text.trim()}>
                    확인
                  </button>
                </div>
              </form>
            )}

            {clue.type === 'date_lock' && (
              <div className={styles.lock}>
                <div className={styles.dials}>
                  {digits.map((d, i) => (
                    <div key={i} className={styles.dial}>
                      <button type="button" onClick={() => turn(i, 1)} aria-label={`${i + 1}째 자리 올리기`}>
                        ▲
                      </button>
                      <span className={styles.digit}>{d}</span>
                      <button type="button" onClick={() => turn(i, -1)} aria-label={`${i + 1}째 자리 내리기`}>
                        ▼
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.big} onClick={() => answer(clue, digits.join(''))}>
                  자물쇠 열기
                </button>
              </div>
            )}

            {clue.type === 'order' && (
              <div className={styles.order}>
                <div className={styles.notes}>
                  {deck.map((it) => {
                    const n = picks.indexOf(it.id);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        className={`${styles.note} ${n >= 0 ? styles.noteOn : ''}`}
                        onClick={() => pick(it.id)}
                      >
                        <span className={styles.noteNum}>{n >= 0 ? n + 1 : '·'}</span>
                        <span>
                          {opened >= MAX_HINTS && <span className={styles.yr}>{it.year} </span>}
                          {it.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.big}
                    onClick={() => answer(clue, picks)}
                    disabled={picks.length !== deck.length}
                  >
                    이 차례로
                  </button>
                  <button type="button" onClick={() => setPicks([])} disabled={picks.length === 0}>
                    다시 고르기
                  </button>
                </div>
              </div>
            )}

            {msg && <p className={styles.msg}>{msg}</p>}

            {opened > 0 && (
              <ol className={styles.hints}>
                {clue.hints.slice(0, opened).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
