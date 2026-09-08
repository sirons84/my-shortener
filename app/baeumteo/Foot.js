/* 배움터 바닥 (기획서 §5-10).

   사이트 바닥을 벗겼으므로 이용안내·저작권·문의가 여기 있어야 한다.
   초등학생이 읽는 화면이라 기록을 어떻게 지우는지도 여기에 적어 둔다. */

import Link from 'next/link';

import styles from './layout.module.css';
import { oesol } from '../../lib/oesol';

export default function Foot() {
  const { site } = oesol;

  return (
    <footer className={styles.foot}>
      <div className={styles.wrap}>
        <div className={styles.footTop}>
          <div className={styles.footName}>
            {site.title} <span>{site.host} · 미래교육창작소</span>
          </div>
          <div className={styles.footLinks}>
            <Link href="/">외솔.한국</Link>
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/terms">이용약관</Link>
          </div>
        </div>

        <div className={styles.footCols}>
          <div>
            <h2>내 기록 지우기</h2>
            <p>
              진행은 이 기기에만 저장됩니다. 사전 편찬소의 <b>저장 코드</b> 화면에서 이 기기의 기록을 바로 지울 수
              있습니다. 순위판에 남긴 기록은 목록 옆 지우기로, 반 기록은 선생님이 <Link href="/배움터/반">반 화면</Link>
              에서 지웁니다. 이유는 묻지 않습니다.
            </p>
          </div>

          <div>
            <h2>자료 출처</h2>
            <p>
              낱말의 짝과 뜻은 국립국어원 순화어·다듬은 말을 따랐습니다. 외솔 최현배 선생의 생애와 연보는 외솔기념관과
              한글학회 자료를 따랐고, 확인 중인 항목은 화면에 그렇게 적어 두었습니다.
            </p>
          </div>

          <div>
            <h2>문의</h2>
            <p>
              울산교육청 교사 석희철 ·{' '}
              <a href="mailto:sirons1124@gmail.com">sirons1124@gmail.com</a>
              <br />
              교사 최혜원 · <a href="mailto:like0617@naver.com">like0617@naver.com</a>
            </p>
          </div>
        </div>

        <div className={styles.footEnd}>
          <p>로그인 없이 씁니다. 이름을 받지 않고, 순위판에 남길 때만 별명과 학교·학년·반을 받습니다.</p>
          <p>
            © 2026 울산교육청 (개발자: 석희철, 김영진, 김재원, 한연희, 김민경, 김지현, 이다인, 최한솔)
            관리자(최태진, 차선화). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
