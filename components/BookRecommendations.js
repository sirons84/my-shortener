import { FiBookOpen, FiBook, FiClock } from 'react-icons/fi';
import Image from 'next/image';
import styles from './BookRecommendations.module.css';

// 추천 도서 (null = 준비 중 자리, cover = public/books/ 안의 표지 이미지)
const BOOKS = [
  {
    title: '나도 어린이는 처음이니까!',
    author: '김종원',
    url: 'https://product.kyobobook.co.kr/detail/S000218906837',
    cover: '/books/9791193379813.jpg',
  },
  {
    title: '한글이 목숨',
    author: '최현배',
    url: 'https://product.kyobobook.co.kr/detail/S000001946563',
    cover: '/books/9791190965309.jpg',
  },
  {
    title: '아울렛',
    author: '송광용',
    url: 'https://product.kyobobook.co.kr/detail/S000215792705',
    cover: '/books/9791161572123.jpg',
  },
];

export default function BookRecommendations() {
  return (
    <section className={styles.wrap} aria-label="금주의 추천도서">
      <h2 className={styles.heading}>
        <FiBookOpen className={styles.headingIcon} size={20} />
        금주의 추천도서
      </h2>
      <div className={styles.grid}>
        {BOOKS.map((book, i) =>
          book ? (
            <a
              key={i}
              href={book.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              {book.cover ? (
                <Image
                  src={book.cover}
                  alt={`${book.title} 표지`}
                  width={56}
                  height={70}
                  className={styles.coverImage}
                />
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
