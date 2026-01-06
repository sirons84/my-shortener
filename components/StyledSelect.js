/* 파일 경로: components/StyledSelect.js */
"use client";
import { useState, useRef, useEffect } from 'react';
import styles from './StyledSelect.module.css';

export default function StyledSelect({ label, value, onChange, options = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // 현재 선택된 옵션의 라벨 찾기
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  // 바깥 클릭 시 닫기 기능
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue); // 부모에게 선택된 값 전달
    setIsOpen(false);      // 메뉴 닫기
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <span className={styles.label}>{label}</span>
      
      {/* 클릭하는 버튼 부분 */}
      <div 
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.currentValue}>
          {selectedOption ? selectedOption.label : '선택'}
        </span>
        <div className={styles.arrowIcon} />
      </div>

      {/* 펼쳐지는 목록 메뉴 */}
      {isOpen && (
        <ul className={styles.dropdownMenu}>
          {options.map((option) => (
            <li
              key={option.value}
              className={`${styles.optionItem} ${option.value === value ? styles.selected : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}