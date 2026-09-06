/* 파일 경로: app/DropMain.js — 홈 하단 '외솔 드롭(베타)' 영역
   위쪽 단축 주소 카드와 같은 스타일(page.module.css)을 그대로 쓴다 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toUnicode } from "punycode";

import styles from "./page.module.css";
import PrefixedInput from "../components/PrefixedInput";
import StyledSelect from "../components/StyledSelect";
import SubmitButton from "../components/SubmitButton";

const MAX_BYTES = 1024 * 1024; // 1MB — 서버(lib/drop.js)와 동일

const expiryOptions = [
  { value: "30d", label: "1개월" },
  { value: "180d", label: "6개월" },
  { value: "365d", label: "1년" },
  { value: "forever", label: "무제한 (영구)" },
];

export default function DropMain() {
  const supabase = createClientComponentClient();

  const [user, setUser] = useState(null);
  const [drops, setDrops] = useState([]);
  const [limit, setLimit] = useState(1);

  const [code, setCode] = useState("");
  const [replaceCode, setReplaceCode] = useState(""); // 교체할 기존 페이지 주소
  const [expiry, setExpiry] = useState("365d");
  const [html, setHtml] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, [supabase]);

  const loadDrops = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/drop", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDrops(data.drops || []);
      if (data.limit !== undefined) setLimit(data.limit);
    } catch {
      /* 조회 실패는 무시하고 새로 배포할 수 있게 둔다 */
    }
  }, [getToken]);

  // 로그인 상태 + 내가 배포 중인 페이지 확인
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: { user: found } } = await supabase.auth.getUser();
      if (!alive) return;
      setUser(found ?? null);
      if (found) await loadDrops();
    })();

    return () => { alive = false; };
  }, [supabase, loadDrops]);

  // ── 주소 표기 ───────────────────────────────────────────
  const hostName = () => {
    if (typeof window === "undefined") return "외솔.한국";
    const host = window.location.hostname;
    try {
      return host.startsWith("xn--") ? toUnicode(host) : host;
    } catch {
      return host;
    }
  };

  const displayUrl = (targetCode) => `${hostName()}/${targetCode}`;
  const openUrl = (targetCode) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/${encodeURIComponent(targetCode)}`;

  const atLimit = limit !== null && drops.length >= limit;

  // ── 파일 읽기 ───────────────────────────────────────────
  const readFile = async (file) => {
    if (!file) return;

    if (!/\.(html?|htm)$/i.test(file.name)) {
      setError("HTML 파일(.html)만 올릴 수 있습니다.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("파일이 너무 큽니다. (최대 1MB)");
      return;
    }

    const text = await file.text();
    setHtml(text);
    setFileName(file.name);
    setError("");

    if (!code) {
      const base = file.name.replace(/\.(html?|htm)$/i, "").replace(/[^\p{L}\p{N}_-]/gu, "-");
      setCode(base.slice(0, 30));
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    readFile(e.dataTransfer.files?.[0]);
  };

  // ── 교체 대상 선택 ──────────────────────────────────────
  const startReplace = (targetCode) => {
    setReplaceCode(targetCode);
    setCode(targetCode);
    setError("");
    setPublished("");
  };

  const cancelReplace = () => {
    setReplaceCode("");
    setCode("");
  };

  // ── 배포 ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPublished("");

    if (!user) {
      setError("외솔 드롭은 로그인 후 이용할 수 있습니다.");
      return;
    }
    if (!html.trim()) {
      setError("HTML 파일을 올리거나 코드를 붙여넣어 주세요.");
      return;
    }
    if (!code.trim()) {
      setError("배포할 주소를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim(), html, expiry, replaceCode: replaceCode || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "배포에 실패했습니다.");
        return;
      }

      setPublished(data.code);
      setHtml("");
      setFileName("");
      setReplaceCode("");
      await loadDrops();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl(published));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 접근 실패는 조용히 무시 */
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* 사이드바 자리까지 포함해 한 줄 전체를 쓰는 넓은 카드 */}
      <section className={`${styles.mainContent} ${styles.mainContentWide}`}>
        <h2 className={styles.title}>
          외솔 드롭 <span className={styles.betaBadge}>베타</span>
        </h2>

        <p className={styles.dropIntro}>
          AI로 만든 <strong>HTML 파일 한 장</strong>을 아래에 끌어다 놓으면,
          <strong> 외솔.한국 주소로 바로 배포</strong>해 드립니다.
          따로 서버를 빌리거나 프로그램을 설치할 필요 없이,
          학급 안내장·학습 자료·설문 페이지를 주소 하나로 나눠 보세요.
        </p>

        {/* 지금 배포 중인 페이지들 */}
        {drops.length > 0 && (
          <div className={styles.dropCurrentList}>
            {drops.map((d) => (
              <div key={d.code} className={styles.dropCurrent}>
                <span className={styles.dropCurrentLabel}>배포 중</span>
                <a href={openUrl(d.code)} target="_blank" rel="noreferrer" className={styles.dropCurrentUrl}>
                  {displayUrl(d.code)}
                </a>
                <button
                  type="button"
                  onClick={() => (replaceCode === d.code ? cancelReplace() : startReplace(d.code))}
                  className={`${styles.dropReplaceBtn} ${replaceCode === d.code ? styles.dropReplaceBtnActive : ""}`}
                >
                  {replaceCode === d.code ? "교체 대상 (누르면 해제)" : "이 페이지 교체"}
                </button>
              </div>
            ))}

            <p className={styles.dropCurrentHint}>
              {limit === null ? "개수 제한 없이 배포할 수 있습니다." : `${drops.length} / ${limit}개 사용 중`}
              {atLimit && !replaceCode && " · 새로 배포하려면 기존 페이지를 교체하거나 대시보드에서 내려주세요."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 1. 파일 놓는 곳 */}
          <div
            className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
          >
            <span className={styles.dropZoneIcon} aria-hidden="true">📄</span>
            <span className={styles.dropZoneText}>
              {fileName || "여기에 HTML 파일을 끌어다 놓으세요"}
            </span>
            <span className={styles.dropZoneHint}>클릭해서 파일 선택 · 최대 1MB</span>
            <span className={styles.dropMobileNote}>
              휴대폰에서는 파일 올리기가 어려울 수 있어요. 컴퓨터에서 배포해 주세요.
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              onChange={(e) => readFile(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </div>

          <details className={styles.dropPaste}>
            <summary className={styles.dropPasteSummary}>파일 대신 코드를 붙여넣기</summary>
            <textarea
              value={html}
              onChange={(e) => { setHtml(e.target.value); setFileName(""); }}
              placeholder="<!doctype html> ..."
              rows={8}
              className={styles.dropTextarea}
            />
          </details>

          <div className={styles.arrowStatic}>
            <Image src="/icons/arrow-down.svg" alt="아래 화살표" width={24} height={24} />
          </div>

          {/* 2. 주소 + 유지 기간 */}
          <div className={`${styles.selectWrapper} ${styles.selectWrapperTight}`}>
            <div className={styles.customCodeInput}>
              <PrefixedInput
                label={replaceCode ? `배포 주소 (${replaceCode} 교체 중)` : "배포 주소"}
                placeholder="우리반"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <StyledSelect
                label="유지 기간"
                value={expiry}
                onChange={(newValue) => setExpiry(newValue)}
                options={expiryOptions}
              />
              {!user && (
                <Link href="/login" className={styles.loginHintLink}>
                  <span className={styles.loginHintIcon}>🔒</span>
                  로그인하면 배포할 수 있어요
                </Link>
              )}
            </div>
          </div>

          <SubmitButton
            disabled={loading}
            label={replaceCode ? "교체하기" : "배포하기"}
            loadingLabel="배포 중..."
            showCharacter={false}
          />
        </form>

        {error && <div style={{ color: "red", textAlign: "center", marginTop: "15px" }}>{error}</div>}

        {published && !loading && (
          <div className={styles.resultCard}>
            <p style={{ marginBottom: "10px", fontSize: "18px", fontWeight: "600" }}>🎉 배포 완료!</p>
            <p style={{ marginBottom: "8px", wordBreak: "break-all", fontSize: "16px", color: "#0984e3" }}>
              <strong>{displayUrl(published)}</strong>
            </p>
            <p style={{ marginBottom: "4px", fontSize: "13px", color: "#636e72" }}>
              주소를 아는 사람만 볼 수 있고, 검색에는 나오지 않습니다.
            </p>

            <div className={styles.actionRow}>
              <a
                href={openUrl(published)}
                target="_blank"
                rel="noreferrer"
                className={styles.copyButton}
                style={{ textDecoration: "none" }}
              >
                <span>열어보기</span>
              </a>
              <button type="button" onClick={handleCopy} className={styles.copyButton}>
                <span>{copied ? "복사됨!" : "주소 복사"}</span>
              </button>
            </div>
          </div>
        )}

        <p className={styles.dropFootnote}>
          베타 기능입니다. 올린 페이지는{" "}
          <Link href="/dashboard" className={styles.dropFootnoteLink}>대시보드</Link>에서 바꾸거나 내릴 수 있습니다.
        </p>
      </section>
    </div>
  );
}
