-- 외솔 배움터 — 울산 말모이 원정대 (8단계)
--
-- 학생이 우리 동네 말을 올리고, 교사가 확인한 뒤에야 반 지도에 핀이 꽂힌다.
-- 서버에 쓰기가 있는 유일한 게임이다. 이름은 받지 않는다. 들려준 사람은 관계만 둔다.

create table if not exists baeumteo_malmoi (
  id          uuid primary key default gen_random_uuid(),
  class_code  text not null references baeumteo_classes(code) on delete cascade,
  word        text not null,
  meaning     text not null,
  district    text not null,               -- 울산 구·군 id (중구·남구·동구·북구·울주군)
  place       text not null default '',    -- 들은 곳 (집·시장·학교 …)
  heard_from  text not null default '',    -- 들려준 사람 (관계만)
  nick        text not null default '',    -- 별명 4자. 비워도 된다
  -- pending: 확인 기다리는 중 / approved: 확인됨(지도에 핀) / returned: 돌려보냄
  status      text not null default 'pending' check (status in ('pending', 'approved', 'returned')),
  note        text not null default '',    -- 교사가 돌려보낼 때 한 줄
  -- 올린 브라우저만 아는 열쇠의 해시. 내 낱말의 상태를 보고 지울 때 쓴다
  submit_key  text not null,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists baeumteo_malmoi_class_idx
  on baeumteo_malmoi (class_code, status, created_at desc);

-- 앱은 모든 DB 작업을 서비스 롤 키로 한다. RLS 를 켜고 정책을 두지 않으면
-- 공개 anon 키를 통한 바깥 직접 접근만 막힌다 (007 과 같은 방침).
alter table baeumteo_malmoi enable row level security;
