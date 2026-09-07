-- 외솔 배움터 — 순위판 동점 가르기를 '남은 낱말 카드'로
--
-- 사전 편찬소의 점수는 실은 낱말 수다. 같은 개수라면 다음 낱말에 얼마나
-- 가까웠는지로 가른다. 판이 5분 고정이라 걸린 시간(ms)은 거의 모두 300초로
-- 같아 변별력이 없었다.
--
-- ms 칸은 지우지 않고 둔다. 이미 남은 기록이 있고, 사전을 다 채워 일찍 끝낸
-- 판에서는 여전히 뜻이 있는 값이다.

alter table baeumteo_scores
  add column if not exists spare integer not null default 0 check (spare >= 0);

drop index if exists baeumteo_scores_rank_idx;

create index if not exists baeumteo_scores_rank_idx
  on baeumteo_scores (game, score desc, spare desc, at asc);
