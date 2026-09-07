'use client';

/* 사전 편찬소 — 학생 마당의 홈 게임 (기획서 §8-1)
   낱말 카드가 초 단위로 쌓이고, 20장으로 낱말 하나를 사전에 싣는다.
   실을 때 뜻을 한 번 고른다. 학습 접점은 그 한 번이고, 그걸로 충분하다. */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import styles from './page.module.css';
import config from '../../../data/games/dictionary.json';
import { getWord, meaningChoices, pickNextWord, words } from '../../../lib/baeumteo/words';
import {
  addEntry,
  cardRate,
  clearSave,
  emptySave,
  hire,
  hireCost,
  loadSave,
  nextMilestone,
  settle,
  writeSave,
} from '../../../lib/baeumteo/save';
import { decodeSave, encodeSave } from '../../../lib/baeumteo/saveCode';
import { josa } from '../../../lib/baeumteo/hangul';

const PER_PAGE = 8;
const WRITE_EVERY = 5; // 5초에 한 번만 저장한다. 매 초 쓰면 기기가 더워진다.

/** 1,204 처럼 자리를 끊어 보여 준다 */
function num(n) {
  return Math.floor(n).toLocaleString('ko-KR');
}

export default function Editorial() {
  const [save, setSave] = useState(emptySave);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');

  // 뜻 고르기. null 이면 닫힌 상태
  const [check, setCheck] = useState(null);
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState(''); // '' | 'code'
  const [codeText, setCodeText] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeMsg, setCodeMsg] = useState('');

  const tick = useRef(0);

  // 저장을 읽고, 자리를 비운 사이에 쌓인 카드를 얹는다
  useEffect(() => {
    const settled = settle(loadSave(), config);
    setSave(settled.save);
    setReady(true);
    if (settled.away && settled.gained > 0) {
      setNotice(`자리를 비운 사이에 낱말 카드 ${num(settled.gained)}장이 쌓였습니다.`);
    }
  }, []);

  // 초 단위로 카드가 쌓인다
  useEffect(() => {
    if (!ready) return undefined;
    const id = setInterval(() => {
      tick.current += 1;
      const shouldWrite = tick.current % WRITE_EVERY === 0;
      setSave((prev) => {
        const next = {
          ...prev,
          cards: prev.cards + cardRate(prev, config),
          dict: { ...prev.dict, at: Date.now() },
        };
        return shouldWrite ? writeSave(next) : next;
      });
    }, config.tick_ms);
    return () => clearInterval(id);
  }, [ready]);

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

  const commit = useCallback((updater) => {
    setSave((prev) => writeSave(typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  // ── 낱말 싣기 ──────────────────────────────────────────────────

  const openCheck = () => {
    if (save.cards < config.entry_cost) return;
    const word = pickNextWord(save.dict.entries, config.entry_pool);
    if (!word) {
      setNotice('사전에 실을 낱말을 모두 실었습니다. 낱말은 계속 늘려 가는 중입니다.');
      return;
    }
    setCheck({ word, choices: meaningChoices(word, config.check_choices), picked: null });
  };

  const answer = (choice) => {
    if (!check || check.picked) return;
    setCheck({ ...check, picked: choice });

    commit((prev) => {
      // 틀려도 싣는다. 대신 카드를 조금 더 낸다 (기획서 §8-1)
      const extra = choice.correct ? 0 : Math.min(config.wrong_penalty, prev.cards - config.entry_cost);
      const spent = config.entry_cost + Math.max(0, extra);
      return addEntry({ ...prev, cards: Math.max(0, prev.cards - spent) }, check.word.id);
    });
  };

  const closeCheck = () => {
    setCheck(null);
    setPage(Math.floor(save.dict.entries.length / PER_PAGE));
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
    setPage(0);
    setNotice(''); // 지웠다는 알림이 이어 온 진행 위에 남아 있으면 안 된다
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
    setPage(0);
    setPanel('');
    setNotice('이 기기의 기록을 지웠습니다.');
  };

  // ── 화면 ───────────────────────────────────────────────────────

  const entries = save.dict.entries.map(getWord).filter(Boolean);
  const pages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
  const shown = entries.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const rate = cardRate(save, config);
  const milestone = nextMilestone(save, config);

  return (
    <div className={styles.game}>
      {/* 셈판 */}
      <div className={styles.counter}>
        <div>
          <b className={styles.cards}>{ready ? num(save.cards) : '—'}</b>
          <span className={styles.unit}>낱말 카드</span>
        </div>
        <div className={styles.rate}>초당 {num(rate)}장</div>
        <div className={styles.spacer} />
        <button
          type="button"
          className={styles.publish}
          onClick={openCheck}
          disabled={!ready || save.cards < config.entry_cost}
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
              {num(entries.length)}개 실림 · 전체 {num(words.length)}개
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
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  앞
                </button>
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
              const owned = save.dict.workers[worker.id] || 0;
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
                      onClick={() => commit((prev) => hire(prev, worker))}
                      disabled={!ready || save.cards < cost}
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
                낱말 {milestone.entries}개를 실으면 <b>{milestone.label}</b>
                {josa(milestone.label, '이/가')} 열립니다.
                <span className={styles.muted}> {milestone.entries - entries.length}개 남음</span>
              </>
            ) : (
              <>모든 게임이 열렸습니다.</>
            )}
          </div>

          <div className={styles.tools}>
            <button type="button" onClick={openCode}>저장 코드</button>
            <Link href="/배움터#games">학생 마당</Link>
          </div>
        </section>
      </div>

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
                <button type="button" onClick={closeCheck}>사전 보기</button>
              </div>
            )}
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
