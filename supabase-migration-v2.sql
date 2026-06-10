-- ============================================================
-- V2 迁移：用户体系 + 会员订阅体系
-- ============================================================
-- 注意：V1 已存在的表（questions / question_types / tags）不在此脚本中
-- auth.users 由 Supabase Auth 自动管理，不需要手动创建
-- ============================================================

-- ============================================================
-- 1. 业务用户信息表（profile），与 auth.users 一对一关联
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入新用户时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果已有此触发器则跳过（幂等）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. 套餐表
-- ============================================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  permissions JSONB DEFAULT '[]'::jsonb,   -- 权限列表，如 ["view_demo"]
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  sort INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 初始套餐数据
INSERT INTO plans (code, name, price, description, permissions, sort) VALUES
  ('basic', '基础会员', 1, '每月1元，解锁全部互动演示', '["view_demo"]', 1),
  ('ai', 'AI会员', 0, 'AI功能即将开放（价格待定）', '["view_demo", "create_demo"]', 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. 订阅表
-- ============================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_at TIMESTAMPTZ DEFAULT NOW(),
  expire_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expire_at ON subscriptions(expire_at);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. 订单表
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_no ON orders(order_no);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. 方便查询的视图
-- ============================================================

-- 当前有效订阅视图（过滤已过期/已取消的）
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT
  s.*,
  p.code AS plan_code,
  p.name AS plan_name,
  p.permissions
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
WHERE s.status = 'active'
  AND (s.expire_at IS NULL OR s.expire_at > NOW());

-- ============================================================
-- 6. RLS 策略（行级安全）
-- ============================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 用户可以读取自己的 profile
CREATE POLICY "用户可读取自己的 profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- admin 可读取所有 profile
CREATE POLICY "admin 可读取所有 profile"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 用户可以更新自己的 profile（除 role/status 外）
CREATE POLICY "用户可更新自己的 profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- plans — 所有人可读
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有人可读取套餐"
  ON plans FOR SELECT
  USING (true);

-- subscriptions — 用户只能看自己的
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可读取自己的订阅"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可创建自己的订阅"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- orders — 用户只能看自己的
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可读取自己的订单"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可创建自己的订单"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- admin 可读写所有表（通过 auth.users 的 role 判断）
CREATE POLICY "admin 管理 profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin 管理 plans"
  ON plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin 管理 subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin 管理 orders"
  ON orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 7. 清理：如果 V1 表没有 updated_at 触发器，补上
-- ============================================================
-- questions / question_types 已在 V1 中有触发器，无需重复
