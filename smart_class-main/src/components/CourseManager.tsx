import { useState, useEffect } from 'react';
import { supabase, Course, COURSE_COLORS, getErrorMessage, isNetworkError } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Plus, Edit2, Trash2, X, BookOpen, User, MapPin, Palette, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

export function CourseManager() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    teacher: '',
    location: '',
    color: '#3B82F6',
  });

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  async function fetchCourses() {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching courses:', fetchError);
      setError(getErrorMessage(fetchError));
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  }

  function openModal(course?: Course) {
    if (course) {
      setEditingCourse(course);
      setFormData({
        name: course.name,
        teacher: course.teacher,
        location: course.location,
        color: course.color,
      });
    } else {
      setEditingCourse(null);
      setFormData({
        name: '',
        teacher: '',
        location: '',
        color: '#3B82F6',
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCourse) {
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          name: formData.name.trim(),
          teacher: formData.teacher.trim(),
          location: formData.location.trim(),
          color: formData.color,
        })
        .eq('id', editingCourse.id);

      if (updateError) {
        console.error('Error updating course:', updateError);
        alert(getErrorMessage(updateError));
      } else {
        fetchCourses();
        setShowModal(false);
      }
    } else {
      const { error: insertError } = await supabase.from('courses').insert({
        user_id: user!.id,
        name: formData.name.trim(),
        teacher: formData.teacher.trim(),
        location: formData.location.trim(),
        color: formData.color,
      });

      if (insertError) {
        console.error('Error creating course:', insertError);
        alert(getErrorMessage(insertError));
      } else {
        fetchCourses();
        setShowModal(false);
      }
    }
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`确定删除课程"${course.name}"吗？相关的课表条目也会被删除。`)) {
      return;
    }

    const { error: deleteError } = await supabase.from('courses').delete().eq('id', course.id);

    if (deleteError) {
      console.error('Error deleting course:', deleteError);
      alert(getErrorMessage(deleteError));
    } else {
      fetchCourses();
    }
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
            <WifiOff className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-500 mb-4 whitespace-pre-line text-sm">{error}</p>
          <button
            onClick={fetchCourses}
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
    <div className="max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">课程管理</h1>
          <p className="text-gray-600 mt-1">添加和管理你的所有课程</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加课程
        </button>
      </div>

      {/* 课程列表 */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有添加课程</h3>
          <p className="text-gray-500 mb-4">点击上方按钮添加你的第一门课程</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            添加课程
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div
                className="h-2"
                style={{ backgroundColor: course.color }}
              />
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-3">
                  {course.name}
                </h3>
                <div className="space-y-2 text-sm">
                  {course.teacher && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{course.teacher}</span>
                    </div>
                  )}
                  {course.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{course.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => openModal(course)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => deleteCourse(course)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加/编辑课程弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCourse ? '编辑课程' : '添加课程'}
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
                  课程名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例如：高等数学"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  授课教师
                </label>
                <input
                  type="text"
                  value={formData.teacher}
                  onChange={(e) =>
                    setFormData({ ...formData, teacher: e.target.value })
                  }
                  placeholder="选填"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  上课地点
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="选填"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    课程颜色
                  </div>
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {COURSE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, color: color.value })
                      }
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color.value
                          ? 'ring-2 ring-offset-2 ring-gray-900'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
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
                  {editingCourse ? '更新' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
