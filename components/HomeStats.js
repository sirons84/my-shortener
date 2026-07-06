"use client";
import { useEffect, useState } from 'react';
import styles from './HomeStats.module.css';

export default function HomeStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/public-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setStats(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');

  const tiles = [
    { label: '사용 중인 단축 주소', value: fmt(stats?.activeUrls), suffix: '개', color: '#0984e3' },
    { label: '총 리디렉션 수', value: fmt(stats?.totalRedirects), suffix: '회', color: '#f6a609' },
    { label: '방문자 수', value: fmt(stats?.totalVisits), suffix: '회', color: '#00b894' },
  ];

  return (
    <section className={styles.wrap} aria-label="서비스 현황">
      <h2 className={styles.heading}>📊 외솔.한국 현황</h2>
      <div className={styles.grid}>
        {tiles.map((t) => (
          <div key={t.label} className={styles.tile}>
            <div className={styles.value} style={{ color: t.color }}>
              {t.value}
              <span className={styles.suffix}>{t.suffix}</span>
            </div>
            <div className={styles.label}>{t.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
