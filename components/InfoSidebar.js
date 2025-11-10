/* 파일 경로: components/InfoSidebar.js (이 코드로 덮어쓰세요) */

import Link from 'next/link';
import Image from 'next/image';
import styles from './InfoSidebar.module.css';
import OesolLogo from './OesolLogo';

export default function InfoSidebar() {
  return (
    <aside className={styles.sidebar}>
      
      {/* 1. '외솔한국' 로고 */}
      <OesolLogo />

      {/* 2. '외솔 최현배' 하얀 박스 카드 */}
      <div className={styles.card}>
        
        {/* 3. 텍스트 콘텐츠 (z-index: 2) */}
        <div className={styles.content}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>외솔이란?</span>
            <Link href="/info" className={styles.cardMoreLink}>
              더 알아보기 ↗
            </Link>
          </div>
          
          <h3 className={styles.personName}>외솔 최현배</h3>
          <p className={styles.personQuote}>말과 글은 우리의 얼이다.</p>
        </div>
        
        {/* 4. 이미지 컨테이너 (z-index: 1) */}
        <div className={styles.imageContainer}>
          <Image
            src="/images/person-choi.png"
            alt="외솔 최현배"
            width={466}  /* 컨테이너 크기와 동일하게 (CSS가 제어함) */
            height={320} /* 컨테이너 크기와 동일하게 (CSS가 제어함) */
            className={styles.personImage}
          />
        </div>

      </div>
    </aside>
  );
}