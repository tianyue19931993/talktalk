-- ============================================================
-- V9 迁移：configs 配置表 + user_questions 权限字段
-- ============================================================

-- 1. configs 配置表（管理员在 PC 端配置）
CREATE TABLE IF NOT EXISTS configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configs ENABLE ROW LEVEL SECURITY;

-- 所有人可读（前端需要读取 key='temp' 配置）
CREATE POLICY "所有人可读 configs"
  ON configs FOR SELECT
  USING (true);

-- 仅 admin 可管理
CREATE POLICY "admin 管理 configs"
  ON configs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 自动更新 updated_at
CREATE TRIGGER trg_configs_updated_at
  BEFORE UPDATE ON configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. 插入默认的 temp 配置（管理员可在 PC 端修改）
INSERT INTO configs (key, value, description)
VALUES ('temp', '', '题型匹配失败时的兜底助手，管理员在PC端管理后台配置')
ON CONFLICT (key) DO NOTHING;
