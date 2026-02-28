-- URL 클릭 이벤트 테이블 (통계 차트용)
CREATE TABLE IF NOT EXISTS url_clicks (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code        text        NOT NULL,
  clicked_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_url_clicks_code ON url_clicks(code);
CREATE INDEX IF NOT EXISTS idx_url_clicks_date ON url_clicks(clicked_at);
