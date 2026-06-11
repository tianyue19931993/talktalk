-- ============================================================
-- V7 迁移：重构 user_questions → 分离 demos + 新增 generation 统计
-- ============================================================

-- ============================================================
-- 1. user_questions：删除无用字段，新增 question_type
-- ============================================================
ALTER TABLE user_questions DROP COLUMN IF EXISTS html_prompt;
ALTER TABLE user_questions DROP COLUMN IF EXISTS html_demos;
ALTER TABLE user_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT '';

-- ============================================================
-- 2. question_types：新增 type_prompt，删除 icon
-- ============================================================
ALTER TABLE question_types ADD COLUMN IF NOT EXISTS type_prompt TEXT DEFAULT '';
ALTER TABLE question_types DROP COLUMN IF EXISTS icon;

-- ============================================================
-- 3. question_demos：用户题目生成的 HTML 演示
-- ============================================================
CREATE TABLE IF NOT EXISTS question_demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES user_questions(id) ON DELETE CASCADE,
  html_url TEXT NOT NULL DEFAULT '',
  title TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_demos_question_id ON question_demos(question_id);

ALTER TABLE question_demos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可读取自己的 demo"
  ON question_demos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_questions WHERE id = question_id AND user_id = auth.uid())
  );

CREATE POLICY "用户可创建自己的 demo"
  ON question_demos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_questions WHERE id = question_id AND user_id = auth.uid())
  );

CREATE POLICY "admin 管理 question_demos"
  ON question_demos FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. user_generations：AI 生成次数统计
-- ============================================================
CREATE TABLE IF NOT EXISTS user_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_count INT NOT NULL DEFAULT 0,
  used_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_generations_user_id ON user_generations(user_id);

ALTER TABLE user_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可读取自己的 generation"
  ON user_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admin 管理 user_generations"
  ON user_generations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
