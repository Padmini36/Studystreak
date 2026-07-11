import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, StudySession, StudyNote, StudyPlan, UserGoals, ReminderSettings, Badge } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  users: User[];
  sessions: StudySession[];
  notes: StudyNote[];
  plans: StudyPlan[];
  goals: UserGoals[];
  reminders: ReminderSettings[];
  unlockedBadges: { userId: string; badgeCode: string; unlockedAt: string }[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  sessions: [],
  notes: [],
  plans: [],
  goals: [],
  reminders: [],
  unlockedBadges: [],
};

// Thread-safe / File-safe atomic DB reading and writing
export function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (err) {
    console.error('Error reading database file, using fallback', err);
    return DEFAULT_DB;
  }
}

export function writeDB(db: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database file', err);
  }
}

// Password hashing utility using standard Node crypto
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Precise Streak Calculator
export function calculateStreak(dates: string[], clientToday: string): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  // Set of unique study dates sorted ascending
  const uniqueDates = Array.from(new Set(dates)).sort();

  // Longest streak calculation
  let longest = 0;
  let currentRun = 0;
  let prevTime: number | null = null;

  for (const dateStr of uniqueDates) {
    const time = new Date(dateStr).getTime();
    if (prevTime === null) {
      currentRun = 1;
    } else {
      const diffDays = Math.round((time - prevTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        if (currentRun > longest) longest = currentRun;
        currentRun = 1;
      }
    }
    prevTime = time;
  }
  if (currentRun > longest) longest = currentRun;

  // Current streak calculation from client today's perspective
  let current = 0;
  const todayTime = new Date(clientToday);
  
  const todayStr = clientToday;
  const yesterday = new Date(todayTime);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const hasStudiedToday = uniqueDates.includes(todayStr);
  const hasStudiedYesterday = uniqueDates.includes(yesterdayStr);

  if (hasStudiedToday || hasStudiedYesterday) {
    const currentCheck = hasStudiedToday ? new Date(todayTime) : new Date(yesterday);
    while (true) {
      const checkStr = currentCheck.toISOString().split('T')[0];
      if (uniqueDates.includes(checkStr)) {
        current++;
        currentCheck.setDate(currentCheck.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    current = 0;
  }

  return { current, longest: Math.max(longest, current) };
}

// Badge definition list
export const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt'>[] = [
  {
    code: 'streak_7',
    name: '7-Day Streak',
    description: 'Studied for 7 consecutive days',
    icon: 'Flame',
  },
  {
    code: 'streak_30',
    name: '30-Day Streak',
    description: 'Studied for 30 consecutive days',
    icon: 'Trophy',
  },
  {
    code: 'hours_100',
    name: '100 Study Hours',
    description: 'Accumulated 100 hours of study sessions',
    icon: 'Award',
  },
  {
    code: 'consistent_learner',
    name: 'Consistent Learner',
    description: 'Log 20 or more study sessions',
    icon: 'Layers',
  },
  {
    code: 'early_bird',
    name: 'Early Bird',
    description: 'Start a study session between 5:00 AM and 8:00 AM',
    icon: 'Sun',
  },
  {
    code: 'night_owl',
    name: 'Night Owl',
    description: 'Finish a study session between 10:00 PM and 4:00 AM',
    icon: 'Moon',
  },
  {
    code: 'goal_achiever',
    name: 'Goal Achiever',
    description: 'Complete 10 or more study plans',
    icon: 'Target',
  },
];

// Dynamically audit and update user streaks & badges
export function updateUserStreakAndBadges(userId: string, clientToday: string): void {
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return;

  const user = db.users[userIndex];
  const userSessions = db.sessions.filter(s => s.userId === userId);
  const userPlans = db.plans.filter(p => p.userId === userId && p.completed);

  // Calculate unique study dates
  const studyDates = userSessions.map(s => s.date);
  const { current, longest } = calculateStreak(studyDates, clientToday);

  // Total Study Minutes
  const totalMinutes = userSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalHours = totalMinutes / 60;

  // Update streak numbers
  user.currentStreak = current;
  user.longestStreak = Math.max(user.longestStreak, longest);
  
  if (studyDates.length > 0) {
    const sortedDates = [...new Set(studyDates)].sort();
    user.lastStudyDate = sortedDates[sortedDates.length - 1];
  }

  // Evaluate badge unlocking
  const currentUnlocked = db.unlockedBadges.filter(ub => ub.userId === userId).map(ub => ub.badgeCode);
  const badgesToUnlock: string[] = [];

  // Streak Badges
  if (current >= 7 && !currentUnlocked.includes('streak_7')) badgesToUnlock.push('streak_7');
  if (current >= 30 && !currentUnlocked.includes('streak_30')) badgesToUnlock.push('streak_30');

  // Hours badge
  if (totalHours >= 100 && !currentUnlocked.includes('hours_100')) badgesToUnlock.push('hours_100');

  // Consistent Learner (20+ sessions)
  if (userSessions.length >= 20 && !currentUnlocked.includes('consistent_learner')) {
    badgesToUnlock.push('consistent_learner');
  }

  // Goal Achiever (10+ completed plans)
  if (userPlans.length >= 10 && !currentUnlocked.includes('goal_achiever')) {
    badgesToUnlock.push('goal_achiever');
  }

  // Early Bird (start 5:00 AM - 8:00 AM)
  const hasEarlyBird = userSessions.some(s => {
    const hour = parseInt(s.startTime.split(':')[0], 10);
    return hour >= 5 && hour < 8;
  });
  if (hasEarlyBird && !currentUnlocked.includes('early_bird')) {
    badgesToUnlock.push('early_bird');
  }

  // Night Owl (end 10:00 PM (22:00) to 4:00 AM)
  const hasNightOwl = userSessions.some(s => {
    const endHour = parseInt(s.endTime.split(':')[0], 10);
    // 22, 23, 00, 01, 02, 03
    return endHour >= 22 || endHour < 4;
  });
  if (hasNightOwl && !currentUnlocked.includes('night_owl')) {
    badgesToUnlock.push('night_owl');
  }

  // Insert newly unlocked badges
  if (badgesToUnlock.length > 0) {
    badgesToUnlock.forEach(code => {
      db.unlockedBadges.push({
        userId,
        badgeCode: code,
        unlockedAt: clientToday,
      });
    });
  }

  db.users[userIndex] = user;
  writeDB(db);
}
