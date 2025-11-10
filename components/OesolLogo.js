/* 파일 경로: components/OesolLogo.js */

import Image from 'next/image';
import styles from './OesolLogo.module.css';

export default function OesolLogo() {
  return (
    <Image
      /* 1. public/images/logo-oesol.svg 경로를 가리킵니다 */
      /* (만약 png 파일이면 logo-oesol.png 로 수정) */
      src="/images/logo-oesol.svg" 
      alt="외솔한국 로고"
      width={200}  /* 2. 위 CSS의 max-width와 동일하게 (또는 원본 SVG 가로 크기) */
      height={50} /* 3. (SVG 원본 세로 크기로 수정하세요) */
      className={styles.logo}
      priority /* 페이지의 중요 로고이므로 빨리 로드 */
    />
  );
}