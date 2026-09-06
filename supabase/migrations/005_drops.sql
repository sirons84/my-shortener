-- 외솔 드롭(베타)
--
-- 교사가 올린 HTML 한 장을 외솔.한국/<code> 주소로 보여주는 기능.
--
-- 주소 공간은 urls 테이블과 공유한다. 같은 이름이 단축 주소와 드롭 주소에
-- 동시에 존재할 수 없으므로, 생성 API 양쪽에서 서로를 확인한다.
-- (DB 차원의 교차 유니크 제약은 불가하므로 각 테이블의 unique 가 최종 방어선)
--
-- 실제 HTML 은 세션 탈취를 막기 위해 본 사이트와 다른 오리진에서 서빙되고,
-- 외솔.한국/<code> 는 그 페이지를 전체화면 iframe 으로 감싼 껍데기를 응답한다.

create table if not exists drops (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  user_id        uuid not null references auth.users(id) on delete cascade,
  html           text not null,
  title          text,
  size_bytes     integer not null default 0,
  expires_at     timestamptz,
  view_count     integer not null default 0,
  is_blocked     boolean not null default false,
  blocked_reason text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 베타 정책: 한 사람당 하나만 (DB 가 강제)
create unique index if not exists drops_user_id_key on drops (user_id);

-- 조회수를 원자적으로 증가 (읽기-수정-쓰기 경쟁 조건 제거)
create or replace function increment_drop_view(p_code text)
returns void
language sql
as $$
  update drops set view_count = coalesce(view_count, 0) + 1 where code = p_code;
$$;

-- 앱은 모든 DB 작업을 서비스 롤 키로 수행하므로, RLS 를 켜고 정책을 만들지
-- 않으면 공개 anon 키를 통한 외부 직접 접근만 차단된다. (003 과 동일한 방침)
alter table drops enable row level security;
