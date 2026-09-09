'use client';

/* 울산 말모이 원정대 — 우리 동네 말을 모아 반 지도에 꽂는다 (기획서 §8-6)
   검사 규칙은 lib/baeumteo/malmoi.js, 서버는 api/baeumteo/malmoi 에 있다.

   서버에 쓰기가 있는 유일한 게임이다. 그래서 반 코드가 있어야 올릴 수 있고,
   교사가 확인한 뒤에야 다른 학생에게 보인다. 이름은 어디에도 적지 않는다. */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import styles from './page.module.css';
import config from '../../../data/games/malmoi.json';
import {
  DISTRICTS,
  PLACES,
  RELATIONS,
  checkMeaning,
  checkWord,
  districtName,
  pinSpot,
  placeName,
  relationName,
} from '../../../lib/baeumteo/malmoi';
import { parseClassCode } from '../../../lib/baeumteo/classCode';
import { NICK_MAX } from '../../../lib/baeumteo/nick';
import { earn, emptySave, loadSave, recordProgress, writeSave } from '../../../lib/baeumteo/save';
import { forgetMalmoi, loadKeys, rememberMalmoi, rewardMalmoi } from '../../../lib/baeumteo/keys';
import { oesol } from '../../../lib/oesol';

// 얼개 지도. 실제 경계가 아니라 자리만 어림한 네모다 (지도 API 없이)
const MAP = {
  w: 600,
  h: 420,
  areas: {
    ulju: { x: 0, y: 0, w: 180, h: 420 },
    buk: { x: 180, y: 0, w: 420, h: 130 },
    jung: { x: 180, y: 130, w: 240, h: 110 },
    dong: { x: 420, y: 130, w: 180, h: 110 },
    nam: { x: 180, y: 240, w: 420, h: 180 },
  },
};

