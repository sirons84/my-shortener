/* 파일 경로: app/baeumteo/layout.js
   배움터 네 화면의 껍데기. 서체·색·머리·바닥이 여기 한 벌만 있다.

   화면마다 머리와 바닥을 따로 두었더니 같은 것을 네 벌 베끼게 되고,
   사이트 껍데기까지 겹쳐 머리도 바닥도 두 벌이 됐다. 여기로 모은다. */

import { Noto_Serif_KR } from 'next/font/google';

import styles from './layout.module.css';
import Nav from './Nav';
import Foot from './Foot';

const serif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export default function BaeumteoLayout({ children }) {
  return (
    <div className={`${styles.shell} ${serif.className}`}>
      <Nav />
      <div className={styles.body}>{children}</div>
      <Foot />
    </div>
  );
}
