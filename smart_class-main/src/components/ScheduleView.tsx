import { useState, useEffect } from 'react';
import { supabase, Course, ScheduleEntry, SemesterWeek, DAY_MAP, getErrorMessage, isNetworkError } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  Bell,
  AlertCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
const DAYS = [1, 2, 3, 4, 5, 6, 7]; // 周一到周日

export function ScheduleView() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [semesterWeeks, setSemesterWeeks] = useState<SemesterWeek[]>([]);
  const [currentWeek, setCurrentWeek] = useState<SemesterWeek | null>(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    setError(null);
    // 并行获取数据
    const [entriesRes, weeksRes] = await Promise.all([
      supabase
        .from('schedule_entries')
        .select('*, course:courses(*)')
        .order('day_of_week')
        .order('start_time'),
      supabase
        .from('semester_weeks')
        .select('*')
        .order('week_number'),
    ]);

    if (entriesRes.error) {
      console.error('Error fetching entries:', entriesRes.error);
      if (isNetworkError(entriesRes.error)) {
        setError(getErrorMessage(entriesRes.error));
        setLoading(false);
        return;
      }
    } else {
      setEntries(entriesRes.data || []);
    }

    if (weeksRes.error) {
      console.error('Error fetching weeks:', weeksRes.error);
      if (isNetworkError(weeksRes.error)) {
        setError(getErrorMessage(weeksRes.error));
        setLoading(false);
        return;
      }
    } else {
      const weeks = weeksRes.data || [];
      setSemesterWeeks(weeks);

      // 找到当前周或最近的周
      const todayStr = today.toISOString().split('T')[0];
      const current = weeks.find((w) => w.start_date <= todayStr && !w.is_current);
      const markedCurrent = weeks.find((w) => w.is_current);

      if (markedCurrent) {
        setCurrentWeek(markedCurrent);
        setCurrentWeekNumber(markedCurrent.week_number);
      } else if (current) {
        setCurrentWeek(current);
        setCurrentWeekNumber(current.week_number);
      } else if (weeks.length > 0) {
        setCurrentWeek(weeks[0]);
        setCurrentWeekNumber(weeks[0].week_number);
      }
    }
    setLoading(false);
  }

  function navigateWeek(direction: number) {
    const newWeekNum = currentWeekNumber + direction;
    if (newWeekNum >= 1 && newWeekNum <= semesterWeeks.length) {
      const week = semesterWeeks.find((w) => w.week_number === newWeekNum);
      if (week) {
        setCurrentWeek(week);
        setCurrentWeekNumber(newWeekNum);
      }
    }
  }

  function getWeekTypeDisplay(): 'odd' | 'even' | 'all' {
    if (!currentWeek) return 'all';
    return currentWeekNumber % 2 === 1 ? 'odd' : 'even';
  }

  function getFilteredEntries(): ScheduleEntry[] {
    const weekType = getWeekTypeDisplay();
    return entries.filter((entry) => {
      if (entry.week_type === 'all') return true;
      return entry.week_type === weekType;
    });
  }

  function getEntryForSlot(day: number, hour: number): ScheduleEntry | undefined {
    const filtered = getFilteredEntries();
    return filtered.find((entry) => {
      const startHour = parseInt(entry.start_time.split(':')[0]);
      const endHour = parseInt(entry.end_time.split(':')[0]);
      return entry.day_of_week === day && hour >= startHour && hour < endHour;
    });
  }

  function getEntrySpan(entry: ScheduleEntry): number {
    const startHour = parseInt(entry.start_time.split(':')[0]);
    const endHour = parseInt(entry.end_time.split(':')[0]);
    return Math.ceil(endHour - startHour);
  }

  function getWeekDates(): { date: Date; dayStr: string; isToday: boolean }[] {
    if (!currentWeek) {
      return DAYS.map((day) => ({
        date: new Date(),
        dayStr: `${day}日`,
        isToday: false,
      }));
    }

    const weekStart = new Date(currentWeek.start_date);

    return DAYS.map((_day, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const todayStr = today.toISOString().split('T')[0];
      const dateStr = date.toISOString().split('T')[0];

      return {
        date,
        dayStr: `${date.getMonth() + 1}/${date.getDate()}`,
        isToday: dateStr === todayStr,
      };
    });
  }

  function getTodayCourses(): ScheduleEntry[] {
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const currentHour = today.getHours();
    const weekType = getWeekTypeDisplay();
    const todayStr = today.toISOString().split('T')[0];
    const isCurrentWeek = currentWeek?.start_date === todayStr ||
      (currentWeek && new Date(currentWeek.start_date) <= today &&
       new Date(currentWeek.start_date).getTime() + 7 * 24 * 60 * 60 * 1000 > today.getTime());

    if (!isCurrentWeek) return [];

    return entries.filter((entry) => {
      const startHour = parseInt(entry.start_time.split(':')[0]);
      return entry.day_of_week === dayOfWeek &&
        entry.start_time.slice(0, 5) !== '' &&
        (entry.week_type === 'all' || entry.week_type === weekType) &&
        startHour >= currentHour;
    }).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的课表</h1>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
            <WifiOff className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-500 mb-4 whitespace-pre-line text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        </div>
      </div>
    );
  }

  const weekDates = getWeekDates();
  const todayCourses = getTodayCourses();

  return (
    <div className="space-y-6">
      {/* 页面标题和周选择 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的课表</h1>
          <p className="text-gray-600 mt-1">
            {currentWeek ? `第 ${currentWeekNumber} 周` : '暂无学期设置'}
          </p>
        </div>

        {/* 周切换 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            disabled={currentWeekNumber <= 1}
            className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 bg-blue-50 rounded-lg text-blue-700 font-medium min-w-[120px] text-center">
            第 {currentWeekNumber} 周
          </div>
          <button
            onClick={() => navigateWeek(1)}
            disabled={currentWeekNumber >= semesterWeeks.length}
            className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 今日课程提醒 */}
      {todayCourses.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-4 sm:p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5" />
            <span className="font-medium">今日还有 {todayCourses.length} 节课</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {todayCourses.slice(0, 3).map((entry) => {
              const course = entry.course as Course;
              return (
                <div
                  key={entry.id}
                  className="bg-white/20 backdrop-blur rounded-lg p-3"
                >
                  <div className="font-medium">{course?.name}</div>
                  <div className="text-sm text-white/80 mt-1">
                    {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                    {course?.location && ` | ${course.location}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 无学期提示 */}
      {semesterWeeks.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            还没有设置学期周次
          </h3>
          <p className="text-gray-500">
            请在"设置"页面添加学期周次信息
          </p>
        </div>
      )}

      {/* 时间表视图 */}
      {semesterWeeks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* 表头 */}
              <div className="grid grid-cols-8 border-b bg-gray-50">
                <div className="p-3 text-center text-sm font-medium text-gray-500 border-r">
                  时间
                </div>
                {DAYS.map((day, index) => (
                  <div
                    key={day}
                    className={`p-3 text-center border-r last:border-r-0 ${
                      weekDates[index].isToday
                        ? 'bg-blue-50 text-blue-600'
                        : ''
                    }`}
                  >
                    <div className="text-sm font-medium">{DAY_MAP[day]}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {weekDates[index].dayStr}
                    </div>
                  </div>
                ))}
              </div>

              {/* 时间格子 */}
              <div className="relative">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="grid grid-cols-8 border-b last:border-b-0"
                  >
                    {/* 时间列 */}
                    <div className="p-2 text-center text-xs text-gray-500 border-r bg-gray-50">
                      {String(hour).padStart(2, '0')}:00
                    </div>

                    {/* 每天的格子 */}
                    {DAYS.map((day, dayIndex) => {
                      const entry = getEntryForSlot(day, hour);
                      const isFirstSlot =
                        entry?.start_time.split(':')[0] ===
                        String(hour).padStart(2, '0');

                      if (entry && !isFirstSlot) {
                        return (
                          <div
                            key={day}
                            className={`min-h-[48px] border-r last:border-r-0 ${
                              weekDates[dayIndex].isToday ? 'bg-blue-50/30' : ''
                            }`}
                          />
                        );
                      }

                      if (entry && isFirstSlot) {
                        const span = getEntrySpan(entry);
                        const course = entry.course as Course;
                        return (
                          <div
                            key={day}
                            className={`min-h-[48px] border-r last:border-r-0 p-1 ${
                              weekDates[dayIndex].isToday ? 'bg-blue-50/30' : ''
                            }`}
                            style={{ height: `${span * 48}px` }}
                          >
                            <div
                              className="h-full rounded-lg p-2 overflow-hidden"
                              style={{
                                backgroundColor: `${course?.color}15`,
                                borderLeft: `3px solid ${course?.color}`,
                              }}
                            >
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {course?.name}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {entry.start_time.slice(0, 5)} -{' '}
                                {entry.end_time.slice(0, 5)}
                              </div>
                              {course?.location && (
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {course.location}
                                </div>
                              )}
                              {course?.teacher && (
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {course.teacher}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={day}
                          className={`min-h-[48px] border-r last:border-r-0 ${
                            weekDates[dayIndex].isToday ? 'bg-blue-50/30' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 无课程提示 */}
      {semesterWeeks.length > 0 && getFilteredEntries().length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            本周没有课程安排
          </h3>
          <p className="text-gray-500">
            请在"课表管理"页面添加课程安排
          </p>
        </div>
      )}
    </div>
  );
}
