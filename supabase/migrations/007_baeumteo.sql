-- 외솔 배움터 — 순위판과 반 코드 (개발기획서 §9, 데이터설계 §5·§6)
--
-- 서버가 학생에게서 받는 것은 이 두 가지가 전부다. 진행도는 브라우저에만 있고
-- 저장 코드로 기기를 옮긴다. 로그인은 없다.
--
-- 실명을 받지 않는다. 별명은 4자, 학교는 학생이 적은 약칭, 학년·반은 숫자뿐이다.
-- 한 아이를 가리킬 수 있는 값을 더 늘리지 않는다.

-- ── 순위판 기록 ────────────────────────────────────────────────
create table if not exists baeumteo_scores (
  id          uuid primary key default gen_random_uuid(),
  game        text not null,
  score       integer not null check (score >= 0),
  -- 판에 걸린 시간. 시간을 재는 게임(사전 편찬소)에서만 채운다.
  -- 점수가 같으면 빨리 채운 쪽이 앞이다.
  ms          integer not null default 0 check (ms >= 0),
  nick        text not null,
  school      text not null default '',
  grade       smallint not null default 0,
  class       smallint not null default 0,
  class_code  text not null default '',
  -- 이 기록을 남긴 브라우저만 아는 열쇠. 지울 때 본인 확인에 쓴다.
  -- 서버는 이 값으로 사람을 찾지 않는다 (해시만 두고 원본은 브라우저에 있다).
  erase_key   text not null,
  at          timestamptz not null default now()
);

create index if not exists baeumteo_scores_rank_idx
  on baeumteo_scores (game, score desc, ms asc, at asc);

create index if not exists baeumteo_scores_class_idx
  on baeumteo_scores (class_code, game, score desc)
  where class_code <> '';

-- ── 반 코드 ────────────────────────────────────────────────────
-- 교사가 만든다. 형식 `약칭-학년-반-4자` (예: 화진-5-1-K2P7).
-- 반 공동 사전은 낱말 id 집합만 둔다. 누가 실었는지는 두지 않는다.
create table if not exists baeumteo_classes (
  code        text primary key,
  school      text not null,
  grade       smallint not null,
  class       smallint not null,
  -- 반을 만든 교사 브라우저만 아는 열쇠. 기록 삭제 권한이 여기에 있다.
  owner_key   text not null,
  entries     text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 반 공동 사전에 낱말을 얹는다. 이미 있는 id 는 늘어나지 않는다.
create or replace function baeumteo_add_entries(p_code text, p_ids text[])
returns void
language sql
as $$
  update baeumteo_classes
     set entries = array(select distinct unnest(entries || p_ids)),
         updated_at = now()
   where code = p_code;
$$;

-- 앱은 모든 DB 작업을 서비스 롤 키로 한다. RLS 를 켜고 정책을 두지 않으면
-- 공개 anon 키를 통한 바깥 직접 접근만 막힌다 (003·005 와 같은 방침).
alter table baeumteo_scores enable row level security;
alter table baeumteo_classes enable row level security;
