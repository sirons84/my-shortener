/* 파일 경로: app/DbMain.js — 「바이브 코딩 w 외솔」 카드의 외솔 DB 탭
   표 목록 → 표 세부(주소·교사 키·챗GPT용 복사·기록 보기·CSV·잠금·재발급·삭제).
   모든 요청은 본체 /api/db/* 로 가고, 본체가 로그인 확인 뒤 외솔 DB 서버로 중계한다. */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import styles from "./page.module.css";
import vibe from "./vibe.module.css";
import { buildDbGuideText, DB_PROMPT_EXAMPLES } from "../lib/dbGuide";

const CONSENT_TEXT =
  "표에는 번호·별명·선택값·점수 같은 학급 활동 기록만 넣습니다. 연락처·생년월일·건강·가정 정보는 넣지 않습니다.";

function fmtTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("ko-KR");
}

function cellText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function DbMain() {
  const supabase = createClientComponentClient();

  const [user, setUser] = useState(undefined); // undefined = 아직 모름
  const [tables, setTables] = useState([]);
  const [limit, setLimit] = useState(5); // null 이면 무제한(관리자)
  const [consented, setConsented] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null); // { table, rows, hasMore }

  const [newName, setNewName] = useState("");
  const [agree, setAgree] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [copied, setCopied] = useState(""); // 'guide' | 'url' | 'key'
  const [showKey, setShowKey] = useState(false);

  // ── 인증 + 공통 요청 ───────────────────────────────────
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, [supabase.auth]);

  const api = useCallback(
    async (path, { method = "GET", body } = {}) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/db${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        /* 빈 응답 */
      }
      if (!res.ok) {
        const err = new Error(data.error || "요청에 실패했습니다.");
        err.status = res.status;
        throw err;
      }
      return data;
    },
    [supabase]
  );

  const loadList = useCallback(async () => {
    try {
      const data = await api("");
      setTables(data.tables || []);
      setConsented(!!data.consented);
      if (data.limit !== undefined) setLimit(data.limit);
      setUnavailable(false);
    } catch (e) {
      if (e.status === 503 || e.status === 502) setUnavailable(true);
      else setError(e.message);
    }
  }, [api]);

  const loadDetail = useCallback(
    async (id) => {
      try {
        const data = await api(`/${id}`);
        setDetail(data);
        setSelectedId(data.table.id);
        setError("");
      } catch (e) {
        setError(e.message);
        if (e.status === 404) {
          setSelectedId(null);
          setDetail(null);
        }
      }
    },
    [api]
  );

  useEffect(() => {
    if (user) loadList();
    else {
      setTables([]);
      setSelectedId(null);
      setDetail(null);
    }
  }, [user, loadList]);

  const say = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 3500);
  };

  const run = async (fn, okMsg) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      if (okMsg) say(okMsg);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ── 동작 ───────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError("표 이름을 적어 주세요. 예: 5학년 1반 칭찬 포인트");
      return;
    }
    if (!consented && !agree) {
      setError("개인정보를 넣지 않겠다는 항목에 동의해 주세요. (처음 한 번만)");
      return;
    }
    await run(async () => {
      if (!consented) {
        await api("/consent", { method: "POST" });
        setConsented(true);
      }
      const data = await api("", { method: "POST", body: { name } });
      setNewName("");
      await loadList();
      setDetail({ table: data.table, rows: [], hasMore: false });
      setSelectedId(data.table.id);
      setShowKey(false);
    }, "표를 만들었습니다. 「챗GPT용 복사」를 눌러 시작하세요.");
  };

  const patch = (action, extra = {}, okMsg) =>
    run(async () => {
      const data = await api(`/${selectedId}`, { method: "PATCH", body: { action, ...extra } });
      if (data.table.id !== selectedId) {
        // 주소 바꾸기: 새 아이디로 다시 읽는다
        setSelectedId(data.table.id);
        await loadDetail(data.table.id);
      } else {
        setDetail((d) => ({ ...d, table: data.table, rows: action === "clear" ? [] : d.rows }));
      }
      await loadList();
    }, okMsg);

  const handleRename = () => {
    const name = window.prompt("새 표 이름", detail.table.name);
    if (name === null) return;
    patch("rename", { name: name.trim() }, "이름을 바꿨습니다.");
  };

  const handleLock = () =>
    patch(detail.table.locked ? "unlock" : "lock", {}, detail.table.locked ? "잠금을 풀었습니다. 다시 기록할 수 있습니다." : "잠갔습니다. 읽기는 되지만 추가·수정은 막힙니다.");

  const handleRotateKey = () => {
    if (!window.confirm("교사 키를 다시 발급할까요?\n\n이전 키는 바로 쓸 수 없게 됩니다. 키를 넣어 둔 교사용 HTML 이 있다면 새 키로 고쳐야 합니다.")) return;
    patch("rotate_key", {}, "새 교사 키를 발급했습니다.");
  };

  const handleRotateId = () => {
    if (!window.confirm("표 주소를 새로 바꿀까요?\n\n기록은 그대로 두고 주소만 바뀝니다. 이전 주소를 쓰는 앱은 더 이상 이 표에 닿지 못하고, 교사 키도 함께 바뀝니다.")) return;
    patch("rotate_id", {}, "새 주소로 바꿨습니다. 앱에 새 주소와 키를 넣어 주세요.");
  };

  const handleClear = () => {
    if (!window.confirm(`「${detail.table.name}」의 기록 ${detail.table.rowCount}건을 모두 지울까요?\n\n되돌릴 수 없습니다. 필요하면 먼저 CSV 로 내려받으세요.`)) return;
    patch("clear", {}, "기록을 모두 지웠습니다.");
  };

  const handleDeleteTable = () => {
    if (!window.confirm(`「${detail.table.name}」 표를 삭제할까요?\n\n주소·키·기록이 모두 사라지고 되돌릴 수 없습니다.`)) return;
    run(async () => {
      await api(`/${selectedId}`, { method: "DELETE" });
      setSelectedId(null);
      setDetail(null);
      await loadList();
    }, "표를 삭제했습니다.");
  };

  const handleDeleteRow = (row) => {
    if (!window.confirm(`${row}번 행을 지울까요?`)) return;
    run(async () => {
      await api(`/${selectedId}/rows/${row}`, { method: "DELETE" });
      setDetail((d) => ({
        ...d,
        rows: d.rows.filter((r) => r.row !== row),
        table: { ...d.table, rowCount: Math.max(0, d.table.rowCount - 1) },
      }));
      loadList();
    });
  };

  const handleMore = () =>
    run(async () => {
      const last = detail.rows[detail.rows.length - 1];
      const data = await api(`/${selectedId}?before=${last.row}`);
      setDetail((d) => ({ ...d, rows: [...d.rows, ...data.rows], hasMore: data.hasMore }));
    });

  const doCopy = async (what, text) => {
    const ok = await copyText(text);
    if (!ok) {
      setError("복사하지 못했습니다. 글을 직접 선택해 복사해 주세요.");
      return;
    }
    setCopied(what);
    setTimeout(() => setCopied(""), 2000);
  };

  // ── 기록 표의 열 (기록의 키를 모아 자동 생성) ────────
  const columns = useMemo(() => {
    const keys = [];
    const seen = new Set(["row", "at"]);
    for (const r of detail?.rows || []) {
      for (const k of Object.keys(r)) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }
    return keys;
  }, [detail]);

  // ── 화면 ───────────────────────────────────────────────
  if (user === undefined) {
    return <p className={vibe.empty}>불러오는 중…</p>;
  }

  if (!user) {
    return (
      <>
        <p className={vibe.copyHint}>
          <strong>외솔 DB</strong>는 선생님이 챗GPT로 만든 HTML 앱이 기록을 저장하고 읽어 오는 곳입니다.
          버튼 하나로 <strong>표</strong>를 만들면 표 주소와 안내문이 나오고, 그걸 챗GPT에 붙이면 끝입니다.
          가입도, API 키 발급도, 코드 복사도 없습니다.
        </p>
        <div className={vibe.row}>
          <Link href="/login" className={vibe.btnPrimary}>선생님 로그인하고 표 만들기</Link>
          <Link href="/db/guide" target="_blank" rel="noreferrer" className={vibe.btn}>📖 사용안내 읽기</Link>
        </div>
        <p className={vibe.footnote}>
          칭찬 포인트 · 학급 투표 · 희망 조사 · 독서 기록 · 모둠 점수판처럼 "저장"이 필요한 모든 앱에 쓸 수 있습니다.
        </p>
      </>
    );
  }

  if (unavailable) {
    return (
      <div className={vibe.notice}>
        외솔 DB 서버가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  // 표 세부
  if (selectedId && detail) {
    const t = detail.table;
    const guideText = buildDbGuideText({ url: t.url, key: t.key, name: t.name });
    const csvUrl = `${t.url}?format=csv`;

    return (
      <>
        {flash && <div className={`${vibe.notice} ${vibe.noticeOk}`}>{flash}</div>}

        <div className={vibe.detailHead}>
          <button type="button" className={vibe.backBtn} onClick={() => { setSelectedId(null); setDetail(null); setError(""); }}>
            ← 표 목록
          </button>
          <h3 className={vibe.detailName}>{t.name}</h3>
          <button type="button" className={vibe.renameBtn} onClick={handleRename} disabled={busy}>이름 바꾸기</button>
          {t.locked && <span className={vibe.lockBadge}>🔒 쓰기 잠김</span>}
        </div>

        <div className={vibe.fieldGrid}>
          <div className={vibe.field}>
            <span className={vibe.fieldLabel}>표 주소</span>
            <span className={vibe.fieldValue}>{t.url}</span>
            <button type="button" className={vibe.btn} onClick={() => doCopy("url", t.url)}>
              {copied === "url" ? "복사됨!" : "복사"}
            </button>
          </div>
          <div className={vibe.field}>
            <span className={vibe.fieldLabel}>교사 키</span>
            <span className={`${vibe.fieldValue} ${showKey ? "" : vibe.fieldValueMuted}`}>
              {showKey ? t.key : "••••••••••••••••••••"}
            </span>
            <span className={vibe.row}>
              <button type="button" className={vibe.btn} onClick={() => setShowKey((v) => !v)}>
                {showKey ? "숨기기" : "보기"}
              </button>
              <button type="button" className={vibe.btn} onClick={() => doCopy("key", t.key)}>
                {copied === "key" ? "복사됨!" : "복사"}
              </button>
            </span>
          </div>
        </div>

        <div className={vibe.copyRow}>
          <button type="button" className={vibe.btnBig} onClick={() => doCopy("guide", guideText)}>
            {copied === "guide" ? "✅ 복사됐습니다" : "📋 챗GPT용 복사"}
          </button>
          <span style={{ fontSize: 14, color: "#64748b" }}>표 주소 + 교사 키 + 연동 안내문을 한 번에</span>
        </div>
        <p className={vibe.copyHint}>
          챗GPT 대화창에 붙여 넣고 한 줄만 덧붙이세요.{" "}
          <code>{DB_PROMPT_EXAMPLES[0]}</code>
          {" "}받은 HTML 을 <strong>외솔 드롭</strong> 탭에 올리면 기록이 이 표에 쌓입니다.
          학생이 쓰는 앱이라면 안내문대로 챗GPT가 키를 넣지 않은 앱을 만들어 줍니다.
        </p>

        <div className={vibe.toolbar}>
          <button type="button" className={vibe.btn} onClick={() => loadDetail(selectedId)} disabled={busy}>🔄 새로고침</button>
          <a href={csvUrl} className={vibe.btn} target="_blank" rel="noreferrer">⬇️ CSV 내려받기</a>
          <button type="button" className={vibe.btn} onClick={handleLock} disabled={busy}>
            {t.locked ? "🔓 잠금 풀기" : "🔒 쓰기 잠금"}
          </button>
          <span className={vibe.toolbarSpacer} />
          <button type="button" className={vibe.btn} onClick={handleRotateKey} disabled={busy}>키 다시 발급</button>
          <button type="button" className={vibe.btn} onClick={handleRotateId} disabled={busy}>새 주소로 바꾸기</button>
          <button type="button" className={vibe.btnDanger} onClick={handleClear} disabled={busy || t.rowCount === 0}>표 비우기</button>
          <button type="button" className={vibe.btnDanger} onClick={handleDeleteTable} disabled={busy}>표 삭제</button>
        </div>

        <p style={{ margin: "0 0 10px", fontSize: 14, color: "#475569" }}>
          기록 <strong>{t.rowCount.toLocaleString()}</strong>건
          {detail.rows.length > 0 && ` · 최신 ${detail.rows.length}건 표시`}
          {" · "}마지막 기록 {fmtTime(t.lastWriteAt)}
          {" · "}만료 예정 {fmtDate(t.expiresAt)} (쓰거나 읽으면 연장)
        </p>

        <div className={vibe.tableWrap}>
          {detail.rows.length === 0 ? (
            <div className={vibe.empty}>
              아직 기록이 없습니다.<br />
              앱에서 첫 기록이 들어오면 여기에 표로 보이고, 열은 기록의 키를 모아 자동으로 만들어집니다.
            </div>
          ) : (
            <table className={vibe.table}>
              <thead>
                <tr>
                  <th>row</th>
                  <th>at</th>
                  {columns.map((c) => <th key={c}>{c}</th>)}
                  <th aria-label="삭제" />
                </tr>
              </thead>
              <tbody>
                {detail.rows.map((r) => (
                  <tr key={r.row}>
                    <td className={vibe.cellRow}>{r.row}</td>
                    <td className={vibe.cellAt}>{fmtTime(r.at)}</td>
                    {columns.map((c) => (
                      <td key={c} title={cellText(r[c])}>{cellText(r[c])}</td>
                    ))}
                    <td>
                      <button type="button" className={vibe.rowDel} onClick={() => handleDeleteRow(r.row)} disabled={busy}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {detail.hasMore && (
            <div className={vibe.moreRow}>
              <button type="button" className={vibe.btn} onClick={handleMore} disabled={busy}>이전 기록 더 보기</button>
            </div>
          )}
        </div>

        {error && <div className={vibe.error}>{error}</div>}

        <p className={vibe.footnote}>
          이 표를 아는 사람은 누구나 읽고 추가할 수 있습니다. 고치기·지우기는 교사 키가 있어야 합니다.
          주소나 키가 샌 것 같으면 「새 주소로 바꾸기」「키 다시 발급」을 누르세요.
        </p>
      </>
    );
  }

  // 표 목록
  const atLimit = limit !== null && tables.length >= limit;

  return (
    <>
      {flash && <div className={`${vibe.notice} ${vibe.noticeOk}`}>{flash}</div>}

      {tables.length === 0 ? (
        <p className={vibe.copyHint}>
          아직 만든 표가 없습니다. <strong>표 이름</strong>만 적고 만들면 됩니다. 컬럼은 정하지 않습니다.
          첫 기록이 들어오면 그 모양대로 열이 생깁니다.
        </p>
      ) : (
        <div className={vibe.list}>
          {tables.map((t) => (
            <button key={t.id} type="button" className={vibe.card} onClick={() => loadDetail(t.id)}>
              <span className={vibe.cardName}>{t.name}</span>
              <span className={vibe.cardMeta}>
                <span>기록 {t.rowCount.toLocaleString()}건</span>
                <span>마지막 {fmtTime(t.lastWriteAt)}</span>
                {t.locked && <span className={vibe.lockBadge}>잠김</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className={vibe.createBox}>
        <p className={vibe.createTitle}>새 표 만들기 <span style={{ fontWeight: 500, color: "#64748b" }}>({tables.length} / {limit === null ? "무제한" : limit})</span></p>
        <div className={vibe.row}>
          <input
            className={vibe.input}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="표 이름. 예: 5학년 1반 칭찬 포인트"
            maxLength={60}
            disabled={atLimit}
          />
          <button type="submit" className={vibe.btnPrimary} disabled={busy || atLimit}>
            {busy ? "만드는 중…" : "표 만들기"}
          </button>
        </div>
        {!consented && (
          <label className={vibe.consent}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>{CONSENT_TEXT} <span style={{ color: "#94a3b8" }}>(처음 한 번만 동의)</span></span>
          </label>
        )}
        {atLimit && <p className={vibe.error}>표는 계정당 {limit}개까지입니다. 쓰지 않는 표를 지워 주세요.</p>}
      </form>

      {error && <div className={vibe.error}>{error}</div>}

      <p className={vibe.footnote}>
        표당 20,000행 · 행당 2KB · 마지막 사용 후 400일 지나면 자동 삭제(30일 전 메일).
        학급 규모 기록을 위한 서비스입니다. 더 큰 기록은{" "}
        <Link href="/db/guide#faq" className={styles.dropFootnoteLink} target="_blank" rel="noreferrer">다른 방법</Link>을 안내합니다.
      </p>
    </>
  );
}
