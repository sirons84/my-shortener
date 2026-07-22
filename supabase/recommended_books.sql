-- 금주의 추천도서 테이블
-- Supabase 대시보드 > SQL Editor에서 1회 실행
create table if not exists public.recommended_books (
  position   int primary key check (position between 1 and 3),
  title      text not null default '',
  author     text not null default '',
  url        text not null default '',
  cover      text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.recommended_books enable row level security;

-- 누구나 읽기 가능 (쓰기는 서버의 Service Role Key로만 수행)
create policy "recommended_books_public_read"
  on public.recommended_books for select
  using (true);

-- 현재 하드코딩된 도서로 초기값 세팅
insert into public.recommended_books (position, title, author, url, cover) values
  (1, '나도 어린이는 처음이니까!', '김종원', 'https://product.kyobobook.co.kr/detail/S000218906837', '/books/9791193379813.jpg'),
  (2, '질문 수업 어떻게 시작할까', '양경윤', 'https://product.kyobobook.co.kr/detail/S000213661269', '/books/9791163461913.jpg'),
  (3, '아울렛', '송광용', 'https://product.kyobobook.co.kr/detail/S000215792705', '/books/9791161572123.jpg')
on conflict (position) do nothing;
