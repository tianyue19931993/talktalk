-- ============================================================
-- V12 迁移：user_questions 增加 component_analysis_json 字段
-- ============================================================

ALTER TABLE user_questions
ADD COLUMN IF NOT EXISTS component_analysis_json JSONB DEFAULT '{}'::jsonb;
