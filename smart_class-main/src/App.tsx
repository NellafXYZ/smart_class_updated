import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthForm } from './components/Auth';
import { Layout } from './components/Layout';
import { CourseManager } from './components/CourseManager';
import { ScheduleView } from './components/ScheduleView';
import { Settings } from './components/Settings';
import { useClassReminder } from './hooks/useClassReminder';
import { AlertCircle, RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, loading, connectionError } = useAuth();
  const [currentPage, setCurrentPage] = useState('schedule');

  useClassReminder();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">连接失败</h1>
          <p className="text-gray-600 whitespace-pre-line text-left bg-gray-50 rounded-lg p-4 text-sm leading-relaxed">
            {connectionError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'courses':
        return <CourseManager />;
      case 'schedule':
        return <ScheduleView />;
      case 'settings':
        return <Settings />;
      default:
        return <ScheduleView />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
