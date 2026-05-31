import { useState, useEffect } from 'react';
import { supabase, Course, ScheduleEntry, DAY_MAP, getErrorMessage } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
  AlertCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
const DAYS = [1, 2, 3, 4, 5, 6, 7]; // 周一到周日

export function ScheduleManager() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [formData, setFormData] = useState({
    course_id: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '09:40',
    week_type: 'all' as 'odd' | 'even' | 'all',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    setError(null);
    const [coursesRes, entriesRes] = await Promise.all([
      supabase.from('courses').select('*').order('name'),
      supabase
        .from('schedule_entries')
        .select('*, course:courses(*)')
        .order('day_of_week')
        .order('start_time'),
    ]);

    if (coursesRes.error) {
      console.error('Error fetching courses:', coursesRes.error);
      setError(getErrorMessage(coursesRes.error));
      setLoading(false);
      return;
    } else {
      setCourses(coursesRes.data || []);
    }

    if (entriesRes.error) {
      console.error('Error fetching entries:', entriesRes.error);
      setError(getErrorMessage(entriesRes.error));
      setLoading(false);
      return;
    } else {
      setEntries(entriesRes.data || []);
    }
    setLoading(false);
  }

  function openModal(entry?: ScheduleEntry, day?: number, hour?: number) {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        course_id: entry.course_id,
        day_of_week: entry.day_of_week,
        start_time: entry.start_time,
        end_time: entry.end_time,
        week_type: entry.week_type,
      });
    } else {
      setEditingEntry(null);
      setFormData({
        course_id: courses[0]?.id || '',
        day_of_week: day || 1,
        start_time: hour ? `${String(hour).padStart(2, '0')}:00` : '08:00',
        end_time: hour ? `${String(hour + 2).padStart(2, '0')}:00` : '09:40',
        week_type: 'all',
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.course_id) {
      alert('请选择课程');
      return;
    }

    if (editingEntry) {
      const { error } = await supabase
        .from('schedule_entries')
        .update({
          course_id: formData.course_id,
          day_of_week: formData.day_of_week,
          start_time: formData.start_time,
          end_time: formData.end_time,
          week_type: formData.week_type,
        })
        .eq('id', editingEntry.id);

      if (error) {
        console.error('Error updating entry:', error);
        alert(getErrorMessage(error));
      } else {
        fetchData();
        setShowModal(false);
      }
    } else {
      const { error } = await supabase.from('schedule_entries').insert({
        user_id: user!.id,
        course_id: formData.course_id,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        week_type: formData.week_type,
      });

      if (error) {
        console.error('Error creating entry:', error);
        alert(getErrorMessage(error));
      } else {
        fetchData();
        setShowModal(false);
      }
    }
  }

  async function deleteEntry(entry: ScheduleEntry) {
    if (!confirm(`确定删除这门课的安排吗？`)) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', entry.id);

    if (deleteError) {
      console.error('Error deleting entry:', deleteError);
      alert(getErrorMessage(deleteError));
    } else {
      fetchData();
    }
  }

  function getEntryForSlot(day: number, hour: number): ScheduleEntry | undefined {
    return entries.find((entry) => {
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


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">课表管理</h1>
            <p className="text-gray-600 mt-1">安排你的每周课程时间表</p>
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

  if (courses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有添加课程</h3>
          <p className="text-gray-500">请先在"课程管理"中添加课程</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">课表管理</h1>
          <p className="text-gray-600 mt-1">安排你的每周课程时间表</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加课表
        </button>
      </div>

      {/* 时间表视图 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* 表头 */}
            <div className="grid grid-cols-8 border-b bg-gray-50">
              <div className="p-3 text-center text-sm font-medium text-gray-500 border-r">
                时间
              </div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-sm font-medium text-gray-700 border-r last:border-r-0"
                >
                  {DAY_MAP[day]}
                </div>
              ))}
            </div>

            {/* 时间格子 */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                  {/* 时间列 */}
                  <div className="p-2 text-center text-xs text-gray-500 border-r bg-gray-50">
                    {String(hour).padStart(2, '0')}:00
                  </div>

                  {/* 每天的格子 */}
                  {DAYS.map((day) => {
                    const entry = getEntryForSlot(day, hour);
                    const isFirstSlot = entry?.start_time.split(':')[0] === String(hour).padStart(2, '0');

                    if (entry && !isFirstSlot) {
                      return <div key={day} className="min-h-[48px] border-r last:border-r-0" />;
                    }

                    if (entry && isFirstSlot) {
                      const span = getEntrySpan(entry);
                      const course = entry.course as Course;
                      return (
                        <div
                          key={day}
                          className="min-h-[48px] border-r last:border-r-0 p-1"
                          style={{ height: `${span * 48}px` }}
                        >
                          <div
                            className="h-full rounded-lg p-2 cursor-pointer hover:opacity-90 transition-opacity relative group"
                            style={{
                              backgroundColor: `${course?.color}20`,
                              borderLeft: `4px solid ${course?.color}`,
                            }}
                          >
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {course?.name}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                            </div>
                            {entry.week_type !== 'all' && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {entry.week_type === 'odd' ? '单周' : '双周'}
                              </div>
                            )}

                            {/* 操作按钮 */}
                            <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal(entry);
                                }}
                                className="p-1 bg-white rounded shadow hover:bg-gray-100"
                              >
                                <Edit2 className="w-3 h-3 text-gray-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEntry(entry);
                                }}
                                className="p-1 bg-white rounded shadow hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={day}
                        className="min-h-[48px] border-r last:border-r-0 p-1 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => openModal(undefined, day, hour)}
                      >
                        <div className="h-full rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-blue-400 hover:text-blue-400 transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 添加/编辑课表弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingEntry ? '编辑课表' : '添加课表'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  选择课程 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.course_id}
                  onChange={(e) =>
                    setFormData({ ...formData, course_id: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">请选择课程</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  星期
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      day_of_week: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {DAY_MAP[day]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    开始时间
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    结束时间
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  周次类型
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: '每周' },
                    { value: 'odd', label: '单周' },
                    { value: 'even', label: '双周' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          week_type: option.value as typeof formData.week_type,
                        })
                      }
                      className={`px-3 py-2 rounded-lg font-medium transition-all ${
                        formData.week_type === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  {editingEntry ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
