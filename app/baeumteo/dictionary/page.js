/* 파일 경로: app/baeumteo/dictionary/page.js — 사전 편찬소 (3단계)
   보이는 주소는 /배움터/사전편찬소. 미들웨어가 이 경로로 넘긴다.
   셈과 저장은 lib/baeumteo/* 에 있고, 여기는 조판만 한다. */

import Link from 'next/link';
import { Noto_Serif_KR } from 'next/font/google';

import styles from './page.module.css';
import Editorial from './Editorial';
import { oesol } from '../../../lib/oesol';
import config from '../../../data/games/dictionary.json';

const serif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: '사전 편찬소 · 외솔 배움터',
  description:
    '낱말 카드를 모아 우리말 사전을 채웁니다. 낱말을 실을 때마다 뜻을 한 번 고릅니다. 로그인 없이 이 기기에 저장됩니다.',
  alternates: { canonical: '/배움터/사전편찬소' },
};

export default function DictionaryPage() {
  const { site } = oesol;

  return (
    <div className={`${styles.page} ${serif.className}`}>
      <div className={styles.subnav}>
        <div className={styles.wrap}>
          <Link href="/배움터" className={styles.brand}>
            {site.title} <span>{site.host}</span>
          </Link>
          <nav className={styles.navLinks}>
            <Link href="/배움터#games">학생 마당</Link>
            <Link href="/배움터#kits">수업 자료</Link>
          </nav>
        </div>
      </div>

      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>사전 편찬소</h1>
          <p>
            낱말 카드가 시간이 갈수록 쌓입니다. 카드 {config.entry_cost}장이면 낱말 하나를 사전에 실을 수 있고, 실을 때
            그 낱말의 뜻을 한 번 고릅니다. 사전이 자라면 다른 게임이 하나씩 열립니다.
          </p>
          <p className={styles.small}>
            진행은 이 기기에만 저장됩니다. 로그인은 없습니다. 다른 기기에서 이어 하려면 저장 코드를 옮기세요.
          </p>
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Editorial />
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
