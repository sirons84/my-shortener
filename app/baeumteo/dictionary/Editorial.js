'use client';

/* 사전 편찬소 — 학생 마당의 첫 게임 (기획서 §8-1)

   한 판은 5분이다. 카드 0, 고용 0, 사전 0 에서 시작해서, 5분 안에 낱말을
   몇 개나 사전에 싣는지가 점수다. 94개를 다 실으면 그 자리에서 끝난다.
   판을 늘 처음부터 시작하는 것은 점수가 실력을 가리키게 하려는 것이다.
   앞서 논 사람이 쌓아 둔 카드를 물려받으면 순위는 논 시간의 순위가 된다.

   낱말을 실을 때 뜻을 한 번 고른다. 학습 접점은 그 한 번이고, 그걸로 충분하다.
   실어 본 낱말은 저장에 남아 다른 게임을 연다. */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from './page.module.css';
import config from '../../../data/games/dictionary.json';
import { getWord, meaningChoices, pickNextWord, words } from '../../../lib/baeumteo/words';
import {
  addEntry,
  cardRate,
  clearSave,
  emptyRound,
  emptySave,
  earn,
  hire,
  hireCost,
  learn,
  loadSave,
  nextMilestone,
  recordProgress,
  writeSave,
} from '../../../lib/baeumteo/save';
import { decodeSave, encodeSave } from '../../../lib/baeumteo/saveCode';
import { josa } from '../../../lib/baeumteo/hangul';
import Ranking from '../Ranking';

const PER_PAGE = 8;
const GOAL = words.length;

/** 1,204 처럼 자리를 끊어 보여 준다 */
function num(n) {
  return Math.floor(n).toLocaleString('ko-KR');
}

