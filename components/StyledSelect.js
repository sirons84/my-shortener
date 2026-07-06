/* 파일 경로: components/StyledSelect.js */
"use client";
import { useState, useRef, useEffect } from 'react';
import styles from './StyledSelect.module.css';

export default function StyledSelect({ label, value, onChange, options = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1); // 키보드 탐색 중 강조된 항목
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const selectedIndex = options.findIndex(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const open = () => {
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // 키보드 지원: Enter/Space 열기·선택, 방향키 이동, Esc 닫기
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlight >= 0) handleSelect(options[highlight].value);
        else open();
        break;
      case 'Escape':
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) open();
        else setHighlight(h => Math.min(options.length - 1, h + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) open();
        else setHighlight(h => Math.max(0, h - 1));
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <div
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
      >
        <span className={styles.label}>{label}</span>

        <span className={styles.currentValue}>
          {selectedOption ? selectedOption.label : '선택'}
        </span>
        <div className={styles.arrowIcon} />
      </div>

      {isOpen && (
        <ul className={styles.dropdownMenu} role="listbox" aria-label={label}>
          {options.map((option, i) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`${styles.optionItem} ${option.value === value ? styles.selected : ''} ${i === highlight ? styles.highlighted : ''}`}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setHighlight(i)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
