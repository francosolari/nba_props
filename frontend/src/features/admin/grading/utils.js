// File: frontend/src/features/admin/grading/utils.js
import React from 'react';
import { Award, TrendingUp, Trophy, CheckCircle2 } from 'lucide-react';

export const getCategoryIcon = (categoryName) => {
  if (categoryName.includes('Award') || categoryName.includes('Superlative')) return <Award className="w-4 h-4" />;
  if (categoryName.includes('Standings')) return <TrendingUp className="w-4 h-4" />;
  if (categoryName.includes('Tournament')) return <Trophy className="w-4 h-4" />;
  return <CheckCircle2 className="w-4 h-4" />;
};
