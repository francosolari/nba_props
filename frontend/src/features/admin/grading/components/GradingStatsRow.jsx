// File: frontend/src/features/admin/grading/components/GradingStatsRow.jsx
import React from 'react';

/**
 * Shared 4-tile stat summary used by both the Question Grading and Results
 * Audit tabs. `stats` is [{ icon, value, label, colorVar }].
 */
const GradingStatsRow = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    {stats.map(({ icon: Icon, value, label, colorVar = '--court-blue' }) => (
      <div key={label} className="court-admin-stat">
        <Icon className="w-7 h-7 shrink-0" style={{ color: `var(${colorVar})` }} />
        <div>
          <div className="court-admin-stat__value">{value}</div>
          <div className="court-admin-stat__label">{label}</div>
        </div>
      </div>
    ))}
  </div>
);

export default GradingStatsRow;
