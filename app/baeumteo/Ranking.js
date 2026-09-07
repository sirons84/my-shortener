'use client';

/* 순위판 (기획서 §9, 데이터설계 §6)
   서버가 학생에게서 받는 유일한 것. 이름은 받지 않고 별명 4자만 받는다.
   상위 100위 안에 들 때만 입력창이 뜬다. 지우기는 이유를 묻지 않는다.

   사전 편찬소와 우리말 지키기가 함께 쓴다. 점수의 뜻(낱말 수 / 맞힌 수)만
   게임마다 다르므로 `unit` 으로 받는다. */

import { useCallback, useEffect, useState } from 'react';

import styles from './ranking.module.css';
import { NICK_MAX, SCHOOL_MAX, checkNick } from '../../lib/baeumteo/nick';
import { forgetScore, loadKeys, rememberScore } from '../../lib/baeumteo/keys';

const TABS = [
  ['solo', '개인'],
  ['class', '반'],
  ['school', '학교'],
];

const GROUP_TAKE = 10;

function num(n) {
  return Math.floor(n).toLocaleString('ko-KR');
}

/** 62000 → '1분 2초' */
function clock(ms) {
  if (!ms) return '';
  const total = Math.round(ms / 1000);
  const min = Math.floor(total / 60);
  return min > 0 ? `${min}분 ${total % 60}초` : `${total}초`;
}

export default function Ranking({ game, score, ms = 0, ticket, save, onSave, unit = '점' }) {
  const [tab, setTab] = useState('solo');
  const [board, setBoard] = useState(null);
  const [keys, setKeys] = useState({ scores: {}, classes: {} });
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);

  const [nick, setNick] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState(0);
  const [klass, setKlass] = useState(0);

  useEffect(() => {
    setKeys(loadKeys());
    setNick(save.nick || '');
    setSchool(save.school || '');
    setGrade(save.grade || 0);
    setKlass(save.class || 0);
    // 판이 끝났을 때 한 번만 채운다. 적는 중에 덮어쓰면 안 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(
    async (which) => {
      setBoard(null);
      try {
        const res = await fetch(`/api/baeumteo/scores?game=${game}&tab=${which}`);
        setBoard(res.ok ? await res.json() : { tab: which, rows: [] });
      } catch {
        setBoard({ tab: which, rows: [] });
      }
    },
    [game],
  );

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const solo = board?.tab === 'solo' ? board : null;

  // 상위 100위 안일 때만 입력창을 띄운다 (기획서 §8)
  const qualifies = !done && !!ticket && score > 0 && (!solo || !solo.full || score > (solo.cutoff || 0));

  const submit = async (event) => {
    event.preventDefault();
    const checked = checkNick(nick);
    if (!checked.ok) {
      setMsg(checked.reason);
      return;
    }

    setSending(true);
    setMsg('');
    try {
      const res = await fetch('/api/baeumteo/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game,
          score,
          ms,
          ticket,
          nick: checked.nick,
          school,
          grade,
          class: klass,
          class_code: save.class_code || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || '기록을 남기지 못했습니다.');
        return;
      }

      setKeys(rememberScore(data.row.id, data.erase_key));
      // 다음 판에 다시 적지 않게 이 기기에 남긴다
      onSave((prev) => ({ ...prev, nick: checked.nick, school, grade, class: klass }));
      setDone({ rank: data.rank });
      setTab('solo');
      load('solo');
    } catch {
      setMsg('기록을 남기지 못했습니다. 잠시 뒤에 다시 해 주세요.');
    } finally {
      setSending(false);
    }
  };

  const erase = async (id) => {
    try {
      const res = await fetch('/api/baeumteo/scores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, erase_key: keys.scores[id] }),
      });
      if (!res.ok) {
        setMsg('기록을 지우지 못했습니다.');
        return;
      }
      setKeys(forgetScore(id));
      load(tab);
    } catch {
      setMsg('기록을 지우지 못했습니다.');
    }
  };

  return (
    <div className={styles.rank}>
      <div className={styles.rankHead}>
        <h3>순위판</h3>
        <div className={styles.tabs}>
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? styles.tabOn : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {qualifies && (
        <form className={styles.form} onSubmit={submit}>
          <p className={styles.formLead}>
            {num(score)}{unit}입니다. 순위판에 남기려면 별명을 지어 주세요. 이름은 적지 않습니다.
          </p>
          <div className={styles.fields}>
            <label>
              별명
              <input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={NICK_MAX} placeholder="솔방울" required />
            </label>
            <label>
              학교
              <input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={SCHOOL_MAX} placeholder="화진초" />
            </label>
            <label>
              학년
              <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                <option value={0}>—</option>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n}학년</option>
                ))}
              </select>
            </label>
            <label>
              반
              <select value={klass} onChange={(e) => setKlass(Number(e.target.value))}>
                <option value={0}>—</option>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}반</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={sending}>{sending ? '보내는 중' : '남기기'}</button>
          </div>
          {save.class_code && <p className={styles.small}>반 코드 {save.class_code} 로 함께 남깁니다.</p>}
        </form>
      )}

      {done && (
        <p className={styles.formLead}>
          {done.rank}등으로 남겼습니다. 지우고 싶으면 아래 목록에서 지우기를 누르세요.
        </p>
      )}

      {!ticket && score > 0 && !done && (
        <p className={styles.small}>이번 판은 순위판에 남길 수 없습니다. 판을 다시 시작해 주세요.</p>
      )}

      {msg && <p className={styles.formMsg}>{msg}</p>}

      {!board ? (
        <p className={styles.small}>순위판을 불러오는 중입니다.</p>
      ) : board.rows.length === 0 ? (
        <p className={styles.small}>아직 남은 기록이 없습니다. 첫 기록을 남겨 보세요.</p>
      ) : board.tab === 'solo' ? (
        <ol className={styles.rankList}>
          {board.rows.map((row, i) => (
            <li key={row.id}>
              <span className={styles.place}>{i + 1}</span>
              <b>{row.nick}</b>
              <span className={styles.muted}>
                {row.school}
                {row.grade ? ` ${row.grade}-${row.class}` : ''}
              </span>
              <span className={styles.spacer} />
              {row.ms > 0 && <span className={styles.time}>{clock(row.ms)}</span>}
              <span className={styles.point}>{num(row.score)}</span>
              {keys.scores[row.id] && (
                <button type="button" className={styles.erase} onClick={() => erase(row.id)}>지우기</button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <ol className={styles.rankList}>
          {board.rows.map((row, i) => (
            <li key={row.key}>
              <span className={styles.place}>{i + 1}</span>
              <b>{row.key}</b>
              <span className={styles.muted}>{row.members}명 합</span>
              <span className={styles.spacer} />
              <span className={styles.point}>{num(row.score)}</span>
            </li>
          ))}
        </ol>
      )}

      <p className={styles.small}>
        반·학교 점수는 상위 {GROUP_TAKE}명의 합입니다. 기록은 별명·학교·학년·반만 담고, 이름은 담지 않습니다.
        지우고 싶은 기록은 이유 없이 바로 지울 수 있습니다.
        {solo?.full ? ` 지금 100등 점수는 ${num(solo.cutoff)}${unit}입니다.` : ''}
      </p>
    </div>
  );
}
