/* 파일 경로: components/SubmitButton.js */
import Image from 'next/image';
import styles from './SubmitButton.module.css';

export default function SubmitButton() {
  return (
    <button type="submit" className={styles.button}>
      {/* 1. 텍스트 */}
      <span className={styles.text}>URL 줄이기</span>
      
      {/* 2. 울리 캐릭터 이미지 */}
      <Image
        src="/images/character-wooli.png" // (public/images/에 저장했다고 가정)
        alt="울리 캐릭터"
        width={300} // (CSS에서 제어하므로 원본 비율)
        height={300} // (CSS에서 제어하므로 원본 비율)
        className={styles.character}
        priority
      />
    </button>
  );
}