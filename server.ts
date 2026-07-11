import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  readDB,
  writeDB,
  hashPassword,
  updateUserStreakAndBadges,
  BADGE_DEFINITIONS
} from './server/db';
import { User, StudySession, StudyNote, StudyPlan, UserGoals, ReminderSettings } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to generate a stateless token: ST_<userId>_<randomHex>
function generateToken(userId: string): string {
  const randomHex = crypto.randomBytes(8).toString('hex');
  return `ST_${userId}_${randomHex}`;
}

// Middleware to authenticate requests
interface AuthRequest extends Request {
  userId?: string;
  user?: User;
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token is required.' });
    return;
  }

  if (!token.startsWith('ST_')) {
    res.status(403).json({ error: 'Invalid authentication token.' });
    return;
  }

  const payload = token.slice(3); // remove "ST_"
  const lastUnderscoreIndex = payload.lastIndexOf('_');
  if (lastUnderscoreIndex === -1) {
    res.status(403).json({ error: 'Invalid authentication token.' });
    return;
  }

  const userId = payload.slice(0, lastUnderscoreIndex);
  const db = readDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    res.status(403).json({ error: 'User associated with this token not found.' });
    return;
  }

  req.userId = userId;
  req.user = user;
  next();
}

// --- API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Authentication: Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  const db = readDB();
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (existingUser) {
    res.status(400).json({ error: 'An account with this email already exists.' });
    return;
  }

  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const newUser: User = {
    id: userId,
    name,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    currentStreak: 0,
    longestStreak: 0,
  };

  db.users.push(newUser);

  // Initialize default goals
  const defaultGoals: UserGoals = {
    id: `gl_${crypto.randomBytes(8).toString('hex')}`,
    userId,
    dailyHours: 3,
    weeklyHours: 20,
    monthlyHours: 80,
    updatedAt: new Date().toISOString(),
  };
  db.goals.push(defaultGoals);

  // Initialize default reminder settings
  const defaultReminder: ReminderSettings = {
    id: `rm_${crypto.randomBytes(8).toString('hex')}`,
    userId,
    time: '19:00',
    enabled: true,
    updatedAt: new Date().toISOString(),
  };
  db.reminders.push(defaultReminder);

  writeDB(db);

  const token = generateToken(userId);
  const { passwordHash, ...userResponse } = newUser;

  res.status(201).json({
    user: userResponse,
    token,
  });
});

// Authentication: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const db = readDB();
  const normalizedEmail = email.toLowerCase().trim();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = generateToken(user.id);
  const { passwordHash, ...userResponse } = user;

  res.json({
    user: userResponse,
    token,
  });
});

// Auth: Get Current User Info
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
  const { passwordHash, ...userResponse } = req.user!;
  res.json({ user: userResponse });
});

// Auth: Update User Profile
app.put('/api/auth/profile', authenticateToken, (req: AuthRequest, res) => {
  const { name, password, profilePicture } = req.body;
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === req.userId);

  if (userIndex === -1) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const user = db.users[userIndex];
  if (name) user.name = name;
  if (password) user.passwordHash = hashPassword(password);
  if (profilePicture !== undefined) user.profilePicture = profilePicture;

  db.users[userIndex] = user;
  writeDB(db);

  const { passwordHash, ...userResponse } = user;
  res.json({ user: userResponse });
});

// --- STUDY SESSIONS CRUD ---

