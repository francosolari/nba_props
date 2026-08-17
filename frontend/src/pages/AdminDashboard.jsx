import React, { useState, useEffect } from 'react';
import { ClipboardList, ShieldCheck } from 'lucide-react';
import AdminPanel from './AdminPanel';
import AdminGradingPanel from './AdminGradingPanel';

const AdminDashboard = ({ seasonSlug = 'current' }) => {
  // Initialize activeTab from URL parameters
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    return ['questions', 'grading'].includes(tabParam) ? tabParam : 'questions';
  });

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab]);

  return (
    <div className="court-admin-page">
      {/* Tab Navigation */}
      <div className="court-admin-tabbar">
        <div className="court-profile-tabs court-admin-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={activeTab === 'questions' ? 'is-active' : ''}
          >
            <ClipboardList aria-hidden="true" />
            <span>Question Management</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grading')}
            className={activeTab === 'grading' ? 'is-active' : ''}
          >
            <ShieldCheck aria-hidden="true" />
            <span>Grading &amp; Audit</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'questions' && <AdminPanel seasonSlug={seasonSlug} />}
        {activeTab === 'grading' && <AdminGradingPanel seasonSlug={seasonSlug} />}
      </div>
    </div>
  );
};

export default AdminDashboard;
