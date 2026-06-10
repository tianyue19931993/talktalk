-- ============================================================
-- talks-lab 数据库迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中运行
-- ============================================================

-- 1. 题型表
CREATE TABLE IF NOT EXISTS question_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📝',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 标签表
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 题目表
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '',
  subject TEXT DEFAULT '数学',
  grade TEXT DEFAULT '',
  type_id TEXT REFERENCES question_types(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  question_text TEXT DEFAULT '',
  markdown TEXT DEFAULT '',
  images JSONB DEFAULT '[]'::jsonb,
  html_demos JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_questions_type_id ON questions(type_id);
CREATE INDEX IF NOT EXISTS idx_questions_grade ON questions(grade);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);

-- 5. 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_question_types_updated_at
  BEFORE UPDATE ON question_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS 策略（开放读写，适合单用户/测试阶段）
ALTER TABLE question_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有操作" ON question_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许所有操作" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许所有操作" ON questions FOR ALL USING (true) WITH CHECK (true);