// List all study sessions
app.get('/api/sessions', authenticateToken, (req: AuthRequest, res) => {
  const db = readDB();
  const userSessions = db.sessions
    .filter(s => s.userId === req.userId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  res.json(userSessions);
});

// Add a study session
app.post('/api/sessions', authenticateToken, (req: AuthRequest, res) => {
  const { date, startTime, endTime, subject, topic, notes, clientToday } = req.body;

  if (!date || !startTime || !endTime || !topic) {
    res.status(400).json({ error: 'Date, start time, end time, and topic are required.' });
    return;
  }

  // Calculate duration
  const startParts = startTime.split(':').map(Number);
  const endParts = endTime.split(':').map(Number);
  let startMin = startParts[0] * 60 + startParts[1];
  let endMin = endParts[0] * 60 + endParts[1];

  if (endMin < startMin) {
    // Session goes past midnight
    endMin += 24 * 60;
  }

  const durationMinutes = endMin - startMin;

  const db = readDB();
  const newSession: StudySession = {
    id: `ss_${crypto.randomBytes(8).toString('hex')}`,
    userId: req.userId!,
    date,
    startTime,
    endTime,
    durationMinutes,
    subject: subject || '',
    topic,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.sessions.push(newSession);
  writeDB(db);

  // Trigger streak and badges audit
  const todayToUse = clientToday || date;
  updateUserStreakAndBadges(req.userId!, todayToUse);

  res.status(201).json(newSession);
});

// Edit a study session
app.put('/api/sessions/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { date, startTime, endTime, subject, topic, notes, clientToday } = req.body;

  const db = readDB();
  const sessionIndex = db.sessions.findIndex(s => s.id === id && s.userId === req.userId);

  if (sessionIndex === -1) {
    res.status(404).json({ error: 'Study session not found or unauthorized.' });
    return;
  }

  const session = db.sessions[sessionIndex];

  if (date) session.date = date;
  if (startTime) session.startTime = startTime;
  if (endTime) session.endTime = endTime;
  if (topic) session.topic = topic;
  if (subject !== undefined) session.subject = subject;
  if (notes !== undefined) session.notes = notes;

  // Re-calculate duration if times changed
  const startParts = session.startTime.split(':').map(Number);
  const endParts = session.endTime.split(':').map(Number);
  let startMin = startParts[0] * 60 + startParts[1];
  let endMin = endParts[0] * 60 + endParts[1];
  if (endMin < startMin) endMin += 24 * 60;
  session.durationMinutes = endMin - startMin;

  db.sessions[sessionIndex] = session;
  writeDB(db);

  const todayToUse = clientToday || session.date;
  updateUserStreakAndBadges(req.userId!, todayToUse);

  res.json(session);
});

// Delete a study session
app.delete('/api/sessions/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { clientToday } = req.query;

  const db = readDB();
  const session = db.sessions.find(s => s.id === id && s.userId === req.userId);

  if (!session) {
    res.status(404).json({ error: 'Study session not found or unauthorized.' });
    return;
  }

  db.sessions = db.sessions.filter(s => s.id !== id);
  writeDB(db);

  const todayToUse = (clientToday as string) || session.date;
  updateUserStreakAndBadges(req.userId!, todayToUse);

  res.json({ success: true });
});

// --- DAILY NOTES CRUD ---

// Get all study notes
app.get('/api/notes', authenticateToken, (req: AuthRequest, res) => {
  const db = readDB();
  const userNotes = db.notes.filter(n => n.userId === req.userId);
  res.json(userNotes);
});

// Upsert daily notes
app.post('/api/notes', authenticateToken, (req: AuthRequest, res) => {
  const { date, topicsCovered, conceptsLearned, importantPoints, revisionNotes, personalRemarks } = req.body;

  if (!date) {
    res.status(400).json({ error: 'Date is required.' });
    return;
  }

  const db = readDB();
  const noteIndex = db.notes.findIndex(n => n.date === date && n.userId === req.userId);

  if (noteIndex > -1) {
    // Update existing
    const existing = db.notes[noteIndex];
    existing.topicsCovered = topicsCovered || '';
    existing.conceptsLearned = conceptsLearned || '';
    existing.importantPoints = importantPoints || '';
    existing.revisionNotes = revisionNotes || '';
    existing.personalRemarks = personalRemarks || '';
    db.notes[noteIndex] = existing;
    writeDB(db);
    res.json(existing);
  } else {
    // Create new
    const newNote: StudyNote = {
      id: `nt_${crypto.randomBytes(8).toString('hex')}`,
      userId: req.userId!,
      date,
      topicsCovered: topicsCovered || '',
      conceptsLearned: conceptsLearned || '',
      importantPoints: importantPoints || '',
      revisionNotes: revisionNotes || '',
      personalRemarks: personalRemarks || '',
      createdAt: new Date().toISOString(),
    };
    db.notes.push(newNote);
    writeDB(db);
    res.status(201).json(newNote);
  }
});

