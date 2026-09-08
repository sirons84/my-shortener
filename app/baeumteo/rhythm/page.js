/* 파일 경로: app/baeumteo/rhythm/page.js — 한글 리듬 (7단계)
   보이는 주소는 /배움터/한글리듬. 미들웨어가 이 경로로 넘긴다.
   악보와 판정은 lib/baeumteo/rhythm.js 에 있고, 여기는 조판만 한다. */

import { Nanum_Brush_Script } from 'next/font/google';

import styles from './page.module.css';
import Play from './Play';
import TopRecord from '../TopRecord';
import { topScore } from '../../../lib/baeumteo/leaderboard';
import config from '../../../data/games/rhythm.json';

const brush = Nanum_Brush_Script({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const metadata = {
  title: '한글 리듬 · 외솔 배움터',
  description:
    '노래에 맞춰 네 줄로 떨어지는 우리말 글자를 칩니다. 낱말이 끝나면 크게 보이고, 콤보를 이으면 낱말 카드가 떨어집니다.',
  alternates: { canonical: '/배움터/한글리듬' },
};

export const revalidate = 60;

export default async function RhythmPage() {
  const top = await topScore('rhythm');
  const track = config.tracks[0];
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>한글 리듬</h1>
          <p>
            곡 「{track.title}」에 맞춰 글자가 네 줄로 떨어집니다. 판정선에 닿을 때 그 줄의 글쇠를 누르거나 화면을
            누르세요. 글자는 1~2학년 낱말의 음절이고, 낱말이 끝나면 잠깐 크게 보입니다.
          </p>
          <p className={styles.small}>
            실패는 없습니다. 콤보 {config.combo_reward.every}마다 낱말 카드 {config.combo_reward.cards}장을 받고,
            점수로 순위를 남길 수 있습니다. 진행은 이 기기에만 저장됩니다.
          </p>

          <TopRecord record={top} unit="점" />
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Play brushClassName={brush.className} />
      </div>
    </div>
  );
}
