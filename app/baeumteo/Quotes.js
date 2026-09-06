/* 파일 경로: app/배움터/Quotes.js — '외솔의 말' 앞·다음 넘기기 */
"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Quotes({ quotes, brushClassName }) {
  const [i, setI] = useState(0);

  if (!quotes || quotes.length === 0) return null;

  const move = (d) => setI((prev) => (prev + d + quotes.length) % quotes.length);
  const q = quotes[i];

  return (
    <div className={styles.quotes}>
      <blockquote>
        <p className={`${styles.qcal} ${brushClassName || ""}`}>{q.text}</p>
      </blockquote>
      <cite className={styles.qsrc}>
        {q.source}
        {q.verified === false && <span className={styles.pending}>확인 예정</span>}
      </cite>

      <div className={styles.qnav}>
        <button type="button" onClick={() => move(-1)}>← 앞의 말</button>
        <span className={styles.muted}>{i + 1} / {quotes.length}</span>
        <button type="button" onClick={() => move(1)}>다음 말 →</button>
      </div>
    </div>
  );
}