// --- STUDY PLANNER CRUD ---

// Get all study plans
app.get('/api/plans', authenticateToken, (req: AuthRequest, res) => {
  const db = readDB();
  const userPlans = db.plans.filter(p => p.userId === req.userId);
  res.json(userPlans);
});

// Add a study plan
app.post('/api/plans', authenticateToken, (req: AuthRequest, res) => {
  const { date, subject, topic, estimatedMinutes, priority } = req.body;

  if (!date || !subject || !topic || !estimatedMinutes || !priority) {
    res.status(400).json({ error: 'Date, subject, topic, estimatedMinutes, and priority are required.' });
    return;
  }

  const db = readDB();
  const newPlan: StudyPlan = {
    id: `pl_${crypto.randomBytes(8).toString('hex')}`,
    userId: req.userId!,
    date,
    subject,
    topic,
    estimatedMinutes,
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  db.plans.push(newPlan);
  writeDB(db);
  res.status(201).json(newPlan);
});

// Edit or Complete a study plan
app.put('/api/plans/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { date, subject, topic, estimatedMinutes, priority, completed, clientToday } = req.body;

  const db = readDB();
  const planIndex = db.plans.findIndex(p => p.id === id && p.userId === req.userId);

  if (planIndex === -1) {
    res.status(404).json({ error: 'Study plan not found.' });
    return;
  }

  const plan = db.plans[planIndex];
  if (date) plan.date = date;
  if (subject) plan.subject = subject;
  if (topic) plan.topic = topic;
  if (estimatedMinutes !== undefined) plan.estimatedMinutes = estimatedMinutes;
  if (priority) plan.priority = priority;
  if (completed !== undefined) plan.completed = completed;

  db.plans[planIndex] = plan;
  writeDB(db);

  // Trigger streak check on complete
  if (completed && clientToday) {
    updateUserStreakAndBadges(req.userId!, clientToday);
  }

  res.json(plan);
});

// Delete study plan
app.delete('/api/plans/:id', authenticateToken, (req: AuthRequest, res) => {
  const { id } = req.params;

  const db = readDB();
  db.plans = db.plans.filter(p => p.id !== id || p.userId !== req.userId);
  writeDB(db);

  res.json({ success: true });
});

// --- GOAL SETTING ---

// Get goals
app.get('/api/goals', authenticateToken, (req: AuthRequest, res) => {
  const db = readDB();
  let goals = db.goals.find(g => g.userId === req.userId);
  if (!goals) {
    goals = {
      id: `gl_${crypto.randomBytes(8).toString('hex')}`,
      userId: req.userId!,
      dailyHours: 3,
      weeklyHours: 20,
      monthlyHours: 80,
      updatedAt: new Date().toISOString(),
    };
    db.goals.push(goals);
    writeDB(db);
  }
  res.json(goals);
});

// Save goals
app.post('/api/goals', authenticateToken, (req: AuthRequest, res) => {
  const { dailyHours, weeklyHours, monthlyHours } = req.body;
  const db = readDB();
  let goalsIndex = db.goals.findIndex(g => g.userId === req.userId);

  if (goalsIndex > -1) {
    db.goals[goalsIndex].dailyHours = Number(dailyHours);
    db.goals[goalsIndex].weeklyHours = Number(weeklyHours);
    db.goals[goalsIndex].monthlyHours = Number(monthlyHours);
    db.goals[goalsIndex].updatedAt = new Date().toISOString();
  } else {
    const newGoals: UserGoals = {
      id: `gl_${crypto.randomBytes(8).toString('hex')}`,
      userId: req.userId!,
      dailyHours: Number(dailyHours),
      weeklyHours: Number(weeklyHours),
      monthlyHours: Number(monthlyHours),
      updatedAt: new Date().toISOString(),
    };
    db.goals.push(newGoals);
    goalsIndex = db.goals.length - 1;
  }

  writeDB(db);
  res.json(db.goals[goalsIndex]);
});

