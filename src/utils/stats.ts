import { StudySession, StudyPlan } from '../types';

export function calculateStreaks(sessions: any[]): { currentStreak: number; longestStreak: number } {
  if (!sessions || sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Extract distinct, valid dates (YYYY-MM-DD)
  const datesSet = new Set<string>();
  sessions.forEach(s => {
    const d = s.date || s.session_date;
    if (d && typeof d === 'string') {
      const match = d.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) {
        datesSet.add(match[0]);
      }
    }
  });

  if (datesSet.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort dates in ascending order
  const sortedDates = Array.from(datesSet).sort();

  // Convert sorted dates to timestamps (milliseconds) of UTC days for safe comparison
  const timestamps = sortedDates.map(d => {
    const [y, m, day] = d.split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  });

  const msInDay = 24 * 60 * 60 * 1000;

  // Calculate streaks
  let longest = 0;
  let current = 0;
  let tempStreak = 1;

  for (let i = 0; i < timestamps.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const diff = timestamps[i] - timestamps[i - 1];
      if (diff === msInDay) {
        tempStreak++;
      } else if (diff > msInDay) {
        if (tempStreak > longest) {
          longest = tempStreak;
        }
        tempStreak = 1;
      }
    }
  }
  if (tempStreak > longest) {
    longest = tempStreak;
  }

  // To compute the current streak, we check if the last recorded session was today or yesterday
  const now = new Date();
  const localTodayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const localYesterdayUTC = localTodayUTC - msInDay;

  const lastTimestamp = timestamps[timestamps.length - 1];

  if (lastTimestamp === localTodayUTC || lastTimestamp === localYesterdayUTC) {
    // The streak is active up to the last session
    // Find the active streak that ends at the last element
    let activeStreak = 1;
    for (let i = timestamps.length - 1; i > 0; i--) {
      const diff = timestamps[i] - timestamps[i - 1];
      if (diff === msInDay) {
        activeStreak++;
      } else {
        break;
      }
    }
    current = activeStreak;
  } else {
    current = 0;
  }

  return { currentStreak: current, longestStreak: longest };
}

export function computeDashboardStats(
  sessions: StudySession[],
  plans: StudyPlan[],
  goals: { dailyHours: number; weeklyHours: number; monthlyHours: number }
) {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Today minutes
  const todayMinutes = sessions
    .filter(s => (s.date || (s as any).session_date) === todayStr)
    .reduce((sum, s) => sum + (s.durationMinutes || (s as any).duration_minutes || 0), 0);

  // 2. Total study hours
  const totalMins = sessions.reduce((sum, s) => sum + (s.durationMinutes || (s as any).duration_minutes || 0), 0);
  const totalHours = Math.round((totalMins / 60) * 10) / 10;

  // 3. Total sessions logged
  const totalSessions = sessions.length;

  // 4. Plans count
  const completedPlans = plans.filter(p => p.completed || (p as any).is_completed).length;
  const pendingPlans = plans.filter(p => !(p.completed || (p as any).is_completed)).length;

  // 5. Streaks
  const { currentStreak, longestStreak } = calculateStreaks(sessions);

  // 6. Weekly hours (current calendar week Monday-Sunday)
  const now = new Date();
  const currentWeekMins = sessions
    .filter(s => {
      const sDate = new Date(s.date || (s as any).session_date);
      const diffTime = Math.abs(now.getTime() - sDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    })
    .reduce((sum, s) => sum + (s.durationMinutes || (s as any).duration_minutes || 0), 0);
  const weeklyHours = Math.round((currentWeekMins / 60) * 10) / 10;

  // 7. Monthly hours (current month)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthMins = sessions
    .filter(s => {
      const sDate = new Date(s.date || (s as any).session_date);
      return sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear;
    })
    .reduce((sum, s) => sum + (s.durationMinutes || (s as any).duration_minutes || 0), 0);
  const monthlyHours = Math.round((currentMonthMins / 60) * 10) / 10;

  // 8. Progress percentages
  const dailyGoalProgress = goals.dailyHours > 0 ? Math.round((todayMinutes / (goals.dailyHours * 60)) * 100) : 0;
  const weeklyGoalProgress = goals.weeklyHours > 0 ? Math.round((weeklyHours / goals.weeklyHours) * 100) : 0;
  const monthlyGoalProgress = goals.monthlyHours > 0 ? Math.round((monthlyHours / goals.monthlyHours) * 100) : 0;

  // 9. history7Days
  const history7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const mins = sessions
      .filter(s => (s.date || (s as any).session_date) === dateStr)
      .reduce((sum, s) => sum + (s.durationMinutes || (s as any).duration_minutes || 0), 0);
    history7Days.push({
      dayName,
      hours: Math.round((mins / 60) * 10) / 10
    });
  }

  // 10. history4Weeks
  const history4Weeks = [];
  const msInDay = 24 * 60 * 60 * 1000;
  for (let i = 3; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - (i * 7 + 6));
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - (i * 7));
    end.setHours(23, 59, 59, 999);

    const mins = sessions
      .filter(s => {
        const sDate = new Date(s.date || (s as any).session_date);
        return sDate >= start && sDate <= end;
      })
      .reduce((sum, s) => sum + (s.durationMinutes || (s as any).duration_minutes || 0), 0);

    history4Weeks.push({
      name: i === 0 ? 'This Week' : `${i}w ago`,
      hours: Math.round((mins / 60) * 10) / 10
    });
  }

  return {
    todayMinutes,
    totalHours,
    totalSessions,
    completedPlans,
    pendingPlans,
    currentStreak,
    longestStreak,
    weeklyHours,
    monthlyHours,
    dailyGoalProgress,
    weeklyGoalProgress,
    monthlyGoalProgress,
    history7Days,
    history4Weeks,
    goals
  };
}
