import { supabaseAdmin } from './supabaseAdmin';
import { mapBookAward } from './mappers/book';

// DB(recommended_books)를 읽지 못할 때의 비상 폴백
const FALLBACK_BOOKS = [
  {
    title: '나도 어린이는 처음이니까!',
    author: '김종원',
    url: 'https://product.kyobobook.co.kr/detail/S000218906837',
    cover: '/books/9791193379813.jpg',
    award: null,
  },
  {
    title: '질문 수업 어떻게 시작할까',
    author: '양경윤',
    url: 'https://product.kyobobook.co.kr/detail/S000213661269',
    cover: '/books/9791163461913.jpg',
    award: null,
  },
  {
    title: '아울렛',
    author: '송광용',
    url: 'https://product.kyobobook.co.kr/detail/S000215792705',
    cover: '/books/9791161572123.jpg',
    award: null,
  },
];

// 금주의 추천도서 3권 (서버 전용) — 제목이 빈 슬롯은 null(준비 중)
export async function getRecommendedBooks() {
  try {
    const { data, error } = await supabaseAdmin
      .from('recommended_books')
      .select('position, title, author, url, cover, award_rank, award_ribbon, award_caption1, award_caption2, award_tone')
      .order('position');

    if (error || !Array.isArray(data) || data.length === 0) return FALLBACK_BOOKS;

    return data.map((r) =>
      r.title
        ? { title: r.title, author: r.author, url: r.url, cover: r.cover, award: mapBookAward(r) }
        : null
    );
  } catch {
    return FALLBACK_BOOKS;
  }
}
