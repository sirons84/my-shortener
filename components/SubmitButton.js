/* 파일 경로: components/SubmitButton.js (이 코드로 덮어쓰세요) */
import Image from 'next/image';
import styles from './SubmitButton.module.css';

// (!! 수정 !!) disabled prop을 받도록 수정
export default function SubmitButton({ disabled }) {
  return (
    <button 
      type="submit" 
      className={styles.button}
      // (!! 수정 !!) disabled 상태를 버튼에 적용
      disabled={disabled}
      // (!! 수정 !!) 비활성화 시 스타일 변경
      style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'wait' : 'pointer' }}
    >
      {/* (!! 수정 !!) 로딩 상태에 따라 텍스트 변경 */}
      <span className={styles.text}>
        {disabled ? '생성 중...' : 'URL 줄이기'}
      </span>
      
      <Image
        src="/images/character-wooli.svg"
        alt="울리 캐릭터"
        width={240}  
        height={240} 
        className={styles.character}
        priority
      />
    </button>
  );
}