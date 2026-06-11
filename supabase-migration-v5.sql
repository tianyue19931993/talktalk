-- ============================================================
-- V5 迁移：user_questions 增加 html_demos 字段
-- 支持多个 HTML 演示链接（与 questions 表结构一致）
-- ============================================================

-- 增加 html_demos JSONB 字段（替换原有的 html_url）
ALTER TABLE user_questions ADD COLUMN IF NOT EXISTS html_demos JSONB DEFAULT '[]'::jsonb;

-- 将已有 html_url 数据迁移到 html_demos（如果有的话）
UPDATE user_questions
SET html_demos = jsonb_build_array(jsonb_build_object('title', '演示动画', 'url', html_url))
WHERE html_url IS NOT NULL AND html_url != '' AND (html_demos IS NULL OR html_demos = '[]'::jsonb);

-- html_url 字段保留但不使用，后续可删除
