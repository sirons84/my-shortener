/* 파일 경로: app/baeumteo/malmoi/page.js — 울산 말모이 원정대 (8단계)
   보이는 주소는 /배움터/말모이. 미들웨어가 이 경로로 넘긴다.
   검사 규칙은 lib/baeumteo/malmoi.js 에 있고, 여기는 조판만 한다.
   순위가 없으므로 서버에서 읽을 것도 없다. */

import styles from './page.module.css';
import Expedition from './Expedition';
import config from '../../../data/games/malmoi.json';

export const metadata = {
  title: '울산 말모이 원정대 · 외솔 배움터',
  description:
    '1929년 전국에서 낱말을 모았던 말모이처럼, 우리 동네 울산말을 모아 반 지도에 핀을 꽂습니다. 선생님 확인을 거쳐 진짜 기록이 됩니다.',
  alternates: { canonical: '/배움터/말모이' },
};

export default function MalmoiPage() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>울산 말모이 원정대</h1>
          <p>
            할머니, 할아버지, 이웃 어른에게 들은 우리 동네 말을 올립니다. 낱말과 뜻, 어느 구·군에서 누구에게 들었는지를
            적으면 선생님이 확인한 뒤 우리 반 지도에 핀이 꽂힙니다.
          </p>
          <p className={styles.small}>
            반 코드가 있어야 올릴 수 있습니다. 이름은 받지 않고, 들려준 분도 관계만 고릅니다. 확인된 낱말 하나에 낱말
            카드 {config.reward.approved}장을 받습니다. 순위는 없습니다.
          </p>
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Expedition />
      </div>
    </div>
  );
}
