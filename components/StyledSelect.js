/* 파일 경로: components/StyledSelect.js */
"use client";
import { useState, useRef, useEffect } from 'react';
import styles from './StyledSelect.module.css';

export default function StyledSelect({ label, value, onChange, options = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

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
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      {/* (수정됨) 라벨을 여기(바깥)에서... */}
      
      <div 
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* ...여기(박스 안)으로 옮겼습니다! */}
        <span className={styles.label}>{label}</span>
        
        <span className={styles.currentValue}>
          {selectedOption ? selectedOption.label : '선택'}
        </span>
        <div className={styles.arrowIcon} />
      </div>

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