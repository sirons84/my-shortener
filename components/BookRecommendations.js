import styles from './BookRecommendations.module.css';

// 추천 도서 (null = 준비 중 자리)
const BOOKS = [
  {
    title: '한글이 목숨',
    author: '최현배',
    url: 'https://product.kyobobook.co.kr/detail/S000001946563',
  },
  {
    title: '아울렛',
    author: '송광용',
    url: 'https://product.kyobobook.co.kr/detail/S000215792705',
  },
  null,
];

export default function BookRecommendations() {
  return (
    <section className={styles.wrap} aria-label="추천 도서">
      <h2 className={styles.heading}>📚 외솔이 추천하는 책</h2>
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
              <div className={styles.cover} aria-hidden="true">📖</div>
              <div className={styles.info}>
                <div className={styles.title}>{book.title}</div>
                <div className={styles.author}>{book.author}</div>
                <span className={styles.link}>교보문고에서 보기 ↗</span>
              </div>
            </a>
          ) : (
            <div key={i} className={`${styles.card} ${styles.placeholder}`}>
              <div className={styles.cover} aria-hidden="true">✨</div>
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
