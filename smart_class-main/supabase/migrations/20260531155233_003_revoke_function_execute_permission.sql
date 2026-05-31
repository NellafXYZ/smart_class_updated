/*
  # 修复 SECURITY DEFINER 函数权限问题

  1. 安全改进
    - 撤销 public 角色（包括 anon 和 authenticated）对 `update_updated_at_column` 函数的执行权限
    - 该函数仅被触发器内部使用，不应通过 REST API 直接调用
    - 防止用户滥用 SECURITY DEFINER 权限
*/

-- 撤销所有角色对函数的执行权限
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated;

-- 仅允许触发器内部调用
-- 触发器会以表所有者的权限执行，不受此限制影响