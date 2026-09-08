-- 외솔 배움터 — 잃어버린 원고 (5단계)
--
-- 상자 수가 같으면 빨리 나온 쪽이 앞이다. 시간으로 줄 세우는 인덱스를 하나 더 둔다.
-- (사전 편찬소·우리말 지키기는 008 의 spare 인덱스를 그대로 쓴다)

create index if not exists baeumteo_scores_time_idx
  on baeumteo_scores (game, score desc, ms asc, at asc);
