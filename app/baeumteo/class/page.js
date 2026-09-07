/* 파일 경로: app/baeumteo/class/page.js — 반 코드 (4단계)
   보이는 주소는 /배움터/반. 교사가 반을 만들고, 학생이 코드를 받아 적는다.
   반에 담기는 것은 낱말 id 집합과 순위판 기록뿐이다 (기획서 §7, §9). */

import Link from 'next/link';
import { Noto_Serif_KR } from 'next/font/google';

import styles from './page.module.css';
import Room from './Room';
import { oesol } from '../../../lib/oesol';

const serif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: '반 코드 · 외솔 배움터',
  description:
    '교사가 반 코드를 만들고 학생이 받아 적습니다. 우리 반 순위판과 반 공동 사전을 함께 봅니다. 이름은 받지 않습니다.',
  alternates: { canonical: '/배움터/반' },
};

export default function ClassPage() {
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
            <Link href="/배움터#kits">수업 자료</Link>
          </nav>
        </div>
      </div>

      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>반 코드</h1>
          <p>
            선생님이 반을 만들면 <b>화진-5-1-K2P7</b> 같은 코드가 나옵니다. 학생이 그 코드를 적어 넣으면 기록이
            우리 반으로 묶이고, 반이 실은 낱말이 한 사전으로 모입니다.
          </p>
          <p className={styles.small}>
            반에는 이름을 담지 않습니다. 별명과 학년·반만 담고, 지우고 싶은 기록은 이유 없이 바로 지웁니다.
          </p>
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Room />
      </div>

      <div className={styles.pageFoot}>
        <div className={styles.wrap}>
          <div>{site.host} · 미래교육창작소</div>
          <div className={styles.small}>
            반을 지우면 그 반으로 남은 기록도 함께 지워집니다.
          </div>
        </div>
      </div>
    </div>
  );
}
