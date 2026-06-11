-- ============================================================
-- V6 迁移：html_url → html_prompt
-- 用于存储 AI 生成时预处理的 prompt 文本
-- ============================================================

-- 重命名字段
ALTER TABLE user_questions RENAME COLUMN html_url TO html_prompt;
ALTER TABLE user_questions ALTER COLUMN html_prompt SET DEFAULT '';