const STATUS_LABEL = {
  pending: '확인 기다리는 중',
  approved: '확인됨',
  returned: '돌려보냄',
};

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function Expedition() {
  const [save, setSave] = useState(emptySave);
  const [keys, setKeys] = useState({ scores: {}, classes: {}, malmoi: {} });
  const [ready, setReady] = useState(false);

  const [room, setRoom] = useState(null); // 반 정보
  const [approved, setApproved] = useState(null);
  const [mine, setMine] = useState([]);
  const [all, setAll] = useState(null); // 교사만: 전체 목록
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [codeInput, setCodeInput] = useState('');
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [district, setDistrict] = useState('');
  const [place, setPlace] = useState('');
  const [relation, setRelation] = useState('');
  const [nick, setNick] = useState('');
  const [notes, setNotes] = useState({}); // 교사가 돌려보낼 때 적는 한 줄

  const commit = useCallback((updater) => {
    setSave((prev) => writeSave(typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const code = save.class_code;
  const ownerKey = code ? keys.classes[code] : '';

  // ── 읽기 ───────────────────────────────────────────────────────

  const loadRoom = useCallback(async (c) => {
    try {
      const res = await fetch(`/api/baeumteo/classes?code=${encodeURIComponent(c)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const loadApproved = useCallback(async (c) => {
    try {
      const res = await fetch(`/api/baeumteo/malmoi?code=${encodeURIComponent(c)}`);
      const data = res.ok ? await res.json() : { rows: [] };
      setApproved(data.rows || []);
    } catch {
      setApproved([]);
    }
  }, []);

  const loadMine = useCallback(async (k) => {
    const items = Object.entries(k.malmoi || {}).map(([id, v]) => ({ id, key: v.key }));
    if (items.length === 0) {
      setMine([]);
      return;
    }
    try {
      const res = await fetch('/api/baeumteo/malmoi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = res.ok ? await res.json() : { rows: [] };
      const rows = data.rows || [];
      setMine(rows);

      // 확인된 낱말은 낱말 카드 5장. 한 낱말에 한 번만
      let gained = 0;
      let next = k;
      for (const row of rows) {
        if (row.status === 'approved' && !next.malmoi[row.id]?.rewarded) {
          next = rewardMalmoi(row.id);
          gained += config.reward.approved;
        }
      }
      if (gained > 0) {
        setKeys(next);
        commit((prev) => recordProgress(earn(prev, gained), 'malmoi', { approved: rows.filter((r) => r.status === 'approved').length }));
        setMsg(`확인된 낱말이 있어 낱말 카드 ${gained}장을 받았습니다.`);
      }
    } catch {
      setMine([]);
    }
  }, [commit]);

  const loadAll = useCallback(async (c, key) => {
    if (!key) return;
    try {
      const res = await fetch('/api/baeumteo/malmoi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, owner_key: key }),
      });
      const data = res.ok ? await res.json() : { rows: [] };
      setAll(data.rows || []);
    } catch {
      setAll([]);
    }
  }, []);

  useEffect(() => {
    const loaded = loadSave();
    const k = loadKeys();
    setSave(loaded);
    setKeys(k);
    setNick(loaded.nick || '');
    setReady(true);
    if (loaded.class_code) {
      loadRoom(loaded.class_code).then(setRoom);
      loadApproved(loaded.class_code);
      loadMine(k);
      loadAll(loaded.class_code, k.classes[loaded.class_code]);
    }
  }, [loadRoom, loadApproved, loadMine, loadAll]);

  // ── 반 코드 ────────────────────────────────────────────────────

  const joinClass = async (e) => {
    e.preventDefault();
    const parsed = parseClassCode(codeInput);
    if (!parsed.ok) {
      setMsg(parsed.reason);
      return;
    }
    setBusy(true);
    const found = await loadRoom(parsed.code);
    setBusy(false);
    if (!found) {
      setMsg('그런 반 코드가 없습니다. 선생님께 다시 여쭤 보세요.');
      return;
    }
    setMsg('');
    setRoom(found);
    commit((prev) => ({ ...prev, class_code: parsed.code }));
    loadApproved(parsed.code);
    loadAll(parsed.code, keys.classes[parsed.code]);
  };

  // ── 올리기 ─────────────────────────────────────────────────────

  const submit = async (e) => {
    e.preventDefault();
    const w = checkWord(word);
    if (!w.ok) return setMsg(w.reason);
    const m = checkMeaning(meaning);
    if (!m.ok) return setMsg(m.reason);
    if (!district) return setMsg('어느 구·군에서 들었는지 골라 주세요.');
    if (!place) return setMsg('어디서 들었는지 골라 주세요.');
    if (!relation) return setMsg('누가 들려줬는지 골라 주세요.');

    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/baeumteo/malmoi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          word: w.word,
          meaning: m.meaning,
          district,
          place,
          heard_from: relation,
          nick,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || '올리지 못했습니다.');
        return;
      }
      setKeys(rememberMalmoi(data.row.id, data.submit_key));
      setMine((prev) => [data.row, ...prev]);
      if (nick && nick !== save.nick) commit((prev) => ({ ...prev, nick }));
      setWord('');
      setMeaning('');
      setMsg('올렸습니다. 선생님이 확인하면 반 지도에 핀이 꽂힙니다.');
      if (ownerKey) loadAll(code, ownerKey);
    } catch {
      setMsg('올리지 못했습니다. 잠시 뒤에 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    try {
      const res = await fetch('/api/baeumteo/malmoi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, submit_key: keys.malmoi[row.id]?.key, owner_key: ownerKey }),
      });
      if (!res.ok) {
        setMsg('지우지 못했습니다.');
        return;
      }
      if (keys.malmoi[row.id]) setKeys(forgetMalmoi(row.id));
      setMine((prev) => prev.filter((r) => r.id !== row.id));
      setAll((prev) => (prev ? prev.filter((r) => r.id !== row.id) : prev));
      setApproved((prev) => (prev ? prev.filter((r) => r.id !== row.id) : prev));
    } catch {
      setMsg('지우지 못했습니다.');
    }
  };

  // ── 교사 확인 ──────────────────────────────────────────────────

  const decide = async (row, status) => {
    setBusy(true);
    try {
      const res = await fetch('/api/baeumteo/malmoi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, owner_key: ownerKey, id: row.id, status, note: notes[row.id] || '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || '적지 못했습니다.');
        return;
      }
      setAll((prev) => (prev ? prev.map((r) => (r.id === row.id ? data.row : r)) : prev));
      loadApproved(code);
    } catch {
      setMsg('적지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  // ── 화면 ───────────────────────────────────────────────────────

  const story = config.story;
  const event = (oesol.events || []).find((e) => e.id === story.event);

  if (!ready) {
    return (
      <div className={styles.game}>
        <p className={styles.empty}>불러오는 중입니다.</p>
      </div>
    );
  }

  const counts = {};
  for (const row of approved || []) counts[row.district] = (counts[row.district] || 0) + 1;
  const pending = (all || []).filter((r) => r.status === 'pending');

  return (
    <div className={styles.game}>
      {/* 이야기 */}
      {event && (
        <section className={styles.story}>
          <p className={styles.storyYear}>{event.year}</p>
          <ol className={styles.storyLines}>
            {story.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className={styles.small}>출처 {story.source}</p>
        </section>
      )}

      {msg && (
        <p className={styles.notice}>
          {msg}
          <button type="button" onClick={() => setMsg('')}>
            닫기
          </button>
        </p>
      )}

      {!code ? (
        <section className={styles.box}>
          <h2>먼저 반 코드가 있어야 합니다</h2>
          <p>
            올린 낱말은 선생님이 확인한 뒤에 반 지도에 실립니다. 선생님이 칠판에 적어 준 반 코드를 넣어 주세요.
          </p>
          <form className={styles.row} onSubmit={joinClass}>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="화진-5-1-K2P7"
              aria-label="반 코드"
            />
            <button type="submit" className={styles.big} disabled={busy}>
              이 반으로
            </button>
          </form>
          <p className={styles.small}>
            선생님은 <Link href="/배움터/반">반 화면</Link>에서 반 코드를 만듭니다.
          </p>
        </section>
      ) : (
        <>
          <div className={styles.roomLine}>
            <b>
              {room ? `${room.school} ${room.grade}학년 ${room.class}반` : code}
            </b>
            <span className={styles.muted}>반 코드 {code}</span>
            {ownerKey && <span className={styles.owner}>이 기기가 만든 반</span>}
            <span className={styles.spacer} />
            <button
              type="button"
              className={styles.quiet}
              onClick={() => {
                commit((prev) => ({ ...prev, class_code: '' }));
                setRoom(null);
                setApproved(null);
                setAll(null);
              }}
            >
              다른 반으로
            </button>
          </div>

          <div className={styles.cols}>
            {/* 올리기 */}
            <section className={styles.box}>
              <h2>우리 동네 말 올리기</h2>
              <form className={styles.form} onSubmit={submit}>
                <label>
                  낱말
                  <input value={word} onChange={(e) => setWord(e.target.value)} maxLength={config.word_max} placeholder="정구지" />
                </label>
                <label>
                  뜻
                  <input
                    value={meaning}
                    onChange={(e) => setMeaning(e.target.value)}
                    maxLength={config.meaning_max}
                    placeholder="부추. 할머니가 정구지 부침개라고 하셨다"
                  />
                </label>
                <div className={styles.picks}>
                  <label>
                    어느 구·군
                    <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                      <option value="">—</option>
                      {DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    어디서
                    <select value={place} onChange={(e) => setPlace(e.target.value)}>
                      <option value="">—</option>
                      {PLACES.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    누가 들려줬나
                    <select value={relation} onChange={(e) => setRelation(e.target.value)}>
                      <option value="">—</option>
                      {RELATIONS.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    별명 (안 적어도 됨)
                    <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={NICK_MAX} placeholder="솔방울" />
                  </label>
                </div>
                <p className={styles.small}>
                  들려준 분의 이름은 적지 않습니다. 관계만 고릅니다. 뜻은 초등 3학년이 읽을 수 있게 짧게 적어 주세요.
                </p>
                <button type="submit" className={styles.big} disabled={busy}>
                  올리기
                </button>
              </form>
            </section>

            {/* 내가 올린 낱말 */}
            <section className={styles.box}>
              <h2>내가 올린 낱말</h2>
              {mine.length === 0 ? (
                <p className={styles.small}>아직 없습니다. 이 기기에서 올린 낱말이 여기에 보입니다.</p>
              ) : (
                <ul className={styles.list}>
                  {mine.map((row) => (
                    <li key={row.id} className={styles[`st_${row.status}`]}>
                      <b>{row.word}</b>
                      <span>{row.meaning}</span>
                      <span className={styles.tag}>{STATUS_LABEL[row.status]}</span>
                      {row.status === 'returned' && row.note && <span className={styles.note}>선생님: {row.note}</span>}
                      <button type="button" className={styles.erase} onClick={() => remove(row)}>
                        지우기
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.small}>
                확인된 낱말 하나에 낱말 카드 {config.reward.approved}장. 이 화면을 다시 열면 받습니다.
              </p>
            </section>
          </div>

          {/* 우리 반 말모이 지도 */}
          <section className={styles.box}>
            <h2>우리 반 말모이</h2>
            <p className={styles.small}>
              선생님이 확인한 낱말이 들은 구·군에 핀으로 꽂힙니다. 얼개 지도라서 자리는 어림입니다.
            </p>
            <svg className={styles.map} viewBox={`0 0 ${MAP.w} ${MAP.h}`} role="img" aria-label="울산 얼개 지도">
              {DISTRICTS.map((d) => {
                const a = MAP.areas[d.id];
                return (
                  <g key={d.id}>
                    <rect x={a.x} y={a.y} width={a.w} height={a.h} className={styles.area} />
                    <text x={a.x + 12} y={a.y + 24} className={styles.areaName}>
                      {d.name}
                    </text>
                    <text x={a.x + 12} y={a.y + 44} className={styles.areaCount}>
                      {counts[d.id] ? `${counts[d.id]}개` : ''}
                    </text>
                  </g>
                );
              })}
              {(approved || []).map((row) => {
                const a = MAP.areas[row.district];
                if (!a) return null;
                const s = pinSpot(row.id);
                const x = a.x + a.w * s.x;
                const y = a.y + a.h * s.y;
                return (
                  <g key={row.id} className={styles.pin}>
                    <circle cx={x} cy={y} r={5} />
                    <text x={x + 8} y={y + 4}>{row.word}</text>
                    <title>
                      {row.word} · {row.meaning}
                    </title>
                  </g>
                );
              })}
            </svg>

            {approved === null ? (
              <p className={styles.small}>불러오는 중입니다.</p>
            ) : approved.length === 0 ? (
              <p className={styles.small}>아직 확인된 낱말이 없습니다. 첫 낱말을 올려 보세요.</p>
            ) : (
              <ul className={styles.list}>
                {approved.map((row) => (
                  <li key={row.id}>
                    <b>{row.word}</b>
                    <span>{row.meaning}</span>
                    <span className={styles.muted}>
                      {districtName(row.district)} · {placeName(row.place)} · {relationName(row.heard_from)}
                      {row.nick ? ` · ${row.nick}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 교사 확인 */}
          {ownerKey && (
            <section className={`${styles.box} ${styles.teacher}`}>
              <h2>선생님 확인</h2>
              <p className={styles.small}>
                확인 기다리는 낱말 {pending.length}개. 확인하면 반 지도에 실리고 올린 학생이 낱말 카드를 받습니다.
                돌려보낼 때는 한 줄 적어 줄 수 있습니다.
              </p>
              {all === null ? (
                <p className={styles.small}>불러오는 중입니다.</p>
              ) : all.length === 0 ? (
                <p className={styles.small}>아직 올라온 낱말이 없습니다.</p>
              ) : (
                <ul className={styles.list}>
                  {all.map((row) => (
                    <li key={row.id} className={styles[`st_${row.status}`]}>
                      <b>{row.word}</b>
                      <span>{row.meaning}</span>
                      <span className={styles.muted}>
                        {districtName(row.district)} · {placeName(row.place)} · {relationName(row.heard_from)}
                        {row.nick ? ` · ${row.nick}` : ''} · {when(row.created_at)}
                      </span>
                      <span className={styles.tag}>{STATUS_LABEL[row.status]}</span>
                      <span className={styles.actions}>
                        {row.status !== 'approved' && (
                          <button type="button" onClick={() => decide(row, 'approved')} disabled={busy}>
                            확인
                          </button>
                        )}
                        {row.status !== 'returned' && (
                          <>
                            <input
                              value={notes[row.id] || ''}
                              onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })}
                              maxLength={60}
                              placeholder="돌려보내는 까닭 (안 적어도 됨)"
                            />
                            <button type="button" onClick={() => decide(row, 'returned')} disabled={busy}>
                              돌려보내기
                            </button>
                          </>
                        )}
                        <button type="button" className={styles.erase} onClick={() => remove(row)} disabled={busy}>
                          지우기
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
