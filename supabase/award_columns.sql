-- 금주의 추천도서 — 수상 월계관 마크 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 1회 실행
-- 모두 nullable이므로 기존 데이터에 영향 없음
alter table public.recommended_books
  add column if not exists award_rank     smallint    check (award_rank between 1 and 99),
  add column if not exists award_ribbon   varchar(20),
  add column if not exists award_caption1 varchar(30),
  add column if not exists award_caption2 varchar(30),
  add column if not exists award_tone     varchar(10) default 'gold'
    check (award_tone in ('gold', 'silver', 'bronze'));
