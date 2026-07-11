export type PriorityLevel = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  profilePicture?: string; // Base64 or placeholder URL
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string; // YYYY-MM-DD
}

export interface StudySession {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  subject?: string;
  topic: string;
  notes?: string;
  createdAt: string;
}

export interface StudyNote {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  topicsCovered: string;
  conceptsLearned: string;
  importantPoints: string;
  revisionNotes: string;
  personalRemarks: string;
  createdAt: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  subject: string;
  topic: string;
  estimatedMinutes: number;
  priority: PriorityLevel;
  completed: boolean;
  createdAt: string;
}

export interface UserGoals {
  id: string;
  userId: string;
  dailyHours: number; // e.g. 3
  weeklyHours: number; // e.g. 20
  monthlyHours: number; // e.g. 80
  updatedAt: string;
}

export interface ReminderSettings {
  id: string;
  userId: string;
  time: string; // HH:MM
  enabled: boolean;
  updatedAt: string;
}

export interface Badge {
  code: 'streak_7' | 'streak_30' | 'hours_100' | 'consistent_learner' | 'early_bird' | 'night_owl' | 'goal_achiever';
  name: string;
  description: string;
  icon: string; // lucide icon name or string
  unlockedAt?: string; // YYYY-MM-DD when unlocked for this user
}

export interface DashboardStats {
  todayMinutes: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  completedPlans: number;
  pendingPlans: number;
  dailyGoalProgress: number; // percentage 0-100
  weeklyGoalProgress: number; // percentage 0-100
  monthlyGoalProgress: number; // percentage 0-100
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}
