/*
  # 创建课表管理系统数据库

  1. 新建表
    - `profiles` - 用户配置表
      - `id` (uuid, 主键, 关联 auth.users)
      - `reminder_minutes` (integer, 提前多少分钟提醒，默认15)
      - `notification_enabled` (boolean, 是否启用通知，默认true)
      - `created_at`, `updated_at` (时间戳)
    
    - `courses` - 课程表
      - `id` (uuid, 主键)
      - `user_id` (uuid, 外键关联 profiles)
      - `name` (text, 课程名称)
      - `teacher` (text, 教师名称，可选)
      - `location` (text, 上课地点，可选)
      - `color` (text, 颜色标识，默认蓝色)
      - `created_at` (时间戳)
    
    - `schedule_entries` - 课表条目
      - `id` (uuid, 主键)
      - `user_id` (uuid, 外键关联 profiles)
      - `course_id` (uuid, 外键关联 courses)
      - `day_of_week` (integer, 1-7代表周一到周日)
      - `start_time` (time, 开始时间)
      - `end_time` (time, 结束时间)
      - `week_type` (text, 周类型: odd/even/all，默认all)
      - `created_at` (时间戳)
    
    - `semester_weeks` - 学期周次追踪
      - `id` (uuid, 主键)
      - `user_id` (uuid, 外键关联 profiles)
      - `week_number` (integer, 第几周)
      - `start_date` (date, 这周的开始日期)
      - `is_current` (boolean, 是否是当前周)
      - `created_at` (时间戳)

  2. 安全
    - 对所有表启用 RLS
    - 用户只能访问自己的数据
*/

-- 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_minutes integer DEFAULT 15 NOT NULL,
  notification_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建 courses 表
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  teacher text DEFAULT '',
  location text DEFAULT '',
  color text DEFAULT '#3B82F6' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 创建 schedule_entries 表
CREATE TABLE IF NOT EXISTS schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  week_type text DEFAULT 'all' NOT NULL CHECK (week_type IN ('odd', 'even', 'all')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 创建 semester_weeks 表
CREATE TABLE IF NOT EXISTS semester_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  start_date date NOT NULL,
  is_current boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, week_number)
);

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_weeks ENABLE ROW LEVEL SECURITY;

-- profiles 表策略
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- courses 表策略
CREATE POLICY "Users can read own courses"
  ON courses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- schedule_entries 表策略
CREATE POLICY "Users can read own schedule entries"
  ON schedule_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule entries"
  ON schedule_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule entries"
  ON schedule_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule entries"
  ON schedule_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- semester_weeks 表策略
CREATE POLICY "Users can read own semester weeks"
  ON semester_weeks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own semester weeks"
  ON semester_weeks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own semester weeks"
  ON semester_weeks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own semester weeks"
  ON semester_weeks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_user_id ON schedule_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_course_id ON schedule_entries(course_id);
CREATE INDEX IF NOT EXISTS idx_semester_weeks_user_id ON semester_weeks(user_id);
CREATE INDEX IF NOT EXISTS idx_semester_weeks_current ON semester_weeks(user_id, is_current);

-- 创建更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 profiles 表添加更新时间触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();