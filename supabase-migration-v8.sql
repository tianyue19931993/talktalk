-- ============================================================
-- V8 迁移：AI 流程准备 — question_types + user_questions
-- ============================================================

-- 1. question_types：新增 AI prompt 字段
ALTER TABLE question_types ADD COLUMN IF NOT EXISTS analysis_prompt TEXT DEFAULT '';
ALTER TABLE question_types ADD COLUMN IF NOT EXISTS html_prompt TEXT DEFAULT '';

-- 2. user_questions：question_type → question_type_id + analysis_json
ALTER TABLE user_questions ADD COLUMN IF NOT EXISTS question_type_id INT REFERENCES question_types(id);
ALTER TABLE user_questions ADD COLUMN IF NOT EXISTS analysis_json JSONB DEFAULT '{}'::jsonb;

-- 将已有的 question_type（TEXT）数据迁移到 question_type_id
-- 先保留 question_type 字段，后续确认无误后手动删除
