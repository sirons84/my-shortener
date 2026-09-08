/* 파일 경로: app/baeumteo/study/page.js — 외솔의 서재 (6단계)
   보이는 주소는 /배움터/외솔의서재. 미들웨어가 이 경로로 넘긴다.
   단서의 재료와 답 맞춰 보기는 lib/baeumteo/study.js 에 있고, 여기는 조판만 한다.
   순위가 없으므로 서버에서 읽을 것도 없다. */

import { Nanum_Brush_Script } from 'next/font/google';

import styles from './page.module.css';
import Escape from './Escape';
import config from '../../../data/games/study.json';

// 외솔의 말은 붓글씨체로 (기획서 §5 디자인 토큰)
const brush = Nanum_Brush_Script({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const metadata = {
  title: '외솔의 서재 · 외솔 배움터',
  description:
    '외솔의 서재에서 단서 셋을 차례로 풀고 나옵니다. 틀리면 힌트가 열리고 실패는 없습니다. 반 전체가 한 화면으로 함께 풀 수 있습니다.',
  alternates: { canonical: '/배움터/외솔의서재' },
};

export default function StudyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>외솔의 서재</h1>
          <p>
            책장, 책상, 창가를 오가며 단서 {config.clues.length}개를 차례로 풉니다. 단서는 외솔의 말과 연표에서
            나옵니다. 틀리면 힌트가 하나씩 열리고, 실패는 없습니다.
          </p>
          <p className={styles.small}>
            혼자 풀거나, 선생님이 한 화면으로 띄워 반이 함께 풉니다. 5~6학년 꾸러미 3차시와 짝입니다. 순위는 없고,
            다 풀면 낱말 카드 {config.reward.clear}장을 받습니다.
          </p>
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Escape brushClassName={brush.className} />
      </div>
    </div>
  );
}
