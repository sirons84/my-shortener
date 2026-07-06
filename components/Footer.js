/* 파일 경로: components/Footer.js */

import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrapper}>
        
        {/* 1. 상단 링크 영역 */}
        <div className={styles.links}>
          <Link href="/privacy" className={styles.link}>
            개인정보처리방침
          </Link>
          <span className={styles.separator}>|</span>
          <Link href="/terms" className={styles.link}>
            이용약관
          </Link>
          <span className={styles.separator}>|</span>
          <a href="mailto:sirons1124@gmail.com" className={styles.link}>
            문의하기
          </a>
        </div>

        {/* 2. 문의 / 담당자 */}
        <p className={styles.contact}>
          문의: 화진초 교사 석희철 ·{' '}
          <a href="mailto:sirons1124@gmail.com" className={styles.contactLink}>
            sirons1124@gmail.com
          </a>
        </p>

        {/* 3. 하단 저작권 텍스트 */}
        <p className={styles.copyright}>
          © 2026 울산교육청 (개발자: 정윤호, 석희철, 오재경, 이강현, 김지현, 이충민, 박창현, 황정훈) 디자인 (요즘사람주식회사, 퍼스널컬러다이브). All rights reserved.
        </p>

      </div>
    </footer>
  );
}