-- 클릭 카운트를 원자적으로 증가시키는 함수 (읽기-수정-쓰기 경쟁 조건 제거)
create or replace function increment_click(p_code text)
returns void
language sql
as $$
  update urls set count = coalesce(count, 0) + 1 where code = p_code;
$$;
