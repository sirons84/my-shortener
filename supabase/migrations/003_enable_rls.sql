-- RLS(행 수준 보안) 활성화
--
-- 앱은 모든 DB 작업을 서비스 롤 키(서버 전용, RLS 우회)로 수행하므로,
-- RLS를 켜고 정책을 만들지 않으면 앱은 정상 동작하고
-- 공개 anon 키를 통한 외부 직접 접근만 차단된다.
alter table urls       enable row level security;
alter table url_clicks enable row level security;
