/* 파일 경로: components/PrefixedInput.js (이 코드로 덮어쓰세요) */

import styles from './PrefixedInput.module.css';

export default function PrefixedInput({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className={styles.container}>
      {/* 1. (!! 수정 !!) 
        회색 박스(.inputWrapper)가 라벨과 (prefix + input)을 모두 감쌉니다.
      */}
      <div className={styles.inputWrapper}>
        <label className={styles.label}>{label}</label>
        
        {/* 2. (!! 신규 !!) 
           접두사와 인풋을 별도 div로 묶어 가로 정렬
        */}
        <div className={styles.fieldWrapper}>
          <span className={styles.prefix}>외솔.한국/</span>
          <input
            type="text"
            className={styles.input}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
          />
        </div>
      </div>
    </div>
  );
}