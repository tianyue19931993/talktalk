-- ============================================================
-- V4 迁移：用户个人题目录入表
-- 用户手动录入题目文字，未来 AI 生成 HTML 演示
-- ============================================================

CREATE TABLE user_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  html_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'uploaded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_questions_user_id ON user_questions(user_id);
CREATE INDEX idx_user_questions_status ON user_questions(status);

CREATE TRIGGER trg_user_questions_updated_at
  BEFORE UPDATE ON user_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE user_questions ENABLE ROW LEVEL SECURITY;

-- 用户只能读取和创建自己的题目
CREATE POLICY "用户可读取自己的题目"
  ON user_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可创建自己的题目"
  ON user_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可更新自己的题目"
  ON user_questions FOR UPDATE
  USING (auth.uid() = user_id);

-- admin 可读写所有题目
CREATE POLICY "admin 管理 user_questions"
  ON user_questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
