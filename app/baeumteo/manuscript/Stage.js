'use client';

/* 잃어버린 원고 — 형사의 눈을 피해 원고 상자를 모은다 (기획서 §8-3)
   판을 셈하는 규칙은 lib/baeumteo/manuscript.js, 그리기는 draw.js 에 있다.
   여기는 시간과 손이 닿는 자리다.

   판은 ref 에 두고 캔버스에 직접 그린다. 초당 예순 번 setState 를 하면
   낡은 교실 컴퓨터가 버티지 못한다. 화면 상태는 국면(phase)과 셈판만 안다. */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from './page.module.css';
import config from '../../../data/games/manuscript.json';
import { held, makeWorld, onCaught, reward, stageBoxes, step } from '../../../lib/baeumteo/manuscript';
import { fmtTime } from '../../../lib/baeumteo/time';
import { earn, emptySave, loadSave, recordProgress, writeSave } from '../../../lib/baeumteo/save';
import Ranking from '../Ranking';
import StoryCard from './StoryCard';
import { drawWorld, readPalette } from './draw';

// 키는 code 로 본다. 한글 자판 상태에서도 KeyW 는 KeyW 다
const KEYS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

const DPAD = [
  ['up', '위', [0, -1]],
  ['left', '왼쪽', [-1, 0]],
  ['right', '오른쪽', [1, 0]],
  ['down', '아래', [0, 1]],
];

const HUD_MS = 150; // 셈판을 다시 그리는 간격
const STICK_DEAD = 10; // 손가락이 이만큼은 움직여야 방향으로 본다