/** 남은 시간을 4:59 로 */
function clock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function Editorial() {
  const [save, setSave] = useState(emptySave);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState('ready'); // ready | play | over
  const [round, setRound] = useState(emptyRound);
  const [left, setLeft] = useState(config.round_ms);
  const [notice, setNotice] = useState('');

  const [check, setCheck] = useState(null); // 뜻 고르기. null 이면 닫힌 상태
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState(''); // '' | 'code'
  const [codeText, setCodeText] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeMsg, setCodeMsg] = useState('');

  const ticket = useRef('');
  const spent = useRef(0); // 이 판에 실제로 흐른 시간

  useEffect(() => {
    setSave(loadSave());
    setReady(true);
  }, []);

  const commit = useCallback((updater) => {
    setSave((prev) => writeSave(typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  // ── 판 ─────────────────────────────────────────────────────────

  const start = async () => {
    setRound(emptyRound());
    setLeft(config.round_ms);
    setCheck(null);
    setPage(0);
    setPanel('');
    setNotice('');
    spent.current = 0;
    setPhase('play');

    ticket.current = '';
    try {
      const res = await fetch('/api/baeumteo/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'dictionary' }),
      });
      if (res.ok) ticket.current = (await res.json()).ticket || '';
    } catch {
      /* 순위판 없이 논다 */
    }
  };

  // 초마다 카드가 쌓이고 시계가 준다.
  // 다른 탭에 가 있는 동안에는 멈춘다. 자리를 비운 사이의 시간은 세지 않는다.
  useEffect(() => {
    if (phase !== 'play') return undefined;

    const id = setInterval(() => {
      if (document.hidden) return;
      spent.current += config.tick_ms;
      setRound((prev) => ({ ...prev, cards: prev.cards + cardRate(prev, config) }));
      setLeft((prev) => Math.max(0, prev - config.tick_ms));
    }, config.tick_ms);

    return () => clearInterval(id);
  }, [phase]);

  // 시간이 다하거나 사전을 다 채우면 끝난다
  useEffect(() => {
    if (phase !== 'play') return;
    if (left > 0 && round.entries.length < GOAL) return;

    setCheck(null);
    setPhase('over');
    commit((prev) =>
      recordProgress(learn(earn(prev, round.entries.length * config.reward.per_entry), round.entries), 'dictionary', {
        best_entries: round.entries.length,
        // 같은 개수라면 빨리 채운 쪽이 낫다. 못 채웠으면 판을 다 쓴 것이다
        last_ms: spent.current,
      }),
    );
  }, [phase, left, round.entries, commit]);

  // 창을 닫기 전에 마지막으로 한 번 적어 둔다
  useEffect(() => {
    if (!ready) return undefined;
    const flush = () => writeSave(save);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [ready, save]);

  // ── 낱말 싣기 ──────────────────────────────────────────────────

  const openCheck = () => {
    if (phase !== 'play' || round.cards < config.entry_cost) return;
    const word = pickNextWord(round.entries, config.entry_pool);
    if (!word) return;
    setCheck({ word, choices: meaningChoices(word, config.check_choices), picked: null });
  };

  const answer = (choice) => {
    if (!check || check.picked) return;
    setCheck({ ...check, picked: choice });

    setRound((prev) => {
      // 틀려도 싣는다. 대신 카드를 조금 더 낸다 (기획서 §8-1)
      const extra = choice.correct ? 0 : Math.min(config.wrong_penalty, prev.cards - config.entry_cost);
      const spend = config.entry_cost + Math.max(0, extra);
      return addEntry({ ...prev, cards: Math.max(0, prev.cards - spend) }, check.word.id);
    });
  };

  const closeCheck = () => {
    setCheck(null);
    setPage(Math.floor(round.entries.length / PER_PAGE));
  };

  // ── 저장 코드 ──────────────────────────────────────────────────

  const openCode = async () => {
    setPanel('code');
    setCodeMsg('');
    setCodeText(await encodeSave(save));
  };

  const applyCode = async () => {
    const result = await decodeSave(codeInput);
    if (!result.ok) {
      setCodeMsg(result.reason);
      return;
    }
    commit(result.save);
    setNotice('');
    setCodeMsg('진행을 이어 왔습니다.');
    setCodeText(await encodeSave(result.save));
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCodeMsg('코드를 복사했습니다.');
    } catch {
      setCodeMsg('복사가 막혀 있습니다. 코드를 직접 적어 두세요.');
    }
  };

  const reset = () => {
    clearSave();
    commit(emptySave());
    setPanel('');
    setNotice('이 기기의 기록을 지웠습니다.');
  };

  // ── 화면 ───────────────────────────────────────────────────────

  const entries = round.entries.map(getWord).filter(Boolean);
  const pages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
  const shown = entries.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const rate = cardRate(round, config);
  const milestone = nextMilestone(save, config);
  const known = save.dict.known.length;
  const best = save.progress.dictionary?.best_entries || 0;

  if (!ready) return <div className={styles.game}><p className={styles.empty}>불러오는 중입니다.</p></div>;

  return (
    <div className={styles.game}>
      {/* 셈판 */}
      <div className={styles.counter}>
        <div>
          <b className={styles.cards}>{num(round.cards)}</b>
          <span className={styles.unit}>낱말 카드</span>
        </div>
        <div className={styles.rate}>초당 {num(rate)}장</div>
        <div className={styles.spacer} />
        <div className={`${styles.timer} ${phase === 'play' && left <= 30000 ? styles.hurry : ''}`}>
          <span className={styles.muted}>남은 시간</span> <b>{clock(left)}</b>
        </div>
        <button
          type="button"
          className={styles.publish}
          onClick={openCheck}
          disabled={phase !== 'play' || round.cards < config.entry_cost}
        >
          낱말 싣기 <span>{config.entry_cost}장</span>
        </button>
      </div>

      {notice && (
        <p className={styles.notice}>
          {notice}
          <button type="button" onClick={() => setNotice('')}>닫기</button>
        </p>
      )}

      <div className={styles.board}>
        {/* 왼쪽: 사전 */}
        <section className={styles.book}>
          <header>
            <h2>우리말 사전</h2>
            <span className={styles.muted}>
              이번 판 {num(entries.length)}개 · 사전 전체 {num(GOAL)}개
            </span>
          </header>

          {entries.length === 0 ? (
            <p className={styles.empty}>
              아직 실린 낱말이 없습니다. 카드가 {config.entry_cost}장 모이면 첫 낱말을 실을 수 있습니다.
            </p>
          ) : (
            <>
              <ol className={styles.pageList} start={page * PER_PAGE + 1}>
                {shown.map((word) => (
                  <li key={word.id}>
                    <b>{word.ko}</b>
                    <span className={styles.from}>{word.from}</span>
                    <p>{word.meaning}</p>
                  </li>
                ))}
              </ol>
              <div className={styles.pager}>
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>앞</button>
                <span>{page + 1} / {pages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={page >= pages - 1}
                >
                  다음
                </button>
              </div>
            </>
          )}
        </section>

        {/* 오른쪽: 편찬소 */}
        <section className={styles.office}>
          <header>
            <h2>편찬소</h2>
            <span className={styles.muted}>사람을 뽑으면 카드가 더 빨리 쌓입니다</span>
          </header>

          <ul className={styles.workers}>
            {config.workers.map((worker) => {
              const owned = round.workers[worker.id] || 0;
              const cost = hireCost(worker, owned);
              return (
                <li key={worker.id}>
                  <div className={styles.workerName}>
                    {worker.name}
                    {owned > 0 && <span className={styles.owned}>{owned}</span>}
                  </div>
                  <p>{worker.desc}</p>
                  <div className={styles.workerFoot}>
                    <span className={styles.muted}>초당 {worker.rate}장</span>
                    <button
                      type="button"
                      onClick={() => setRound((prev) => hire(prev, worker))}
                      disabled={phase !== 'play' || round.cards < cost}
                    >
                      뽑기 {num(cost)}장
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={styles.milestone}>
            {milestone ? (
              <>
                낱말 {milestone.entries}개를 실어 보면 <b>{milestone.label}</b>
                {josa(milestone.label, '이/가')} 열립니다.
                <span className={styles.muted}> 지금까지 {num(known)}개</span>
              </>
            ) : (
              <>모든 게임이 열렸습니다. 지금까지 실어 본 낱말 {num(known)}개.</>
            )}
          </div>

          <div className={styles.tools}>
            <button type="button" onClick={openCode}>저장 코드</button>
            <Link href="/배움터#games">학생 마당</Link>
          </div>
        </section>
      </div>

      {/* 시작 화면 */}
      {phase === 'ready' && (
        <div className={styles.veil} role="dialog" aria-modal="true" aria-label="사전 편찬소 시작">
          <div className={styles.sheet}>
            <h3 className={styles.sheetTitle}>사전 편찬소</h3>
            <ol className={styles.rules}>
              <li>낱말 카드가 초마다 쌓입니다. {config.entry_cost}장이면 낱말 하나를 사전에 싣습니다.</li>
              <li>실을 때 그 낱말의 뜻을 한 번 고릅니다. 틀려도 실리되 카드 {config.wrong_penalty}장을 더 냅니다.</li>
              <li>사람을 뽑으면 카드가 빨리 쌓입니다. 뽑을수록 값이 오릅니다.</li>
              <li>
                한 판은 {Math.round(config.round_ms / 60000)}분입니다. 그 안에 실은 낱말 수가 점수이고,{' '}
                {num(GOAL)}개를 다 실으면 그 자리에서 끝납니다.
              </li>
              <li>판은 늘 카드 0에서 시작합니다. 자리를 비우면 시계도 함께 멈춥니다.</li>
            </ol>
            {best > 0 && <p className={styles.sheetAsk}>지금까지 가장 많이 실은 것은 {num(best)}개입니다.</p>}
            <div className={styles.codeRow}>
              <button type="button" className={styles.big} onClick={start}>시작</button>
              <button type="button" onClick={openCode}>저장 코드</button>
            </div>
          </div>
        </div>
      )}

      {/* 뜻 고르기 */}
      {check && (
        <div className={styles.veil} role="dialog" aria-modal="true" aria-label="뜻 고르기">
          <div className={styles.sheet}>
            <p className={styles.sheetHead}>
              <span className={styles.muted}>{check.word.from} 대신 쓰는 말</span>
              <b>{check.word.ko}</b>
            </p>
            <p className={styles.sheetAsk}>이 낱말의 뜻은 무엇일까요.</p>

            <ul className={styles.choices}>
              {check.choices.map((choice) => {
                const picked = check.picked === choice;
                const reveal = check.picked && choice.correct;
                return (
                  <li key={choice.id}>
                    <button
                      type="button"
                      onClick={() => answer(choice)}
                      disabled={!!check.picked}
                      className={reveal ? styles.right : picked ? styles.wrong : ''}
                    >
                      {choice.meaning}
                    </button>
                  </li>
                );
              })}
            </ul>

            {check.picked && (
              <div className={styles.sheetFoot}>
                <p>
                  {check.picked.correct
                    ? '맞았습니다. 사전에 실었습니다.'
                    : `사전에는 실었습니다. 대신 카드 ${config.wrong_penalty}장을 더 냈습니다.`}
                  <span className={styles.muted}> 출처: {check.word.source}</span>
                </p>
                <button type="button" onClick={closeCheck}>이어 하기</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 판이 끝난 화면 */}
      {phase === 'over' && (
        <div className={styles.veil} role="dialog" aria-modal="true" aria-label="판이 끝났습니다">
          <div className={styles.sheetWide}>
            <h3 className={styles.sheetTitle}>
              {round.entries.length >= GOAL ? '사전을 다 채웠습니다' : '판이 끝났습니다'}
            </h3>
            <p className={styles.sheetAsk}>
              {num(round.entries.length)}개를 실었습니다. 걸린 시간 {clock(spent.current)}.
              지갑에 낱말 카드 {num(round.entries.length * config.reward.per_entry)}장이 들어왔습니다.
              {best > round.entries.length && ` 가장 좋았던 판은 ${num(best)}개입니다.`}
            </p>

            <Ranking
              game="dictionary"
              score={round.entries.length}
              ms={spent.current}
              ticket={ticket.current}
              save={save}
              onSave={commit}
              unit="개"
            />

            <div className={styles.sheetFoot}>
              <p className={styles.muted}>실어 본 낱말은 그대로 남아 다른 게임을 엽니다.</p>
              <button type="button" onClick={start}>다시 하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 저장 코드 */}
      {panel === 'code' && (
        <div className={styles.veil} role="dialog" aria-modal="true" aria-label="저장 코드">
          <div className={styles.sheet}>
            <h3 className={styles.sheetTitle}>저장 코드</h3>
            <p className={styles.sheetAsk}>
              다른 기기에서 이어 하려면 이 코드를 적어 두세요. 서버에 저장하지 않으니 코드를 잃으면 처음부터입니다.
            </p>

            <textarea className={styles.code} value={codeText} readOnly rows={3} />
            <div className={styles.codeRow}>
              <button type="button" onClick={copyCode}>코드 복사</button>
            </div>

            <p className={styles.sheetAsk} style={{ marginTop: '20px' }}>다른 기기에서 받은 코드가 있다면 여기에 붙여 넣으세요.</p>
            <textarea
              className={styles.code}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              rows={3}
              placeholder="SOL7-KX2M-Q9PA-3NDF"
            />
            <div className={styles.codeRow}>
              <button type="button" onClick={applyCode} disabled={!codeInput.trim()}>이어 하기</button>
              <button type="button" onClick={reset} className={styles.danger}>이 기기 기록 지우기</button>
            </div>

            {codeMsg && <p className={styles.codeMsg}>{codeMsg}</p>}

            <div className={styles.sheetFoot}>
              <span />
              <button type="button" onClick={() => setPanel('')}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
