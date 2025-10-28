import React, { useState, useEffect } from 'react';
import AdminPanel from './AdminPanel';
import AdminGradingPanel from './AdminGradingPanel';
import { Sun, Moon } from 'lucide-react';

const AdminDashboard = ({ seasonSlug = 'current' }) => {
  // Initialize activeTab from URL parameters
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    return ['questions', 'grading'].includes(tabParam) ? tabParam : 'questions';
  });

  // Local theme state for admin panel only
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('admin-panel-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('admin-panel-theme', newTheme);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-black'
        : 'bg-gradient-to-br from-slate-100 via-white to-slate-100'
    }`}>
      {/* Tab Navigation */}
      <div className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-slate-900/80 border-slate-700/40'
          : 'bg-white/80 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'questions'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40'
                    : theme === 'dark'
                      ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Question Management
              </button>
              <button
                onClick={() => setActiveTab('grading')}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'grading'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40'
                    : theme === 'dark'
                      ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Grading & Audit
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'questions' && <AdminPanel seasonSlug={seasonSlug} />}
        {activeTab === 'grading' && <AdminGradingPanel seasonSlug={seasonSlug} theme={theme} />}
      </div>
    </div>
  );
};

export default AdminDashboard;
