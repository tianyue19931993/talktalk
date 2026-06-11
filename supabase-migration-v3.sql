-- ============================================================
-- V3 迁移：套餐增加有效期天数
-- ============================================================

-- 1. 添加有效期天数字段（默认 30 天）
ALTER TABLE plans ADD COLUMN IF NOT EXISTS duration_days INT NOT NULL DEFAULT 30;

-- 2. 更新已有套餐数据
UPDATE plans SET duration_days = 30 WHERE code = 'basic' AND duration_days = 30;
UPDATE plans SET duration_days = 365 WHERE code = 'ai' AND duration_days = 30;
