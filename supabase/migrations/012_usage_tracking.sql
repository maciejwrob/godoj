-- Add monthly usage tracking view for quick queries
CREATE OR REPLACE VIEW user_monthly_usage AS
SELECT
  user_id,
  DATE_TRUNC('month', started_at) AS month,
  SUM(COALESCE(duration_seconds, 0)) AS total_seconds,
  COUNT(*) AS lesson_count
FROM lessons
GROUP BY user_id, DATE_TRUNC('month', started_at);

-- Add daily usage tracking view
CREATE OR REPLACE VIEW user_daily_usage AS
SELECT
  user_id,
  DATE_TRUNC('day', started_at) AS day,
  SUM(COALESCE(duration_seconds, 0)) AS total_seconds,
  COUNT(*) AS lesson_count
FROM lessons
GROUP BY user_id, DATE_TRUNC('day', started_at);
