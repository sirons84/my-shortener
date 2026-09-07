/* 파일 경로: app/baeumteo/defense/page.js — 우리말 지키기 (4단계)
   보이는 주소는 /배움터/우리말지키기. 미들웨어가 이 경로로 넘긴다.
   판을 짜는 셈은 lib/baeumteo/defense.js 에 있고, 여기는 조판만 한다. */

import Link from 'next/link';
import { Noto_Serif_KR } from 'next/font/google';

import styles from './page.module.css';
import Board from './Board';
import { oesol } from '../../../lib/oesol';
import config from '../../../data/games/defense.json';

const serif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: '우리말 지키기 · 외솔 배움터',
  description:
    '바꿔 쓸 말이 세 줄로 내려옵니다. 짝이 맞는 우리말 탑을 세워 막습니다. 로그인 없이 이 기기에 저장됩니다.',
  alternates: { canonical: '/배움터/우리말지키기' },
};

export default function DefensePage() {
  const { site } = oesol;

  return (
    <div className={`${styles.page} ${serif.className}`}>
      <div className={styles.subnav}>
        <div className={styles.wrap}>
          <Link href="/배움터" className={styles.brand}>
            {site.title} <span>{site.host}</span>
          </Link>
          <nav className={styles.navLinks}>
            <Link href="/배움터/사전편찬소">사전 편찬소</Link>
            <Link href="/배움터#games">학생 마당</Link>
          </nav>
        </div>
      </div>

      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>우리말 지키기</h1>
          <p>
            바꿔 쓸 말이 세 줄로 내려옵니다. 그 말 대신 쓰는 우리말을 골라 탑을 세우면 막을 수 있습니다.
            짝이 맞지 않는 탑은 헛발입니다. 물결 {config.waves.length}개를 넘기면 한 판이 끝납니다.
          </p>
          <p className={styles.small}>
            진행은 이 기기에만 저장됩니다. 순위판에 남길 때만 별명과 학교를 보냅니다. 이름은 받지 않습니다.
          </p>
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Board />
      </div>

      <div className={styles.pageFoot}>
        <div className={styles.wrap}>
          <div>{site.host} · 미래교육창작소</div>
          <div className={styles.small}>낱말 짝과 뜻은 국립국어원 순화어·다듬은 말을 따랐습니다.</div>
        </div>
      </div>
    </div>
  );
}
