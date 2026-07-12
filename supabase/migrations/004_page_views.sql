-- 자체 방문 통계(웹 애널리틱스) 수집 테이블
-- 교육청 보고용 지표 산출에 필요: 페이지뷰·순페이지뷰·방문수·방문자수·체류시간·바운스율·기기별 현황
CREATE TABLE IF NOT EXISTS page_views (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id      text        NOT NULL,  -- 익명 방문자 ID (쿠키, 1년 유지)
  session_id      text        NOT NULL,  -- 방문(세션) ID (쿠키, 마지막 활동 후 30분 유지)
  path            text        NOT NULL,  -- 조회한 페이지 경로
  device          text        NOT NULL DEFAULT '기타',  -- PC | 스마트폰 | 태블릿 | 기타
  is_new_visitor  boolean     NOT NULL DEFAULT false,   -- 방문자 쿠키가 이번에 처음 발급됐는지
  duration_sec    numeric,                              -- 페이지 체류시간(초), 이탈 beacon으로 갱신
  viewed_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_date    ON page_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);

-- 서버(service_role) 전용 테이블: RLS 활성화 + 공개 정책 없음
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
