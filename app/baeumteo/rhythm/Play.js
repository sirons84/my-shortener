'use client';

/* 한글 리듬 — 네 줄로 떨어지는 글자를 판정선에서 친다 (기획서 §8-5)
   악보와 판정은 lib/baeumteo/rhythm.js 에 있다. 여기는 소리와 시간과 손이 닿는 자리다.

   시간의 기준은 음원(audio.currentTime)이다. 화면 시계로 재면 곡과 어긋난다.
   판은 ref 에 두고 캔버스에 직접 그린다. 화면 상태는 국면과 셈판만 안다. */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from './page.module.css';
import config from '../../../data/games/rhythm.json';
import { JUDGE_LABEL, buildChart, comboCards, judge } from '../../../lib/baeumteo/rhythm';
import { earn, emptySave, loadSave, recordProgress, writeSave } from '../../../lib/baeumteo/save';
import Ranking from '../Ranking';

const FX_MS = 420; // 판정 글씨가 떠 있는 시간
const WORD_MS = 1100; // 낱말이 크게 보이는 시간
const HUD_MS = 120;

const PAL = {
  ink: '#1f1d1a',
  paper: '#faf8f2',
  paper2: '#f3efe5',
  rule: '#d8d2c4',
  pine: '#2f4a3e',
  muted: '#6f6a60',
  alarm: '#8a3b2e',
  wood: '#c9a878',
  woodDark: '#5a3d24',
};

function num(n) {
  return Math.floor(n).toLocaleString('ko-KR');
}

