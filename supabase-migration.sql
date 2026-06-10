-- ============================================================
-- 重建表：id 改为 SERIAL 自增
-- 先清除所有数据（测试阶段，直接重来）
-- ============================================================

DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS question_types;
DROP TABLE IF EXISTS tags;

-- 1. 题型表（id 自增）
CREATE TABLE question_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📝',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 标签表（id 自增）
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 题目表（type_id 改为 INT，关联题型）
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '',
  subject TEXT DEFAULT '数学',
  grade TEXT DEFAULT '',
  type_id INT REFERENCES question_types(id) ON DELETE SET NULL,
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
CREATE INDEX idx_questions_type_id ON questions(type_id);
CREATE INDEX idx_questions_grade ON questions(grade);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);

-- 5. 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_question_types_updated_at
  BEFORE UPDATE ON question_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS
ALTER TABLE question_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有操作" ON question_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许所有操作" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许所有操作" ON questions FOR ALL USING (true) WITH CHECK (true);