// --- REMINDERS ---

// Get reminder settings
app.get('/api/reminders', authenticateToken, (req: AuthRequest, res) => {
  const db = readDB();
  let reminder = db.reminders.find(r => r.userId === req.userId);
  if (!reminder) {
    reminder = {
      id: `rm_${crypto.randomBytes(8).toString('hex')}`,
      userId: req.userId!,
      time: '19:00',
      enabled: true,
      updatedAt: new Date().toISOString(),
    };
    db.reminders.push(reminder);
    writeDB(db);
  }
  res.json(reminder);
});

// Save reminder settings
app.post('/api/reminders', authenticateToken, (req: AuthRequest, res) => {
  const { time, enabled } = req.body;
  const db = readDB();
  let reminderIndex = db.reminders.findIndex(r => r.userId === req.userId);

  if (reminderIndex > -1) {
    db.reminders[reminderIndex].time = time;
    db.reminders[reminderIndex].enabled = enabled;
    db.reminders[reminderIndex].updatedAt = new Date().toISOString();
  } else {
    const newReminder: ReminderSettings = {
      id: `rm_${crypto.randomBytes(8).toString('hex')}`,
      userId: req.userId!,
      time,
      enabled,
      updatedAt: new Date().toISOString(),
    };
    db.reminders.push(newReminder);
    reminderIndex = db.reminders.length - 1;
  }

  writeDB(db);
  res.json(db.reminders[reminderIndex]);
});

// --- ACHIEVEMENT BADGES ---

app.get('/api/badges', authenticateToken, (req: AuthRequest, res) => {
  const db = readDB();
  const unlocked = db.unlockedBadges.filter(ub => ub.userId === req.userId);

  const fullBadgesList = BADGE_DEFINITIONS.map(def => {
    const foundUnlock = unlocked.find(ub => ub.badgeCode === def.code);
    return {
      ...def,
      unlockedAt: foundUnlock ? foundUnlock.unlockedAt : undefined,
    };
  });

  res.json(fullBadgesList);
});

// --- DASHBOARD & STATISTICS DATA ---