export default function Stage() {
  const [save, setSave] = useState(emptySave);
  const [ready, setReady] = useState(false);
  // ready | intro | brief | play | caught | exitAsk | stageClear | ending | over
  const [phase, setPhase] = useState('ready');
  const [, setFrame] = useState(0);

  const g = useRef(null); // 판. 시간마다 바뀌므로 화면 상태로 두지 않는다
  const raf = useRef(0);
  const ticket = useRef('');
  const phaseRef = useRef(phase);
  const canvasRef = useRef(null);
  const palette = useRef(null);

  // 손
  const keys = useRef(new Set());
  const stick = useRef(null);
  const dpad = useRef(null);

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

  // ── 판 짜기 ────────────────────────────────────────────────────

  const start = async () => {
    g.current = {
      world: null,
      done: [], // 끝낸 스테이지 { id, boxes, ms }
      totalBoxes: 0,
      totalMs: 0,
      last: 0,
      hudAt: 0,
      caughtKind: '',
      flash: null,
    };
    setPhase('intro');

    // 순위판에 낼 표. 못 받아도 판은 돈다 (순위판에만 못 오른다)
    ticket.current = '';
    try {
      const res = await fetch('/api/baeumteo/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'manuscript' }),
      });
      if (res.ok) ticket.current = (await res.json()).ticket || '';
    } catch {
      /* 순위판 없이 논다 */
    }
  };

  const beginStage = (index) => {
    const s = g.current;
    s.world = makeWorld(config, index);
    s.flash = null;
    setPhase('brief');
  };

  const finishStage = () => {
    const s = g.current;
    const w = s.world;
    const boxes = held(w);
    s.done.push({ id: w.stage.id, boxes, ms: Math.round(w.elapsed) });
    s.totalBoxes += boxes;
    s.totalMs += Math.round(w.elapsed);
    setPhase('stageClear');
  };

  // ── 손 ─────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e) => {
      if (!KEYS[e.code]) return;
      keys.current.add(e.code);
      // 판이 도는 동안 화살표로 화면이 굴러가면 안 된다
      if (phaseRef.current === 'play') e.preventDefault();
    };
    const up = (e) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  /** 키·손가락·단추가 미는 방향을 한데 모은다 */
  const readInput = () => {
    let dx = 0;
    let dy = 0;
    for (const code of keys.current) {
      dx += KEYS[code][0];
      dy += KEYS[code][1];
    }
    if (stick.current) {
      dx += stick.current.dx;
      dy += stick.current.dy;
    }
    if (dpad.current) {
      dx += dpad.current[0];
      dy += dpad.current[1];
    }
    return { dx, dy };
  };

  // 캔버스를 손가락으로 끌면 그쪽으로 간다 (조이스틱)
  const stickDown = (e) => {
    if (phaseRef.current !== 'play') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    stick.current = { ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 };
  };
  const stickMove = (e) => {
    const st = stick.current;
    if (!st) return;
    const vx = e.clientX - st.ox;
    const vy = e.clientY - st.oy;
    const len = Math.hypot(vx, vy);
    if (len < STICK_DEAD) {
      st.dx = 0;
      st.dy = 0;
    } else {
      st.dx = vx / len;
      st.dy = vy / len;
    }
  };
  const stickUp = () => {
    stick.current = null;
  };

  const press = (dir) => () => {
    dpad.current = dir;
  };
  const release = () => {
    dpad.current = null;
  };

  // ── 캔버스 ─────────────────────────────────────────────────────

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const s = g.current;
    if (!canvas || !s?.world) return;
    if (!palette.current) palette.current = readPalette(canvas);

    const { w, h } = s.world.stage;
    const t = config.tile;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== w * t * dpr || canvas.height !== h * t * dpr) {
      canvas.width = w * t * dpr;
      canvas.height = h * t * dpr;
      canvas.style.aspectRatio = `${w} / ${h}`;
      canvas.style.maxWidth = `${w * t}px`;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWorld(ctx, s.world, config, t, palette.current);
  }, []);

  // 판이 서 있는 국면에서도 지도는 보여야 한다
  useEffect(() => {
    if (phase !== 'play') paint();
  }, [phase, paint]);

  // ── 시간 ───────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'play') return undefined;
    const s = g.current;
    s.last = 0;

    const tick = (now) => {
      const cur = g.current;
      if (!cur?.world) return;

      // 다른 탭에 가 있는 동안에는 판을 멈춰 세운다
      const delta = cur.last && !document.hidden ? Math.min(now - cur.last, 100) : 0;
      cur.last = now;

      const event = step(cur.world, config, readInput(), delta);

      if (event === 'box') {
        cur.flash = { at: cur.world.elapsed, text: `상자 ${held(cur.world)}개째` };
      }

      if (event === 'caught') {
        cur.caughtKind = onCaught(cur.world);
        paint();
        setPhase('caught');
        return;
      }

      if (event === 'exit') {
        const total = stageBoxes(config.stages[cur.world.stageIndex]);
        paint();
        if (held(cur.world) >= total) finishStage();
        else setPhase('exitAsk');
        return;
      }

      paint();
      if (now - cur.hudAt > HUD_MS) {
        cur.hudAt = now;
        setFrame((n) => n + 1);
      }
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, paint]);

  // ── 판이 끝났을 때 ─────────────────────────────────────────────

  const finished = useRef(false);
  useEffect(() => {
    if (phase !== 'over' || !g.current || finished.current) return;
    finished.current = true;

    const s = g.current;
    const full = s.totalBoxes >= config.stages.reduce((n, st) => n + stageBoxes(st), 0);
    const gained = reward(s.totalBoxes, true, config);
    commit((prev) => {
      const before = prev.progress?.manuscript || {};
      const fast = before.fast_ms > 0 ? Math.min(before.fast_ms, s.totalMs) : s.totalMs;
      return recordProgress(earn(prev, gained), 'manuscript', {
        best_boxes: s.totalBoxes,
        cleared: true,
        ...(full ? { fast_ms: fast } : {}),
      });
    });
  }, [phase, commit]);

  useEffect(() => {
    if (phase === 'ready' || phase === 'intro') finished.current = false;
  }, [phase]);

  // ── 화면 ───────────────────────────────────────────────────────

  const known = save.dict.known.length;
  const locked = ready && known < config.unlock_entries;
  const s = g.current;
  const world = s?.world || null;
  const stageDef = world ? config.stages[world.stageIndex] : null;
  const totalInStage = stageDef ? stageBoxes(stageDef) : 0;
  const nowMs = s ? s.totalMs + (world && phase !== 'stageClear' ? world.elapsed : 0) : 0;
  const allBoxes = config.stages.reduce((n, st) => n + stageBoxes(st), 0);

  if (!ready) {
    return (
      <div className={styles.game}>
        <p className={styles.empty}>불러오는 중입니다.</p>
      </div>
    );
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
            먼저 사전 편찬소에서 낱말을 실어 보세요. 이 이야기는 그 사전을 지킨 사람들의 이야기입니다.
          </p>
          <Link href="/배움터/사전편찬소" className={styles.gateLink}>
            사전 편찬소로
          </Link>
        </div>
      </div>
    );
  }

  const flashing = s?.flash && world && world.elapsed - s.flash.at < 1400 ? s.flash : null;
  const seenRatio = world ? Math.min(1, world.seen / config.seen_ms) : 0;

  return (
    <div className={styles.game}>
      {/* 셈판 */}
      <div className={styles.counter}>
        <div>
          <span className={styles.muted}>상자</span>{' '}
          <b className={styles.score}>
            {world ? held(world) : 0}
            <span className={styles.of}>/{totalInStage || allBoxes}</span>
          </b>
        </div>
        <div>
          <span className={styles.muted}>시간</span> <b>{fmtTime(nowMs)}</b>
        </div>
        <div className={styles.seen}>
          <span className={styles.muted}>들킴</span>
          <span className={styles.seenBar}>
            <span style={{ width: `${seenRatio * 100}%` }} />
          </span>
        </div>
        <div className={styles.spacer} />
        <div className={styles.stageTag}>
          {stageDef
            ? `${world.stageIndex + 1}번째 · ${stageDef.name}`
            : `스테이지 ${config.stages.length}개 · 상자 ${allBoxes}개`}
        </div>
      </div>

      {/* 판 */}
      <div className={styles.field}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={stickDown}
          onPointerMove={stickMove}
          onPointerUp={stickUp}
          onPointerCancel={stickUp}
          onLostPointerCapture={stickUp}
          aria-label="골목과 창고 지도"
        />

        {phase === 'ready' && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <h2>잃어버린 원고</h2>
              <ol className={styles.rules}>
                <li>방향키나 아래 단추로 움직입니다. 판을 손가락으로 끌어도 됩니다.</li>
                <li>형사의 부채꼴 시야에 {config.seen_ms / 1000}초 들어가 있으면 잡힙니다. 벽 뒤는 보이지 않습니다.</li>
                <li>잡히면 들고 있던 상자 하나를 그 자리에 두고 출발점으로 돌아갑니다.</li>
                <li>상자를 하나라도 들면 문이 열립니다. 다 모아서 나가면 제일 좋습니다.</li>
                <li>기록은 모은 상자 수와 걸린 시간입니다.</li>
              </ol>
              <p className={styles.small}>이 놀이는 지어낸 이야기입니다. 사건 카드에 적힌 것만 사실입니다.</p>
              <button type="button" className={styles.big} onClick={start}>
                시작
              </button>
            </div>
          </div>
        )}

        {phase === 'intro' && (
          <div className={`${styles.veil} ${styles.veilFull}`}>
            <div className={styles.sheetWide}>
              <StoryCard card={config.story.intro} action="골목으로" onNext={() => beginStage(0)} />
            </div>
          </div>
        )}

        {phase === 'brief' && stageDef && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <p className={styles.muted}>{world.stageIndex + 1}번째</p>
              <h2>{stageDef.name}</h2>
              <p>{stageDef.brief}</p>
              <button type="button" className={styles.big} onClick={() => setPhase('play')}>
                들어가기
              </button>
            </div>
          </div>
        )}

        {phase === 'caught' && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <h2>형사에게 들켰습니다</h2>
              <p>
                {s.caughtKind === 'drop'
                  ? '들고 있던 상자 하나를 그 자리에 두고 출발점으로 돌아갑니다.'
                  : '상자가 없어서 처음부터 다시 합니다.'}
              </p>
              <button type="button" className={styles.big} onClick={() => setPhase('play')}>
                다시
              </button>
            </div>
          </div>
        )}

        {phase === 'exitAsk' && world && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <h2>문 앞입니다</h2>
              <p>
                상자 {held(world)}개를 들었고 {totalInStage - held(world)}개가 남아 있습니다. 지금 나가면 남은 상자는
                기록에 들어가지 않습니다.
              </p>
              <div className={styles.choices}>
                <button type="button" className={styles.big} onClick={finishStage}>
                  지금 나가기
                </button>
                <button type="button" onClick={() => setPhase('play')}>
                  더 찾기
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'stageClear' && world && (
          <div className={styles.veil}>
            <div className={styles.sheet}>
              <h2>{stageDef.name}을 빠져나왔습니다</h2>
              <p>
                상자 {held(world)}/{totalInStage}개, {fmtTime(world.elapsed)}.
                {world.caught > 0 ? ` ${world.caught}번 들켰습니다.` : ' 한 번도 들키지 않았습니다.'}
              </p>
              {world.stageIndex + 1 < config.stages.length ? (
                <button type="button" className={styles.big} onClick={() => beginStage(world.stageIndex + 1)}>
                  다음 · {config.stages[world.stageIndex + 1].name}
                </button>
              ) : (
                <button type="button" className={styles.big} onClick={() => setPhase('ending')}>
                  이야기의 끝
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'ending' && (
          <div className={`${styles.veil} ${styles.veilFull}`}>
            <div className={styles.sheetWide}>
              <StoryCard card={config.story.ending} action="기록 보기" onNext={() => setPhase('over')} />
            </div>
          </div>
        )}

        {phase === 'over' && s && (
          <div className={`${styles.veil} ${styles.veilFull}`}>
            <div className={styles.sheetWide}>
              <h2>{s.totalBoxes >= allBoxes ? '원고를 모두 지켰습니다' : '원고 일부를 지켰습니다'}</h2>
              <p>
                상자 {s.totalBoxes}/{allBoxes}개를 {fmtTime(s.totalMs)}에 옮겼습니다. 낱말 카드{' '}
                {reward(s.totalBoxes, true, config)}장을 받았습니다.
              </p>
              <ul className={styles.stageList}>
                {s.done.map((d, i) => (
                  <li key={d.id}>
                    <span className={styles.muted}>{i + 1}번째 · {config.stages[i].name}</span>
                    <span className={styles.spacer} />
                    <span>상자 {d.boxes}/{stageBoxes(config.stages[i])}</span>
                    <span className={styles.muted}>{fmtTime(d.ms)}</span>
                  </li>
                ))}
              </ul>

              <Ranking
                game="manuscript"
                score={s.totalBoxes}
                ms={s.totalMs}
                ticket={ticket.current}
                save={save}
                onSave={commit}
                unit="개"
                timed
              />

              <div className={styles.overFoot}>
                <button type="button" onClick={start}>
                  다시 하기
                </button>
                <Link href="/배움터/사전편찬소">사전 편찬소로</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 한 줄 */}
      <div className={styles.strip} aria-live="polite">
        {flashing ? (
          <span className={styles.pine}>{flashing.text}</span>
        ) : (
          <span className={styles.muted}>
            {phase === 'play'
              ? world.seen > 0
                ? '보고 있습니다. 벽 뒤로 숨으세요.'
                : held(world) >= totalInStage
                  ? '상자를 다 모았습니다. 문으로 가세요.'
                  : '형사가 등을 돌릴 때 지나가세요.'
              : '방향키 · WASD · 판 끌기 · 아래 단추'}
          </span>
        )}
      </div>

      {/* 손가락 단추 */}
      <div className={styles.dpad} aria-label="움직이기">
        {DPAD.map(([id, label, dir]) => (
          <button
            key={id}
            type="button"
            className={`${styles.pad} ${styles[`pad_${id}`]}`}
            onPointerDown={press(dir)}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            onContextMenu={(e) => e.preventDefault()}
            disabled={phase !== 'play'}
            aria-label={label}
          >
            {id === 'up' ? '▲' : id === 'down' ? '▼' : id === 'left' ? '◀' : '▶'}
          </button>
        ))}
      </div>
    </div>
  );
}
