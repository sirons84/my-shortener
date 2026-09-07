'use client';

/* 반 코드 — 교사가 만들고, 학생이 받아 적는다 (기획서 §7, 데이터설계 §5)

   반을 만든 열쇠는 만든 브라우저에만 남는다. 그 열쇠가 없으면 반을 지우거나
   반 기록을 지울 수 없다. 서버에는 열쇠의 해시만 있다. */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import styles from './page.module.css';
import { SCHOOL_MAX } from '../../../lib/baeumteo/nick';
import { parseClassCode } from '../../../lib/baeumteo/classCode';
import { forgetClass, loadKeys, rememberClass } from '../../../lib/baeumteo/keys';
import { emptySave, loadSave, writeSave } from '../../../lib/baeumteo/save';
import { getWord, words } from '../../../lib/baeumteo/words';

function num(n) {
  return Math.floor(n).toLocaleString('ko-KR');
}

export default function Room() {
  const [save, setSave] = useState(emptySave);
  const [keys, setKeys] = useState({ scores: {}, classes: {} });
  const [ready, setReady] = useState(false);

  const [room, setRoom] = useState(null); // 지금 보고 있는 반
  const [scores, setScores] = useState(null);
  const [board, setBoard] = useState('dictionary'); // 어느 게임의 순위판을 볼까
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [codeInput, setCodeInput] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState(0);
  const [klass, setKlass] = useState(0);

  useEffect(() => {
    const loaded = loadSave();
    setSave(loaded);
    setKeys(loadKeys());
    setCodeInput(loaded.class_code || '');
    setReady(true);
  }, []);

  const commit = useCallback((updater) => {
    setSave((prev) => writeSave(typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  /** 반의 순위판만 다시 읽는다 */
  const loadScores = useCallback(async (code, game) => {
    setScores(null);
    try {
      const res = await fetch(`/api/baeumteo/scores?game=${game}&tab=solo&code=${encodeURIComponent(code)}`);
      setScores(res.ok ? (await res.json()).rows : []);
    } catch {
      setScores([]);
    }
  }, []);

  const openRoom = useCallback(
    async (code) => {
      setMsg('');
      setScores(null);
      try {
        const res = await fetch(`/api/baeumteo/classes?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!res.ok) {
          setRoom(null);
          setMsg(data.error || '반을 열지 못했습니다.');
          return null;
        }
        setRoom(data);
        await loadScores(code, board);
        return data;
      } catch {
        setMsg('반을 열지 못했습니다. 잠시 뒤에 다시 해 주세요.');
        return null;
      }
    },
    [board, loadScores],
  );

  // 순위판을 바꾸면 그 게임 기록만 다시 읽는다
  useEffect(() => {
    if (room) loadScores(room.code, board);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // 이미 적어 둔 반이 있으면 바로 연다
  useEffect(() => {
    if (ready && save.class_code) openRoom(save.class_code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── 교사 ───────────────────────────────────────────────────────

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/baeumteo/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school, grade, class: klass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || '반을 만들지 못했습니다.');
        return;
      }
      setKeys(rememberClass(data.code, data.owner_key));
      setCodeInput(data.code);
      setRoom(data);
      setScores([]);
      setMsg(`반 코드 ${data.code} 를 만들었습니다. 학급에 이 코드를 적어 주세요.`);
    } finally {
      setBusy(false);
    }
  };

  const dropRoom = async (code) => {
    setBusy(true);
    try {
      const res = await fetch('/api/baeumteo/classes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, owner_key: keys.classes[code] }),
      });
      if (!res.ok) {
        setMsg('반을 지우지 못했습니다.');
        return;
      }
      setKeys(forgetClass(code));
      if (room?.code === code) {
        setRoom(null);
        setScores(null);
      }
      if (save.class_code === code) commit((prev) => ({ ...prev, class_code: '' }));
      setMsg('반과 그 반의 기록을 지웠습니다.');
    } finally {
      setBusy(false);
    }
  };

  const eraseScore = async (id, code) => {
    const res = await fetch('/api/baeumteo/scores', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, owner_key: keys.classes[code], erase_key: keys.scores[id] }),
    });
    if (!res.ok) {
      setMsg('기록을 지우지 못했습니다.');
      return;
    }
    setScores((prev) => (prev || []).filter((row) => row.id !== id));
  };

  // ── 학생 ───────────────────────────────────────────────────────

  const join = async (event) => {
    event.preventDefault();
    const parsed = parseClassCode(codeInput);
    if (!parsed.ok) {
      setMsg(parsed.reason);
      return;
    }
    setBusy(true);
    try {
      const found = await openRoom(parsed.code);
      if (found) {
        commit((prev) => ({ ...prev, class_code: parsed.code }));
        setMsg(`${parsed.code} 반에 들어왔습니다.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    commit((prev) => ({ ...prev, class_code: '' }));
    setRoom(null);
    setScores(null);
    setCodeInput('');
    setMsg('이 기기에서 반 코드를 지웠습니다. 남긴 기록은 그대로 있습니다.');
  };

  const share = async () => {
    if (!room) return;
    setBusy(true);
    try {
      const res = await fetch('/api/baeumteo/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: room.code, entries: save.dict.known }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || '반 사전에 얹지 못했습니다.');
        return;
      }
      setRoom(data);
      setMsg('내가 실은 낱말을 반 사전에 얹었습니다.');
    } finally {
      setBusy(false);
    }
  };

  // ── 화면 ───────────────────────────────────────────────────────

  if (!ready) return <div className={styles.body}><p className={styles.small}>불러오는 중입니다.</p></div>;

  const mine = Object.keys(keys.classes);
  const isOwner = room ? !!keys.classes[room.code] : false;
  const roomEntries = (room?.entries || []).map(getWord).filter(Boolean);
  const notShared = save.dict.known.filter((id) => !(room?.entries || []).includes(id));

  return (
    <div className={styles.body}>
      {msg && (
        <p className={styles.notice}>
          {msg}
          <button type="button" onClick={() => setMsg('')}>닫기</button>
        </p>
      )}

      <div className={styles.cols}>
        {/* 학생 */}
        <section className={styles.col}>
          <h2>반에 들어가기</h2>
          <p className={styles.small}>선생님이 알려 준 코드를 그대로 적으세요.</p>

          <form className={styles.row} onSubmit={join}>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="화진-5-1-K2P7"
              maxLength={24}
              aria-label="반 코드"
            />
            <button type="submit" disabled={busy || !codeInput.trim()}>들어가기</button>
          </form>

          {save.class_code && (
            <p className={styles.small}>
              지금 반: <b>{save.class_code}</b>{' '}
              <button type="button" className={styles.linkish} onClick={leave}>반 코드 지우기</button>
            </p>
          )}
        </section>

        {/* 교사 */}
        <section className={styles.col}>
          <h2>반 만들기 (선생님)</h2>
          <p className={styles.small}>
            학교 약칭과 학년·반을 적으면 코드가 나옵니다. 반을 다루는 열쇠는 이 브라우저에만 남으니,
            반을 만든 기기를 기억해 두세요.
          </p>

          <form className={styles.row} onSubmit={create}>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="화진"
              maxLength={SCHOOL_MAX}
              aria-label="학교 약칭"
              required
            />
            <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} aria-label="학년">
              <option value={0}>학년</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}학년</option>
              ))}
            </select>
            <select value={klass} onChange={(e) => setKlass(Number(e.target.value))} aria-label="반">
              <option value={0}>반</option>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}반</option>
              ))}
            </select>
            <button type="submit" disabled={busy}>만들기</button>
          </form>

          {mine.length > 0 && (
            <ul className={styles.mine}>
              {mine.map((code) => (
                <li key={code}>
                  <button type="button" className={styles.linkish} onClick={() => openRoom(code)}>{code}</button>
                  <span className={styles.spacer} />
                  <button type="button" className={styles.erase} onClick={() => dropRoom(code)} disabled={busy}>
                    반 지우기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 반 화면 */}
      {room && (
        <section className={styles.room}>
          <header className={styles.roomHead}>
            <h2>
              {room.school} {room.grade}학년 {room.class}반
            </h2>
            <span className={styles.muted}>{room.code}</span>
            {isOwner && <span className={styles.owner}>이 기기가 만든 반</span>}
          </header>

          <div className={styles.cols}>
            {/* 반 공동 사전 */}
            <div className={styles.col}>
              <h3>반 공동 사전</h3>
              <p className={styles.small}>
                {num(roomEntries.length)}개 실림 · 전체 {num(words.length)}개
              </p>
              <div className={styles.bar}>
                <span style={{ width: `${Math.min(100, (roomEntries.length / words.length) * 100)}%` }} />
              </div>

              {roomEntries.length === 0 ? (
                <p className={styles.small}>아직 얹은 낱말이 없습니다.</p>
              ) : (
                <ul className={styles.wordList}>
                  {roomEntries.map((word) => (
                    <li key={word.id}>
                      <b>{word.ko}</b>
                      <span className={styles.muted}>{word.from}</span>
                    </li>
                  ))}
                </ul>
              )}

              <button type="button" onClick={share} disabled={busy || notShared.length === 0}>
                {notShared.length === 0
                  ? '얹을 낱말이 없습니다'
                  : `내가 실어 본 낱말 ${num(notShared.length)}개 얹기`}
              </button>
              <p className={styles.small}>얹는 것은 낱말 뿐입니다. 누가 실었는지는 담지 않습니다.</p>
            </div>

            {/* 우리 반 순위판 */}
            <div className={styles.col}>
              <div className={styles.boardHead}>
                <h3>우리 반 순위판</h3>
                <div className={styles.tabs}>
                  {[['dictionary', '사전 편찬소'], ['defense', '우리말 지키기']].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={board === id ? styles.tabOn : ''}
                      onClick={() => setBoard(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {!scores ? (
                <p className={styles.small}>불러오는 중입니다.</p>
              ) : scores.length === 0 ? (
                <p className={styles.small}>
                  아직 기록이 없습니다.{' '}
                  {board === 'dictionary' ? (
                    <Link href="/배움터/사전편찬소">사전 편찬소</Link>
                  ) : (
                    <Link href="/배움터/우리말지키기">우리말 지키기</Link>
                  )}
                  를 한 판 해 보세요.
                </p>
              ) : (
                <ol className={styles.rankList}>
                  {scores.map((row, i) => (
                    <li key={row.id}>
                      <span className={styles.place}>{i + 1}</span>
                      <b>{row.nick}</b>
                      <span className={styles.spacer} />
                      <span className={styles.point}>
                        {num(row.score)}
                        {board === 'dictionary' ? '개' : '점'}
                      </span>
                      {(isOwner || keys.scores[row.id]) && (
                        <button
                          type="button"
                          className={styles.erase}
                          onClick={() => eraseScore(row.id, room.code)}
                        >
                          지우기
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              <p className={styles.small}>
                선생님은 이 반의 기록을 이유 없이 바로 지울 수 있습니다. 반을 만든 기기에서만 됩니다.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
