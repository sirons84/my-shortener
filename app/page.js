/* 파일 경로: app/page.js — 서버 컴포넌트. 추천도서를 서버에서 미리 조회해
   첫 화면부터 최신 데이터가 보이도록 한다 (예전 폴백 도서 깜빡임 방지) */
import HomeMain from './HomeMain';
import HomeStats from '../components/HomeStats';
import BookRecommendations from '../components/BookRecommendations';
import { getRecommendedBooks } from '../lib/books';

// 5분 캐시 (관리자 저장 시에는 revalidatePath로 즉시 갱신)
export const revalidate = 300;

export default async function Home() {
  const books = await getRecommendedBooks();

  return (
    <>
      <HomeMain />
      <HomeStats />
      <BookRecommendations books={books} />
    </>
  );
}
