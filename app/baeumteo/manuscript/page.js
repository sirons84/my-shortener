/* 파일 경로: app/baeumteo/manuscript/page.js — 잃어버린 원고 (5단계)
   보이는 주소는 /배움터/잃어버린원고. 미들웨어가 이 경로로 넘긴다.
   판을 셈하는 규칙은 lib/baeumteo/manuscript.js 에 있고, 여기는 조판만 한다. */

import styles from './page.module.css';
import Stage from './Stage';
import TopRecord from '../TopRecord';
import { topScore } from '../../../lib/baeumteo/leaderboard';
import config from '../../../data/games/manuscript.json';
import { maxScore } from '../../../lib/baeumteo/manuscript';

export const metadata = {
  title: '잃어버린 원고 · 외솔 배움터',
  description:
    '1942년, 형사의 눈을 피해 사전 원고 상자를 옮깁니다. 골목과 서울역 창고 두 판입니다. 로그인 없이 이 기기에 저장됩니다.',
  alternates: { canonical: '/배움터/잃어버린원고' },
};

export const revalidate = 60;

export default async function ManuscriptPage() {
  const top = await topScore('manuscript', { faster: true });
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>잃어버린 원고</h1>
          <p>
            1942년 조선어학회 사건으로 사전 원고가 압수됩니다. 형사가 도는 골목과 창고에서 원고 상자{' '}
            {maxScore(config)}개를 찾아 문으로 나가세요. 형사의 시야에 {config.seen_ms / 1000}초 들어가 있으면
            잡힙니다.
          </p>
          <p className={styles.small}>
            사건 카드 두 장이 시작과 끝에 있습니다. 놀이는 지어낸 이야기이고, 카드에 적힌 것만 사실입니다. 진행은
            이 기기에만 저장됩니다. 순위판에 남길 때만 별명과 학교를 보냅니다.
          </p>

          <TopRecord record={top} unit="개" timed />
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Stage />
      </div>
    </div>
  );
}
