import { useEffect, useRef } from 'react';
import { supabase, ScheduleEntry, SemesterWeek, Course } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export function useClassReminder() {
  const { user, profile } = useAuth();
  const checkIntervalRef = useRef<number | null>(null);
  const lastNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !profile?.notification_enabled) {
      return;
    }

    // 检查通知权限
    if ('Notification' in window && Notification.permission === 'granted') {
      startChecking();
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, profile?.notification_enabled]);

  function startChecking() {
    // 每分钟检查一次
    checkIntervalRef.current = window.setInterval(checkUpcomingClasses, 60000);
    // 启动时立即检查一次
    checkUpcomingClasses();
  }

  async function checkUpcomingClasses() {
    if (!user || !profile) return;

    try {
      const now = new Date();
      const today = now.getDay() === 0 ? 7 : now.getDay();

      // 获取当前学期周
      const todayStr = now.toISOString().split('T')[0];
      const { data: weeks } = await supabase
        .from('semester_weeks')
        .select('*')
        .eq('user_id', user.id)
        .order('week_number');

      if (!weeks || weeks.length === 0) return;

      // 找当前周
      const currentWeek = weeks.find(
        (w: SemesterWeek) =>
          w.is_current ||
          (w.start_date <= todayStr &&
            new Date(w.start_date).getTime() + 7 * 24 * 60 * 60 * 1000 > now.getTime())
      );

      if (!currentWeek) return;

      const weekNumber = currentWeek.week_number;
      const weekType = weekNumber % 2 === 1 ? 'odd' : 'even';

      // 获取今天的课程
      const { data: entries } = await supabase
        .from('schedule_entries')
        .select('*, course:courses(*)')
        .eq('user_id', user.id)
        .eq('day_of_week', today);

      if (!entries) return;

      // 过滤当前周的课程
      const relevantEntries = entries.filter(
        (entry: ScheduleEntry) =>
          entry.week_type === 'all' || entry.week_type === weekType
      );

      // 检查即将开始的课程
      for (const entry of relevantEntries) {
        const course = entry.course as Course;
        const startTime = entry.start_time;
        const [hours, minutes] = startTime.split(':').map(Number);
        const classTime = new Date(now);
        classTime.setHours(hours, minutes, 0, 0);

        const timeDiff = classTime.getTime() - now.getTime();
        const minutesBeforeClass = timeDiff / (1000 * 60);

        // 在设定的提醒时间范围内
        const reminderKey = `${today}-${entry.id}-${startTime}`;
        if (
          minutesBeforeClass > 0 &&
          minutesBeforeClass <= profile.reminder_minutes &&
          minutesBeforeClass > minutesBeforeClass - 1 &&
          !lastNotifiedRef.current.has(reminderKey)
        ) {
          // 发送通知
          sendNotification(course, entry, Math.round(minutesBeforeClass));
          lastNotifiedRef.current.add(reminderKey);

          // 清理旧的已通知记录（保留最近1小时的）
          for (const key of lastNotifiedRef.current) {
            if (!key.startsWith(String(today))) {
              lastNotifiedRef.current.delete(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking upcoming classes:', error);
    }
  }

  function sendNotification(
    course: Course,
    entry: ScheduleEntry,
    minutesBefore: number
  ) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('即将上课', {
        body: `${course.name} 将在 ${minutesBefore} 分钟后开始\n${
          course.location ? `地点: ${course.location}` : ''
        }\n时间: ${entry.start_time.slice(0, 5)} - ${entry.end_time.slice(0, 5)}`,
        icon: '/vite.svg',
        tag: `class-${entry.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 5秒后自动关闭
      setTimeout(() => notification.close(), 10000);
    }
  }

  return null;
}
