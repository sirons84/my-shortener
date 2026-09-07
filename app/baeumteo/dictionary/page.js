/* 파일 경로: app/baeumteo/dictionary/page.js — 사전 편찬소 (3단계)
   보이는 주소는 /배움터/사전편찬소. 미들웨어가 이 경로로 넘긴다.
   셈과 저장은 lib/baeumteo/* 에 있고, 여기는 조판만 한다. */

import styles from './page.module.css';
import Editorial from './Editorial';
import config from '../../../data/games/dictionary.json';

export const metadata = {
  title: '사전 편찬소 · 외솔 배움터',
  description:
    '5분 안에 우리말 사전을 몇 개나 채울 수 있는지 겨룹니다. 낱말을 실을 때마다 뜻을 한 번 고릅니다. 로그인 없이 이 기기에 저장됩니다.',
  alternates: { canonical: '/배움터/사전편찬소' },
};

export default function DictionaryPage() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.wrap}>
          <h1>사전 편찬소</h1>
          <p>
            한 판은 {Math.round(config.round_ms / 60000)}분입니다. 낱말 카드가 초마다 쌓이고, 카드{' '}
            {config.entry_cost}장이면 첫 낱말을 사전에 싣습니다. 하나 실을 때마다 다음 낱말의 값이 가파르게
            오르니, 사람을 뽑아 카드가 쌓이는 속도를 함께 올려야 합니다. 실을 때 그 낱말의 뜻을 한 번 고릅니다.
          </p>
          <p className={styles.small}>
            판은 늘 카드 0에서 시작하고, 자리를 비우면 시계도 멈춥니다. 실어 본 낱말은 그대로 남아 다른 게임을
            엽니다. 진행은 이 기기에만 저장되고, 다른 기기에서 이어 하려면 저장 코드를 옮기세요.
          </p>
        </div>
      </header>
      <hr className={styles.rule} />

      <div className={styles.wrap}>
        <Editorial />
      </div>
    </div>
  );
}
