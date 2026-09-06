-- 외솔 드롭: 계정당 배포 가능 개수를 이메일에 따라 다르게 두기 위해
-- 1인 1개를 강제하던 유니크 인덱스를 제거한다.
-- (개수 제한은 lib/constants.js 의 getDropLimit 로 API 에서 확인한다.
--  code 의 전역 유니크 제약은 그대로 유지된다.)

drop index if exists drops_user_id_key;

create index if not exists drops_user_id_idx on drops (user_id);
