/* 파일 경로: app/VibeMain.js — 홈 하단 「말로 짓는 누리집」 카드
   탭 두 개: 누리집 펴내기(HTML 한 장 펴내기) / 기록 곳간(앱의 기록 저장소).
   드롭 쪽은 기존 DropMain 을 그대로 탭 안에 넣기만 한다. */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import styles from "./page.module.css";
import vibe from "./vibe.module.css";
import DropMain from "./DropMain";
import DbMain from "./DbMain";

const TABS = [
  { key: "drop", label: "누리집 펴내기", guide: "/drop/guide", hash: "" },
  { key: "db", label: "기록 곳간", guide: "/db/guide", hash: "#db", badge: "새 기능" },
];

export default function VibeMain() {
  const [tab, setTab] = useState("drop");

  // 외솔.한국/#db 로 들어오면 기록 곳간 탭을 바로 연다 (사용안내·메일에서 링크하기 위함)
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
          말로 짓는 누리집
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
          만든 HTML 한 장은 <strong>누리집 펴내기</strong>(홈페이지 배포)로 한글 주소에 올리고,
          그 누리집이 남기는 기록은 <strong>기록 곳간</strong>(클라우드 DB)에 쌓습니다.
        </p>

        <div className={vibe.tabs} role="tablist" aria-label="말로 짓는 누리집 도구">
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
