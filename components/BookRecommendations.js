import { FiBookOpen, FiBook, FiClock } from 'react-icons/fi';
import Image from 'next/image';
import BookAwardBadge from './BookAwardBadge';
import styles from './BookRecommendations.module.css';

// 금주의 추천도서 — 데이터는 서버(app/page.js)에서 조회해 props로 받는다.
// (예전에는 이 컴포넌트가 직접 fetch해서 폴백 도서가 먼저 보이는 깜빡임이 있었음)
// books: (book | null)[] — null은 "준비 중" 자리
export default function BookRecommendations({ books = [] }) {
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
              {book.award && (
                <div className={styles.awardCol}>
                  <BookAwardBadge
                    rank={book.award.rank}
                    ribbon={book.award.ribbon}
                    captions={book.award.captions}
                    tone={book.award.tone}
                    className={styles.awardSvg}
                  />
                </div>
              )}
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
