/* 파일 경로: app/VibeMain.js — 홈 하단 「바이브 코딩 w 외솔」 카드
   탭 두 개: 외솔 드롭(HTML 한 장 배포) / 외솔 DB(앱의 기록 저장소).
   드롭 쪽은 기존 DropMain 을 그대로 탭 안에 넣기만 한다. */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import styles from "./page.module.css";
import vibe from "./vibe.module.css";
import DropMain from "./DropMain";
import DbMain from "./DbMain";

const TABS = [
  { key: "drop", label: "외솔 드롭", guide: "/drop/guide", hash: "" },
  { key: "db", label: "외솔 DB", guide: "/db/guide", hash: "#db", badge: "새 기능" },
];

export default function VibeMain() {
  const [tab, setTab] = useState("drop");

  // 외솔.한국/#db 로 들어오면 외솔 DB 탭을 바로 연다 (사용안내·메일에서 링크하기 위함)
  useEffect(() => {
    const apply = () => {
      if (typeof window === "undefined") return;
      if (window.location.hash === "#db") setTab("db");
      else if (window.location.hash === "#drop") setTab("drop");
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const select = (key) => {
    setTab(key);
    if (typeof window !== "undefined") {
      const next = key === "db" ? "#db" : "#drop";
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
    }
  };

  const current = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <div className={styles.wrapper} id="vibe">
      <section className={`${styles.mainContent} ${styles.mainContentWide}`}>
        <h2 className={styles.title}>
          바이브 코딩 <span style={{ color: "#94a3b8", fontWeight: 500 }}>w</span> 외솔
          <span className={styles.betaBadge}>베타</span>
          <Link
            href={current.guide}
            target="_blank"
            rel="noreferrer"
            className={styles.guideBtn}
            aria-label={`${current.label} 사용 안내 (새 창)`}
          >
            📖 {current.label} 사용안내
          </Link>
        </h2>

        <p className={vibe.intro}>
          챗GPT·클로드·제미나이에게 말로 시켜 만든 <strong>HTML 한 장</strong>을
          <strong> 외솔 드롭</strong>으로 주소 하나에 올리고,
          그 앱이 남기는 기록은 <strong>외솔 DB</strong>에 쌓습니다.
          서버도, 코드 편집기도, 가입도 필요 없습니다.
        </p>

        <div className={vibe.tabs} role="tablist" aria-label="바이브 코딩 도구">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`${vibe.tab} ${tab === t.key ? vibe.tabActive : ""}`}
              onClick={() => select(t.key)}
            >
              {t.label}
              {t.badge && tab !== t.key && <span className={vibe.tabBadge}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {tab === "drop" ? <DropMain embedded /> : <DbMain />}
      </section>
    </div>
  );
}