export default function Play({ brushClassName }) {
  const [save, setSave] = useState(emptySave);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState('ready'); // ready | loading | play | over
  const [, setFrame] = useState(0);
  const [bigWord, setBigWord] = useState(null); // 방금 끝난 낱말
  const [loadMsg, setLoadMsg] = useState('');

  const track = config.tracks[0];

  const g = useRef(null);
  const raf = useRef(0);
  const audio = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const ticket = useRef('');
  const phaseRef = useRef(phase);
  const wordTimer = useRef(0);

  useEffect(() => {
    setSave(loadSave());
    setReady(true);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const commit = useCallback((updater) => {
    setSave((prev) => writeSave(typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  // ── 소리 ───────────────────────────────────────────────────────

  useEffect(() => {
    const el = new Audio(track.file);
    el.preload = 'auto';
    audio.current = el;
    return () => {
      el.pause();
      el.src = '';
    };
  }, [track.file]);

  // 다른 탭에 가면 곡을 멈춘다. 돌아오면 이어 간다
  useEffect(() => {
    const onVis = () => {
      const el = audio.current;
      if (!el || phaseRef.current !== 'play') return;
      if (document.hidden) el.pause();
      else el.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  /** 지금 곡의 시각(ms) */
  const songNow = () => (audio.current ? audio.current.currentTime * 1000 : 0);

  // ── 판 짜기 ────────────────────────────────────────────────────

  const start = async (muted) => {
    const el = audio.current;
    if (!el) return;
    setPhase('loading');
    setLoadMsg('곡을 불러오는 중입니다.');

    g.current = {
      notes: buildChart(config, track),
      next: 0, // 아직 판정선을 지나지 않은 첫 음표
      score: 0,
      combo: 0,
      maxCombo: 0,
      counts: { good: 0, ok: 0, miss: 0 },
      cards: 0,
      fx: [],
      hudAt: 0,
      last: -1,
    };

    // 단추를 누른 손길이 식기 전에 먼저 튼다. 브라우저는 손길 없는 재생을 막는다
    el.muted = !!muted;
    el.currentTime = 0;
    try {
      await el.play();
    } catch {
      setLoadMsg('곡을 틀 수 없습니다. 브라우저가 소리를 막았을 수 있습니다. 다시 눌러 보세요.');
      setPhase('ready');
      return;
    }

    // 순위판에 낼 표. 못 받아도 판은 돈다 (순위판에만 못 오른다)
    ticket.current = '';
    try {
      const res = await fetch('/api/baeumteo/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'rhythm' }),
      });
      if (res.ok) ticket.current = (await res.json()).ticket || '';
    } catch {
      /* 순위판 없이 논다 */
    }

    setLoadMsg('');
    setPhase('play');
  };

  // ── 판정 ───────────────────────────────────────────────────────

  const addFx = (s, lane, kind, now) => {
    s.fx = [...s.fx.filter((f) => now - f.at < FX_MS), { lane, kind, at: now }];
  };

  const showWord = (note) => {
    setBigWord({ ko: note.ko, from: note.from, key: note.id });
    clearTimeout(wordTimer.current);
    wordTimer.current = setTimeout(() => setBigWord(null), WORD_MS);
  };

  const settle = (s, note, kind, now) => {
    note.done = kind;
    s.counts[kind] += 1;
    if (kind === 'miss') {
      s.combo = 0;
    } else {
      s.score += config.score[kind];
      s.combo += 1;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
      s.cards += comboCards(s.combo, config);
    }
    addFx(s, note.lane, kind, now);
    if (note.last) showWord(note);
  };

  const hit = (lane) => {
    const s = g.current;
    if (!s || phaseRef.current !== 'play') return;
    const now = songNow();
    // 그 줄에서 판정 창 안에 든 가장 가까운 음표
    let best = null;
    for (let i = s.next; i < s.notes.length; i += 1) {
      const n = s.notes[i];
      if (n.t - now > config.judge.ok_ms) break;
      if (n.done || n.lane !== lane) continue;
      if (!best || Math.abs(n.t - now) < Math.abs(best.t - now)) best = n;
    }
    if (!best) return; // 헛손질은 벌이 없다. 저학년 입구다
    const kind = judge(best.t - now, config);
    if (kind) settle(s, best, kind, now);
  };

  // ── 손 ─────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return;
      const lane = config.keys.indexOf(e.code);
      if (lane < 0) return;
      if (phaseRef.current === 'play') e.preventDefault();
      hit(lane);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
    // hit 은 ref 만 만진다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const lane = Math.min(config.lanes - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * config.lanes)));
    hit(lane);
  };

  // ── 그리기 ─────────────────────────────────────────────────────

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const s = g.current;
    if (!canvas || !wrap) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const laneW = W / config.lanes;
    const judgeY = H * 0.8;
    const font = window.getComputedStyle(wrap).fontFamily;

    ctx.fillStyle = PAL.paper2;
    ctx.fillRect(0, 0, W, H);

    // 줄
    ctx.strokeStyle = PAL.rule;
    ctx.lineWidth = 1;
    for (let i = 1; i < config.lanes; i += 1) {
      ctx.beginPath();
      ctx.moveTo(Math.round(i * laneW) + 0.5, 0);
      ctx.lineTo(Math.round(i * laneW) + 0.5, H);
      ctx.stroke();
    }

    // 판정선과 글쇠 이름
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, judgeY - 2, W, 3);
    ctx.font = `600 15px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < config.lanes; i += 1) {
      ctx.fillStyle = PAL.muted;
      ctx.fillText(config.key_labels[i], (i + 0.5) * laneW, judgeY + 28);
    }

    if (!s) return;
    const now = songNow();
    const speed = judgeY / config.fall_ms; // px per ms

    // 음표. 종이쪽지에 글자 하나
    const noteW = Math.min(64, laneW * 0.62);
    const noteH = 48;
    for (let i = s.next; i < s.notes.length; i += 1) {
      const n = s.notes[i];
      const y = judgeY - (n.t - now) * speed;
      if (y < -noteH) break;
      if (n.done) continue;
      const x = (n.lane + 0.5) * laneW;
      ctx.fillStyle = PAL.paper;
      ctx.fillRect(x - noteW / 2, y - noteH / 2, noteW, noteH);
      ctx.strokeStyle = n.first ? PAL.pine : PAL.ink;
      ctx.lineWidth = n.first ? 2 : 1;
      ctx.strokeRect(x - noteW / 2 + 0.5, y - noteH / 2 + 0.5, noteW - 1, noteH - 1);
      // 압정
      ctx.fillStyle = PAL.alarm;
      ctx.fillRect(x - 3, y - noteH / 2 + 3, 6, 6);
      ctx.fillStyle = PAL.ink;
      ctx.font = `700 26px ${font}`;
      ctx.fillText(n.ch, x, y + 4);
    }

    // 판정 글씨
    for (const f of s.fx) {
      const age = now - f.at;
      if (age < 0 || age > FX_MS) continue;
      const k = age / FX_MS;
      const x = (f.lane + 0.5) * laneW;
      ctx.globalAlpha = 1 - k;
      if (f.kind !== 'miss') {
        ctx.strokeStyle = f.kind === 'good' ? PAL.pine : PAL.ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, judgeY, 14 + k * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = f.kind === 'good' ? PAL.pine : f.kind === 'ok' ? PAL.ink : PAL.alarm;
      ctx.font = `700 18px ${font}`;
      ctx.fillText(JUDGE_LABEL[f.kind], x, judgeY - 40 - k * 24);
      ctx.globalAlpha = 1;
    }
  }, []);

  useEffect(() => {
    if (phase !== 'play') paint();
  }, [phase, ready, paint]);

  // ── 시간 ───────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'play') return undefined;

    const tick = (frameNow) => {
      const s = g.current;
      const el = audio.current;
      if (!s || !el) return;
      const now = el.currentTime * 1000;

      // 판정선을 한참 지난 음표는 놓친 것이다
      while (s.next < s.notes.length) {
        const n = s.notes[s.next];
        if (n.done) {
          s.next += 1;
          continue;
        }
        if (now - n.t > config.judge.ok_ms) {
          settle(s, n, 'miss', now);
          s.next += 1;
          continue;
        }
        break;
      }

      paint();
      if (frameNow - s.hudAt > HUD_MS) {
        s.hudAt = frameNow;
        setFrame((k) => k + 1);
      }

      const lastT = s.notes.length ? s.notes[s.notes.length - 1].t : 0;
      if (el.ended || (s.next >= s.notes.length && now > lastT + 1200)) {
        el.pause();
        setPhase('over');
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // settle·paint 는 ref 만 만진다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── 판이 끝났을 때 ─────────────────────────────────────────────

  const finished = useRef(false);
  useEffect(() => {
    if (phase !== 'over' || !g.current || finished.current) return;
    finished.current = true;
    const s = g.current;
    commit((prev) =>
      recordProgress(earn(prev, s.cards), 'rhythm', {
        [track.id]: {
          best_score: Math.max(Number(prev.progress?.rhythm?.[track.id]?.best_score) || 0, s.score),
          best_combo: Math.max(Number(prev.progress?.rhythm?.[track.id]?.best_combo) || 0, s.maxCombo),
        },
      }),
    );
  }, [phase, commit, track.id]);

  useEffect(() => {
    if (phase === 'ready') finished.current = false;
  }, [phase]);

  // ── 화면 ───────────────────────────────────────────────────────

  const s = g.current;

  if (!ready) {
    return (
      <div className={styles.game}>
        <p className={styles.empty}>불러오는 중입니다.</p>
      </div>
    );
  }

  const total = s ? s.notes.length : 0;
  const played = s ? s.counts.good + s.counts.ok + s.counts.miss : 0;

  return (
    <div className={styles.game}>
      <div className={styles.counter}>
        <div>
          <span className={styles.muted}>점수</span> <b className={styles.score}>{s ? num(s.score) : 0}</b>
        </div>
        <div>
          <span className={styles.muted}>콤보</span> <b>{s ? num(s.combo) : 0}</b>
        </div>
        <div>
          <span className={styles.muted}>낱말 카드</span> <b>{s ? num(s.cards) : 0}</b>
        </div>
        <div className={styles.spacer} />
        <div className={styles.trackTag}>
          {track.title} · {track.bpm} BPM{total ? ` · ${played}/${total}` : ''}
        </div>
      </div>

      <div className={styles.field} ref={wrapRef}>
        <canvas ref={canvasRef} className={styles.canvas} onPointerDown={tap} aria-label="네 줄 판정판" />

        {/* 끝난 낱말이 잠깐 크게 보인다. 학습 접점은 이 순간이다 */}
        {bigWord && phase === 'play' && (
          <div key={bigWord.key} className={styles.bigWord}>
            <span className={`${styles.bigKo} ${brushClassName || ''}`}>{bigWord.ko}</span>
            <span className={styles.bigFrom}>{bigWord.from} 대신 쓰는 말</span>
          </div>
        )}

        {(phase === 'ready' || phase === 'loading') && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <h2>한글 리듬</h2>
              <ol className={styles.rules}>
                <li>글자가 네 줄로 떨어집니다. 판정선에 닿을 때 그 줄의 글쇠를 누르세요.</li>
                <li>
                  글쇠는 {config.key_labels.join(' ')} 입니다. 화면을 눌러도 됩니다. 판을 네 칸으로 나눠 그 칸을 누르세요.
                </li>
                <li>딱 맞으면 좋아, 조금 어긋나면 괜찮아, 지나치면 놓침입니다. 헛손질은 벌이 없습니다.</li>
                <li>한 낱말의 글자가 차례로 옵니다. 낱말이 끝나면 잠깐 크게 보입니다.</li>
                <li>
                  콤보 {config.combo_reward.every}마다 낱말 카드 {config.combo_reward.cards}장. 점수로 순위를 남깁니다.
                </li>
              </ol>
              <p className={styles.small}>
                곡 「{track.title}」 · {Math.round((track.end_ms || track.duration_ms) / 60000)}분 · {track.license}
              </p>
              {loadMsg && <p className={styles.msg}>{loadMsg}</p>}
              <div className={styles.row}>
                <button type="button" className={styles.big} onClick={() => start(false)} disabled={phase === 'loading'}>
                  소리 켜고 시작
                </button>
                <button type="button" onClick={() => start(true)} disabled={phase === 'loading'}>
                  소리 없이 시작
                </button>
              </div>
              <p className={styles.small}>교실에서는 소리 없이 시작을 권합니다. 박자는 화면으로 봅니다.</p>
            </div>
          </div>
        )}

        {phase === 'over' && s && (
          <div className={`${styles.veil} ${styles.veilFull}`}>
            <div className={styles.sheetWide}>
              <h2>곡이 끝났습니다</h2>
              <p>
                {num(s.score)}점. 가장 길게 이은 콤보는 {num(s.maxCombo)}이고, 낱말 카드 {num(s.cards)}장을 받았습니다.
              </p>
              <ul className={styles.tally}>
                <li>
                  <span className={styles.pine}>{JUDGE_LABEL.good}</span> {num(s.counts.good)}
                </li>
                <li>
                  {JUDGE_LABEL.ok} {num(s.counts.ok)}
                </li>
                <li>
                  <span className={styles.alarm}>{JUDGE_LABEL.miss}</span> {num(s.counts.miss)}
                </li>
              </ul>

              <Ranking game="rhythm" score={s.score} ticket={ticket.current} save={save} onSave={commit} unit="점" />

              <div className={styles.overFoot}>
                <button type="button" onClick={() => setPhase('ready')}>
                  다시 하기
                </button>
                <Link href="/배움터/사전편찬소">사전 편찬소로</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.strip} aria-live="polite">
        <span className={styles.muted}>
          {phase === 'play'
            ? '판정선에 닿을 때 누르세요. 낱말의 첫 글자는 초록 테두리입니다.'
            : `글쇠 ${config.key_labels.join(' · ')} 또는 화면 누르기`}
        </span>
      </div>
    </div>
  );
}
