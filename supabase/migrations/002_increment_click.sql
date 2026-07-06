-- urls 테이블에 클릭 카운트 컬럼이 없으면 추가 (기존 행은 0으로 초기화)
alter table urls add column if not exists count integer not null default 0;

-- 클릭 카운트를 원자적으로 증가시키는 함수 (읽기-수정-쓰기 경쟁 조건 제거)
create or replace function increment_click(p_code text)
returns void
language sql
as $$
  update urls set count = coalesce(count, 0) + 1 where code = p_code;
$$;