app.get('/api/stats', authenticateToken, (req: AuthRequest, res) => {
  const { clientToday } = req.query;
  if (!clientToday) {
    res.status(400).json({ error: 'clientToday (YYYY-MM-DD) is required.' });
    return;
  }

  const todayStr = clientToday as string;
  const db = readDB();
  const user = db.users.find(u => u.id === req.userId)!;
  const sessions = db.sessions.filter(s => s.userId === req.userId);
  const plans = db.plans.filter(p => p.userId === req.userId);
  const goals = db.goals.find(g => g.userId === req.userId) || { dailyHours: 3, weeklyHours: 20, monthlyHours: 80 };

  // Calculate stats based on Client local date
  const todayDate = new Date(todayStr);

  // 1. Today study time
  const todayMinutes = sessions
    .filter(s => s.date === todayStr)
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  // 2. Total hours
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  // 3. Weekly total (Current week Sunday to Saturday)
  const startOfWeek = new Date(todayDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(todayDate.getDate() - day); // go back to Sunday
  startOfWeek.setHours(0,0,0,0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999);

  const weekSessions = sessions.filter(s => {
    const sDate = new Date(s.date);
    return sDate >= startOfWeek && sDate <= endOfWeek;
  });
  const weeklyMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // 4. Monthly total (Current month 1st to last)
  const year = todayDate.getFullYear();
  const month = todayDate.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const nextMonth = new Date(year, month + 1, 1);

  const monthSessions = sessions.filter(s => {
    const sDate = new Date(s.date);
    return sDate >= startOfMonth && sDate < nextMonth;
  });
  const monthlyMinutes = monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Goal percentages
  const dailyGoalProgress = Math.min(Math.round((todayMinutes / (goals.dailyHours * 60)) * 100), 100) || 0;
  const weeklyGoalProgress = Math.min(Math.round((weeklyMinutes / (goals.weeklyHours * 60)) * 100), 100) || 0;
  const monthlyGoalProgress = Math.min(Math.round((monthlyMinutes / (goals.monthlyHours * 60)) * 100), 100) || 0;

  // Plans counts
  const completedPlans = plans.filter(p => p.completed).length;
  const pendingPlans = plans.filter(p => !p.completed).length;

  // Study hours history over last 7 days (including today)
  const last7Days: { date: string; dayName: string; hours: number }[] = [];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const mins = sessions.filter(s => s.date === dStr).reduce((sum, s) => sum + s.durationMinutes, 0);
    last7Days.push({
      date: dStr,
      dayName: weekdayNames[d.getDay()],
      hours: Math.round((mins / 60) * 10) / 10,
    });
  }

  // Study hours history over last 4 weeks
  const last4Weeks: { name: string; hours: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const startW = new Date(startOfWeek);
    startW.setDate(startOfWeek.getDate() - i * 7);
    const endW = new Date(startW);
    endW.setDate(startW.getDate() + 6);
    endW.setHours(23, 59, 59, 999);

    const mins = sessions
      .filter(s => {
        const sd = new Date(s.date);
        return sd >= startW && sd <= endW;
      })
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    last4Weeks.push({
      name: i === 0 ? 'This Week' : `${i}w Ago`,
      hours: Math.round((mins / 60) * 10) / 10,
    });
  }

  // Monthly breakdown for last 6 months
  const last6Months: { monthName: string; hours: number }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 5; i >= 0; i--) {
    const targetM = new Date(year, month - i, 1);
    const startM = new Date(targetM.getFullYear(), targetM.getMonth(), 1);
    const endM = new Date(targetM.getFullYear(), targetM.getMonth() + 1, 0, 23, 59, 59, 999);

    const mins = sessions
      .filter(s => {
        const sd = new Date(s.date);
        return sd >= startM && sd <= endM;
      })
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    last6Months.push({
      monthName: monthNames[targetM.getMonth()],
      hours: Math.round((mins / 60) * 10) / 10,
    });
  }

  // Calculate average daily study time
  const totalStudyDays = new Set(sessions.map(s => s.date)).size;
  const averageDailyStudyTimeMinutes = totalStudyDays > 0 ? totalMinutes / totalStudyDays : 0;
  const averageDailyStudyTimeHours = Math.round((averageDailyStudyTimeMinutes / 60) * 10) / 10;

  // Most productive weekday (e.g. "Monday" had most overall accumulated time)
  const weekdayAccumulator = [0, 0, 0, 0, 0, 0, 0]; // Sun=0, Mon=1, etc.
  sessions.forEach(s => {
    const dayIndex = new Date(s.date).getDay();
    weekdayAccumulator[dayIndex] += s.durationMinutes;
  });
  const maxDayIndex = weekdayAccumulator.indexOf(Math.max(...weekdayAccumulator));
  const weekdayFullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mostProductiveDay = sessions.length > 0 ? weekdayFullNames[maxDayIndex] : 'N/A';

  res.json({
    todayMinutes,
    totalHours,
    weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
    monthlyHours: Math.round((monthlyMinutes / 60) * 10) / 10,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalSessions: sessions.length,
    completedPlans,
    pendingPlans,
    dailyGoalProgress,
    weeklyGoalProgress,
    monthlyGoalProgress,
    averageDailyStudyTimeHours,
    mostProductiveDay,
    goals,
    history7Days: last7Days,
    history4Weeks: last4Weeks,
    history6Months: last6Months,
  });
});

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// --- VITE DEV & PRODUCTION SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
