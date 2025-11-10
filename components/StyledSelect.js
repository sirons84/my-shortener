/* 파일 경로: components/StyledSelect.js (이 코드로 덮어쓰세요) */
import styles from './StyledSelect.module.css';
// import Image from 'next/image'; // 1. (!! 삭제 !!) Image 임포트 제거

export default function StyledSelect({
  label,
  value,
  onChange,
  children,
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.selectWrapper}>
        <label className={styles.label}>{label}</label>
        
        <select
          value={value}
          onChange={onChange}
          className={styles.select}
        >
          {children}
        </select>
        
        {/* 2. (!! 삭제 !!) <Image> 태그로 만들었던 커스텀 화살표 제거 */}
        
      </div>
    </div>
  );
}