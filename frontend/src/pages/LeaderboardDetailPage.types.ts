/**
 * Type definitions for LeaderboardDetailPage
 */

export interface LeaderboardDetailPageProps {
  seasonSlug?: string;
}

export type SectionType = 'standings' | 'awards' | 'props';
export type ModeType = 'showcase' | 'compare';
export type SortByType = 'standings' | 'total' | 'name';

export interface User {
  id: number;
  username: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
}

export interface Team {
  name: string;
  abbreviation?: string;
  conference?: string;
}

export interface Prediction {
  team: string;
  conference?: string;
  predicted_position: number | null;
  actual_position: number | null;
  points: number;
}

export interface Category {
  name: string;
  points: number;
  predictions?: Prediction[];
  answers?: Answer[];
}

export interface Answer {
  question_id: number;
  question_text: string;
  user_answer: string | null;
  correct_answer: string | null;
  points_awarded: number;
  max_points: number;
  is_correct: boolean | null;
}

export interface LeaderboardEntry {
  user: User;
  total_points: number;
  rank: number;
  categories?: Record<string, Category>;
  simulated_total?: number;
  simulated_rank?: number;
}

export interface SeasonInfo {
  slug: string;
  name: string;
  year: string;
  start_date: string;
  end_date: string;
}

export interface StandingsTeam {
  team: string;
  conference: string;
  actual_position: number | null;
}

export interface WhatIfItem {
  id: string;
  team: string;
  conference: 'West' | 'East';
  actual_position: number | null;
}

export interface DragResult {
  destination?: {
    index: number;
    droppableId: string;
  };
  source: {
    index: number;
    droppableId: string;
  };
  draggableId: string;
}

export interface SeasonData {
  slug: string;
  name: string;
  year: string;
  start_date: string;
  end_date: string;
  submission_start_date?: string;
  submission_end_date?: string;
}
