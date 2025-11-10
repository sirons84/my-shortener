/* 파일 경로: components/StyledInput.js (수정 필요 없음) */

import styles from './StyledInput.module.css';

export default function StyledInput({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder,
  required = false 
}) {
  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <label className={styles.label}>
          {label}
        </label>
        <input
          type={type}
          className={styles.input}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
      </div>
    </div>
  );
}