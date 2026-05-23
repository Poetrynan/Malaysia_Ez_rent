-- 005_feedback.sql
-- 学生意见箱：feedback 表 + RLS 策略

-- 1. 建表
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

-- 3. RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 学生可以插入自己的意见
DROP POLICY IF EXISTS "Students can insert feedback" ON feedback;
CREATE POLICY "Students can insert feedback" ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 学生可以查看自己的意见
DROP POLICY IF EXISTS "Students can read own feedback" ON feedback;
CREATE POLICY "Students can read own feedback" ON feedback FOR SELECT
  USING (auth.uid() = user_id);

-- 管理员可以查看所有意见
DROP POLICY IF EXISTS "Admins can read all feedback" ON feedback;
CREATE POLICY "Admins can read all feedback" ON feedback FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- 管理员可以更新意见（标记已处理、填写回复）
DROP POLICY IF EXISTS "Admins can update feedback" ON feedback;
CREATE POLICY "Admins can update feedback" ON feedback FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- 管理员可以删除意见
DROP POLICY IF EXISTS "Admins can delete feedback" ON feedback;
CREATE POLICY "Admins can delete feedback" ON feedback FOR DELETE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
