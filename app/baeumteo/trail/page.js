/* 파일 경로: app/baeumteo/trail/page.js — 외솔길 탐험 (8단계)
   보이는 주소는 /배움터/외솔길. 미들웨어가 이 경로로 넘긴다.
   지도 API 가 필요한 유일한 게임이라 카카오맵 SDK 를 클라이언트에서 싣는다. */

import styles from './page.module.css';
import Trail from './Trail';
import config from '../../../data/games/trail.json';

export const metadata = {
  title: '외솔길 탐험 · 외솔 배움터',
  description:
    '울산 지도 위에서 외솔 생가와 기념관, 두 동상을 차례로 찾아갑니다. 찾을 때마다 짧은 문제 하나. 답사 사전학습용입니다.',
  alternates: { canonical: '/배움터/외솔길' },
};

export default function TrailPage() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>외솔길 탐험</h1>
          <p>
            울산 지도 위에서 외솔의 자리 {config.stops.length}곳을 차례로 찾아갑니다. 지도를 끌고 넓히며 글씨를 읽어
            그 자리를 누르면 찾은 것이고, 찾을 때마다 짧은 문제 하나를 풉니다.
          </p>
          <p className={styles.small}>
            답사 가기 전에 학급에서 함께 돌아보기 좋습니다. 실패는 없고, 다 돌면 낱말 카드를 받습니다. 순위는 없습니다.
          </p>
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Trail />
      </div>
    </div>
  );
}
