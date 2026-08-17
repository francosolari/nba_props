// File: frontend/src/features/admin/grading/components/AuditTab.jsx
import React, { useMemo } from 'react';
import { Clock, CheckCircle2, Trophy, Users } from 'lucide-react';
import GradingStatsRow from './GradingStatsRow';
import AuditUserRow from './AuditUserRow';

const AuditTab = ({
  auditData,
  searchQuery,
  expandedUsers,
  onToggleUser,
  expandedCategories,
  onToggleCategory,
  bulkGradeMode,
  selectedAnswers,
  onToggleAnswerSelection,
  onGradeAnswer,
}) => {
  const filteredUsers = useMemo(() => {
    if (!auditData?.users) return [];
    if (!searchQuery.trim()) return auditData.users;
    const query = searchQuery.toLowerCase();
    return auditData.users.filter((user) => (
      user.username.toLowerCase().includes(query) || user.display_name.toLowerCase().includes(query)
    ));
  }, [auditData, searchQuery]);

  const stats = [
    { icon: Users, value: filteredUsers.length, label: 'Total Users', colorVar: '--court-blue' },
    { icon: Trophy, value: filteredUsers[0]?.total_points?.toFixed(1) || 0, label: 'Top Score', colorVar: '--court-gold' },
    {
      icon: CheckCircle2,
      value: filteredUsers.reduce((sum, u) => sum + u.categories.reduce((s, c) => s + c.correct_count, 0), 0),
      label: 'Correct Answers',
      colorVar: '--court-success',
    },
    {
      icon: Clock,
      value: filteredUsers.reduce((sum, u) => sum + u.categories.reduce((s, c) => s + c.pending_count, 0), 0),
      label: 'Pending',
      colorVar: '--court-warning',
    },
  ];

  return (
    <div>
      <GradingStatsRow stats={stats} />

      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <AuditUserRow
            key={user.user_id}
            user={user}
            isExpanded={expandedUsers.has(user.user_id)}
            onToggle={() => onToggleUser(user.user_id)}
            expandedCategories={expandedCategories}
            onToggleCategory={onToggleCategory}
            bulkGradeMode={bulkGradeMode}
            selectedAnswers={selectedAnswers}
            onToggleAnswerSelection={onToggleAnswerSelection}
            onGradeAnswer={onGradeAnswer}
          />
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-[var(--court-steel)]">
          No users found matching your search.
        </div>
      )}
    </div>
  );
};

export default AuditTab;
