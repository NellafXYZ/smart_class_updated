import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '缺少 Supabase 环境变量配置。\n\n' +
    '请按以下步骤配置：\n' +
    '1. 复制 .env.example 为 .env\n' +
    '2. 从 Supabase Dashboard (Settings → API) 获取 Project URL 和 anon key\n' +
    '3. 填入 .env 文件中\n' +
    '4. 重启开发服务器'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 将 Supabase 错误转换为用户友好的中文消息。
 * "Failed to fetch" 通常意味着：
 * - Supabase 项目被暂停（免费项目1周不活跃会自动暂停）
 * - 网络连接问题（防火墙/VPN/代理拦截）
 * - Supabase URL 配置错误
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message || '';

    if (message === 'Failed to fetch' || message.includes('Failed to fetch')) {
      return (
        '无法连接到服务器，可能的原因：\n' +
        '1. Supabase 项目被暂停（请登录 supabase.com/dashboard 恢复）\n' +
        '2. 网络连接异常，请检查网络或关闭 VPN/代理\n' +
        '3. 防火墙拦截了对 Supabase 的请求'
      );
    }

    if (message.includes('JWT') || message.includes('token') || message.includes('expired')) {
      return '登录已过期，请重新登录。';
    }

    if (message.includes('row-level security') || message.includes('policy')) {
      return '权限不足，无法执行此操作。';
    }

    return message;
  }
  return '发生未知错误，请稍后重试。';
}

/**
 * 检查是否为网络连接错误（Failed to fetch）
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message === 'Failed to fetch' || error.message.includes('Failed to fetch');
  }
  return false;
}

// 数据库类型定义
export interface Profile {
  id: string;
  reminder_minutes: number;
  notification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  teacher: string;
  location: string;
  color: string;
  created_at: string;
}

export interface ScheduleEntry {
  id: string;
  user_id: string;
  course_id: string;
  day_of_week: number; // 1-7 代表周一到周日
  start_time: string;
  end_time: string;
  week_type: 'odd' | 'even' | 'all'; // 单周、双周、全周
  created_at: string;
  course?: Course;
}

export interface SemesterWeek {
  id: string;
  user_id: string;
  week_number: number;
  start_date: string;
  is_current: boolean;
  created_at: string;
}

// 星期映射
export const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
export const DAY_MAP: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
};

// 预设颜色
export const COURSE_COLORS = [
  { name: '海洋蓝', value: '#3B82F6' },
  { name: '翠绿', value: '#10B981' },
  { name: '暖橙', value: '#F59E0B' },
  { name: '玫红', value: '#EC4899' },
  { name: '深青', value: '#14B8A6' },
  { name: '靛蓝', value: '#6366F1' },
  { name: '珊瑚红', value: '#EF4444' },
  { name: '石板灰', value: '#64748B' },
];
