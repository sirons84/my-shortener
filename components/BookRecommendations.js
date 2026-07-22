'use client';

import { useEffect, useState } from 'react';
import { FiBookOpen, FiBook, FiClock } from 'react-icons/fi';
import Image from 'next/image';
import styles from './BookRecommendations.module.css';

// 기본 추천 도서 — DB(recommended_books)를 읽지 못할 때의 폴백
// (null = 준비 중 자리, cover = public/books/ 안의 표지 이미지)
const DEFAULT_BOOKS = [
  {
    title: '나도 어린이는 처음이니까!',
    author: '김종원',
    url: 'https://product.kyobobook.co.kr/detail/S000218906837',
    cover: '/books/9791193379813.jpg',
  },
  {
    title: '질문 수업 어떻게 시작할까',
    author: '양경윤',
    url: 'https://product.kyobobook.co.kr/detail/S000213661269',
    cover: '/books/9791163461913.jpg',
  },
  {
    title: '아울렛',
    author: '송광용',
    url: 'https://product.kyobobook.co.kr/detail/S000215792705',
    cover: '/books/9791161572123.jpg',
  },
];

export default function BookRecommendations() {
  const [books, setBooks] = useState(DEFAULT_BOOKS);

  useEffect(() => {
    fetch('/api/books')
      .then((res) => (res.ok ? res.json() : null))
      .then((rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        // 제목이 비어 있는 슬롯은 "준비 중" 자리로 표시
        setBooks(rows.map((r) => (r.title ? r : null)));
      })
      .catch(() => {}); // 실패 시 기본 도서 유지
  }, []);

  return (
    <section className={styles.wrap} aria-label="금주의 추천도서">
      <h2 className={styles.heading}>
        <FiBookOpen className={styles.headingIcon} size={20} />
        금주의 추천도서
      </h2>
      <div className={styles.grid}>
        {books.map((book, i) =>
          book ? (
            <a
              key={i}
              href={book.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              {book.cover ? (
                book.cover.startsWith('/') ? (
                  <Image
                    src={book.cover}
                    alt={`${book.title} 표지`}
                    width={56}
                    height={70}
                    className={styles.coverImage}
                  />
                ) : (
                  // 외부 이미지(서점 표지 주소 등)는 next/image 도메인 제한 없이 표시
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover}
                    alt={`${book.title} 표지`}
                    width={56}
                    height={70}
                    className={styles.coverImage}
                  />
                )
              ) : (
                <div className={styles.cover} aria-hidden="true">
                  <FiBook size={24} />
                </div>
              )}
              <div className={styles.info}>
                <div className={styles.title}>{book.title}</div>
                <div className={styles.author}>{book.author}</div>
                <span className={styles.link}>책 보러 가기 ↗</span>
              </div>
            </a>
          ) : (
            <div key={i} className={`${styles.card} ${styles.placeholder}`}>
              <div className={styles.cover} aria-hidden="true">
                <FiClock size={24} />
              </div>
              <div className={styles.info}>
                <div className={styles.title}>추천 도서 준비 중</div>
                <div className={styles.author}>곧 공개됩니다</div>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
