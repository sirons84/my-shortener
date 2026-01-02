/* 파일 경로: components/InfoSidebar.js (이 코드로 덮어쓰세요) */

import Link from 'next/link';
import Image from 'next/image';
import styles from './InfoSidebar.module.css';
import OesolLogo from './OesolLogo';

export default function InfoSidebar() {
  return (
    <aside className={styles.sidebar}>
      
      <OesolLogo />

      <div className={styles.card}>
        
        <div className={styles.content}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>외솔이란?</span>
            <Link href="https://www.junggu.ulsan.kr/oesol/" className={styles.cardMoreLink}>
              더 알아보기 ↗
            </Link>
          </div>
          
          <h3 className={styles.personName}>외솔 최현배</h3>
          <p className={styles.personQuote}>말과 글은 <br/>우리의 얼이다.</p>
        </div>
        
        <div className={styles.imageContainer}>
          <Image
            src="/images/person-choi.png"
            alt="외솔 최현배"
            
            /* (!! 수정 !!) CSS 컨테이너 크기(360x360)와 일치시킴 */
            width={360}  
            height={360} 
            
            className={styles.personImage}
          />
        </div>

      </div>
    </aside>
  );
}