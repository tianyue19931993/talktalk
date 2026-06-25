-- ============================================================
-- V11 迁移：user_questions 增加三段 AI 分析结果字段
-- ============================================================

ALTER TABLE user_questions ADD COLUMN IF NOT EXISTS math_analysis_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_questions ADD COLUMN IF NOT EXISTS logic_analysis_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE user_questions ADD COLUMN IF NOT EXISTS tutor_analysis_json JSONB DEFAULT '{}'::jsonb;
