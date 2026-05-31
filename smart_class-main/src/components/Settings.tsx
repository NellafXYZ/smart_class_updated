import { useState, useEffect } from 'react';
import { supabase, SemesterWeek, getErrorMessage, isNetworkError } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  Bell,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

export function Settings() {
  const { user, profile } = useAuth();
  const [semesterWeeks, setSemesterWeeks] = useState<SemesterWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [editingWeek, setEditingWeek] = useState<SemesterWeek | null>(null);
  const [weekFormData, setWeekFormData] = useState({
    week_number: 1,
    start_date: '',
    is_current: false,
  });
  const [notificationPermission, setNotificationPermission] = useState<
    'granted' | 'denied' | 'default'
  >('default');

  useEffect(() => {
    if (user && profile) {
      setReminderMinutes(profile.reminder_minutes);
      setNotificationEnabled(profile.notification_enabled);
      fetchSemesterWeeks();
      checkNotificationPermission();
    }
  }, [user, profile]);

  async function fetchSemesterWeeks() {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('semester_weeks')
      .select('*')
      .order('week_number');

    if (fetchError) {
      console.error('Error fetching semester weeks:', fetchError);
      setError(getErrorMessage(fetchError));
    } else {
      setSemesterWeeks(data || []);
    }
    setLoading(false);
  }

  function checkNotificationPermission() {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission as typeof notificationPermission);
    }
  }

  async function requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission as typeof notificationPermission);
      if (permission === 'granted') {
        await updateProfileSettings(reminderMinutes, true);
        setNotificationEnabled(true);
      }
    }
  }

  async function updateProfileSettings(minutes: number, enabled: boolean) {
    setSaving(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        reminder_minutes: minutes,
        notification_enabled: enabled,
      })
      .eq('id', user!.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      alert(getErrorMessage(updateError));
    } else {
      setReminderMinutes(minutes);
      setNotificationEnabled(enabled);
    }
    setSaving(false);
  }

  function openWeekModal(week?: SemesterWeek) {
    if (week) {
      setEditingWeek(week);
      setWeekFormData({
        week_number: week.week_number,
        start_date: week.start_date,
        is_current: week.is_current,
      });
    } else {
      setEditingWeek(null);
      const nextWeek = semesterWeeks.length + 1;
      const lastWeek = semesterWeeks[semesterWeeks.length - 1];
      const defaultDate = lastWeek
        ? new Date(new Date(lastWeek.start_date).getTime() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        : '';

      setWeekFormData({
        week_number: nextWeek,
        start_date: defaultDate,
        is_current: nextWeek === 1,
      });
    }
    setShowWeekModal(true);
  }

  async function handleSubmitWeek(e: React.FormEvent) {
    e.preventDefault();

    if (editingWeek) {
      // 如果设置为当前周，先取消其他周
      if (weekFormData.is_current) {
        await supabase
          .from('semester_weeks')
          .update({ is_current: false })
          .eq('user_id', user!.id);
      }

      const { error } = await supabase
        .from('semester_weeks')
        .update({
          week_number: weekFormData.week_number,
          start_date: weekFormData.start_date,
          is_current: weekFormData.is_current,
        })
        .eq('id', editingWeek.id);

      if (error) {
        console.error('Error updating week:', error);
        alert(getErrorMessage(error));
      } else {
        fetchSemesterWeeks();
        setShowWeekModal(false);
      }
    } else {
      // 如果设置为当前周，先取消其他周
      if (weekFormData.is_current) {
        await supabase
          .from('semester_weeks')
          .update({ is_current: false })
          .eq('user_id', user!.id);
      }

      const { error } = await supabase.from('semester_weeks').insert({
        user_id: user!.id,
        week_number: weekFormData.week_number,
        start_date: weekFormData.start_date,
        is_current: weekFormData.is_current,
      });

      if (error) {
        console.error('Error creating week:', error);
        alert(getErrorMessage(error));
      } else {
        fetchSemesterWeeks();
        setShowWeekModal(false);
      }
    }
  }

  async function deleteWeek(week: SemesterWeek) {
    if (!confirm(`确定删除第 ${week.week_number} 周吗？`)) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('semester_weeks')
      .delete()
      .eq('id', week.id);

    if (deleteError) {
      console.error('Error deleting week:', deleteError);
      alert(getErrorMessage(deleteError));
    } else {
      fetchSemesterWeeks();
    }
  }

  async function setCurrentWeek(week: SemesterWeek) {
    // 取消其他周的当前状态
    await supabase
      .from('semester_weeks')
      .update({ is_current: false })
      .eq('user_id', user!.id);

    // 设置当前周
    await supabase
      .from('semester_weeks')
      .update({ is_current: true })
      .eq('id', week.id);

    fetchSemesterWeeks();
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设置</h1>
          <p className="text-gray-600 mt-1">管理通知提醒和学期设置</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
            <WifiOff className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-500 mb-4 whitespace-pre-line text-sm">{error}</p>
          <button
            onClick={fetchSemesterWeeks}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="text-gray-600 mt-1">管理通知提醒和学期设置</p>
      </div>

      {/* 通知设置 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">通知提醒</h2>
            <p className="text-sm text-gray-500">上课前自动提醒即将开始的课程</p>
          </div>
        </div>

        {/* 浏览器通知权限 */}
        {notificationPermission !== 'granted' && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-800 text-sm font-medium">
                  需要开启浏览器通知权限
                </p>
                <p className="text-amber-700 text-sm mt-1">
                  点击下方按钮允许发送通知，以便在课程开始前收到提醒
                </p>
              </div>
            </div>
            <button
              onClick={requestNotificationPermission}
              className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              开启通知
            </button>
          </div>
        )}

        {/* 提醒时间设置 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                启用上课提醒
              </label>
              <p className="text-sm text-gray-500">在课程开始前收到通知</p>
            </div>
            <button
              onClick={() => updateProfileSettings(reminderMinutes, !notificationEnabled)}
              disabled={saving || notificationPermission !== 'granted'}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationEnabled && notificationPermission === 'granted'
                  ? 'bg-blue-600'
                  : 'bg-gray-300'
              } ${notificationPermission !== 'granted' ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  notificationEnabled && notificationPermission === 'granted'
                    ? 'left-7'
                    : 'left-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              提前提醒时间
            </label>
            <div className="flex items-center gap-2">
              <select
                value={reminderMinutes}
                onChange={(e) =>
                  updateProfileSettings(parseInt(e.target.value), notificationEnabled)
                }
                disabled={saving}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value={5}>5 分钟</option>
                <option value={10}>10 分钟</option>
                <option value={15}>15 分钟</option>
                <option value={20}>20 分钟</option>
                <option value={30}>30 分钟</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 学期管理 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">学期周次</h2>
              <p className="text-sm text-gray-500">设置学期的周次和对应的日期</p>
            </div>
          </div>
          <button
            onClick={() => openWeekModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加周次
          </button>
        </div>

        {semesterWeeks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>还没有添加学期周次</p>
            <p className="text-sm mt-1">请点击上方按钮添加</p>
          </div>
        ) : (
          <div className="space-y-2">
            {semesterWeeks.map((week) => (
              <div
                key={week.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  week.is_current
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold ${
                      week.is_current
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border text-gray-600'
                    }`}
                  >
                    {week.week_number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        第 {week.week_number} 周
                      </span>
                      {week.is_current && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          当前周
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(week.start_date).toLocaleDateString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                      })}
                      {' - '}
                      {new Date(
                        new Date(week.start_date).getTime() + 6 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!week.is_current && (
                    <button
                      onClick={() => setCurrentWeek(week)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      设为当前
                    </button>
                  )}
                  <button
                    onClick={() => openWeekModal(week)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteWeek(week)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加/编辑周次弹窗 */}
      {showWeekModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingWeek ? '编辑周次' : '添加周次'}
              </h2>
              <button
                onClick={() => setShowWeekModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitWeek} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  周次编号
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={weekFormData.week_number}
                  onChange={(e) =>
                    setWeekFormData({
                      ...weekFormData,
                      week_number: parseInt(e.target.value),
                    })
                  }
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  开始日期（周一）
                </label>
                <input
                  type="date"
                  value={weekFormData.start_date}
                  onChange={(e) =>
                    setWeekFormData({
                      ...weekFormData,
                      start_date: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    设为当前周
                  </div>
                  <div className="text-xs text-gray-500">
                    课表会根据当前周显示对应的课程
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setWeekFormData({
                      ...weekFormData,
                      is_current: !weekFormData.is_current,
                    })
                  }
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    weekFormData.is_current ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      weekFormData.is_current ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWeekModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  {editingWeek ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
