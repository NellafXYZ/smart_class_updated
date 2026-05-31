/*
  # 修复函数搜索路径安全问题

  1. 安全改进
    - 为 `update_updated_at_column` 函数设置固定的 `search_path`
    - 防止搜索路径被恶意修改导致的安全风险
    - 先删除依赖的触发器，再重建函数和触发器
*/

-- 删除触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- 使用 CREATE OR REPLACE 更新函数，保留其属性
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 重新创建触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();