/* 파일 경로: components/Header.js */

import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.wrapper}>
        
        {/* 1. 왼쪽: 우리아이 로고 (메인으로 이동) */}
        <Link href="/">
          <Image 
            /* public/images/에 저장했다고 가정 */
            src="/images/logo-woori-ai.svg" 
            alt="우리아이 로고"
            width={180}  /* SVG 원본 비율에 맞게 (추후 수정) */
            height={50}  /* SVG 원본 비율에 맞게 (추후 수정) */
            className={styles.logo}
            priority /* 헤더 로고는 항상 빨리 로드 */
          />
        </Link>
        
        {/* 2. 오른쪽: 나의 URL 링크 (대시보드로 이동) */}
        <Link href="/dashboard" className={styles.myUrlButton}>
          나의 URL
        </Link>
        
      </div>
    </header>
  );
}