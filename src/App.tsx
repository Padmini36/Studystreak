import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  LayoutDashboard,
  Clock,
  Calendar as CalendarIcon,
  BookOpen,
  Award,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Activity,
  Zap,
  BarChart2,
  Lock,
  Mail,
  UserPlus,
  BookMarked,
  AlertCircle
} from 'lucide-react';

import { supabase } from './utils/supabase';
import { computeDashboardStats } from './utils/stats';
import { User, StudySession, StudyPlan, StudyNote, Badge } from './types';

// Child views
import DashboardView from './components/DashboardView';
import SessionsView from './components/SessionsView';
import PlannerView from './components/PlannerView';
import CalendarView from './components/CalendarView';
import DailyNotesView from './components/DailyNotesView';
import BadgesView from './components/BadgesView';
import ProfileView from './components/ProfileView';
import StatsView from './components/StatsView';

// REQUIREMENT: Placeholders at the top of the file for SUPABASE_URL and SUPABASE_ANON_KEY
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key-1234567890';

// Helper to calculate duration in minutes by subtracting start time from end time
function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin < 0) {
    diffMin += 24 * 60; // Handle overnight sessions
  }
  return diffMin;
}

// Helper to dynamically calculate custom milestone badges based on user stats
function calculateBadges(sessions: StudySession[], longestStreak: number, plans: StudyPlan[]): Badge[] {
  const list: Badge[] = [
    {
      code: 'streak_7',
      name: 'Consistent Scholar',
      description: 'Achieve a 7-day study streak.',
      icon: 'Flame',
      unlockedAt: longestStreak >= 7 ? '2026-07-11' : undefined
    },
    {
      code: 'streak_30',
      name: 'Habit Master',
      description: 'Achieve a 30-day study streak.',
      icon: 'Award',
      unlockedAt: longestStreak >= 30 ? '2026-07-11' : undefined
    },
    {
      code: 'hours_100',
      name: 'Century Club',
      description: 'Accumulate 100 total hours of study time.',
      icon: 'Clock',
      unlockedAt: (sessions.reduce((sum, s) => sum + s.durationMinutes, 0) >= 6000) ? '2026-07-11' : undefined
    },
    {
      code: 'consistent_learner',
      name: 'Routine Builder',
      description: 'Log sessions on at least 5 distinct days.',
      icon: 'Activity',
      unlockedAt: (new Set(sessions.map(s => s.date)).size >= 5) ? '2026-07-11' : undefined
    },
    {
      code: 'early_bird',
      name: 'Early Bird',
      description: 'Log a study session starting before 8:00 AM.',
      icon: 'Sun',
      unlockedAt: sessions.some(s => {
        if (!s.startTime) return false;
        const hour = parseInt(s.startTime.split(':')[0], 10);
        return hour < 8;
      }) ? '2026-07-11' : undefined
    },
    {
      code: 'night_owl',
      name: 'Midnight Oil',
      description: 'Log a study session ending after 10:00 PM (22:00).',
      icon: 'Moon',
      unlockedAt: sessions.some(s => {
        if (!s.endTime) return false;
        const hour = parseInt(s.endTime.split(':')[0], 10);
        return hour >= 22;
      }) ? '2026-07-11' : undefined
    },
    {
      code: 'goal_achiever',
      name: 'Goal Crusher',
      description: 'Complete at least 5 planned study tasks.',
      icon: 'Zap',
      unlockedAt: (plans.filter(p => p.completed).length >= 5) ? '2026-07-11' : undefined
    }
  ];
  return list;
}

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Omit<User, 'passwordHash'> | null>(null);
  const [isLogin, setIsLogin] = useState<boolean>(true);

  // Auth fields
  const [authName, setAuthName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpToken, setOtpToken] = useState('');

  // App core state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  // Local storage persisted preferences (Goals, Reminders, Theme)
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('study_streak_goals');
    return saved ? JSON.parse(saved) : { dailyHours: 3, weeklyHours: 20, monthlyHours: 80 };
  });

  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('study_streak_reminders');
    return saved ? JSON.parse(saved) : { enabled: true, time: '19:00' };
  });

  const [stats, setStats] = useState<any>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Loading states
  const [dataLoading, setDataLoading] = useState(false);
  const [preselectedDateForNotes, setPreselectedDateForNotes] = useState<string | undefined>(undefined);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('study_streak_theme');
    return saved === 'dark';
  });

  // REQUIREMENT: Theme toggle switch sets the data-theme attribute on the <html> tag and persists it in local storage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('study_streak_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('study_streak_theme', 'light');
    }
  }, [isDarkMode]);

  // Sync state modifications for goals & reminders with localStorage
  useEffect(() => {
    localStorage.setItem('study_streak_goals', JSON.stringify(goals));
    if (token) {
      loadAllTelemetry();
    }
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('study_streak_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Load fallback local telemetry from localStorage
  const loadFallbackTelemetry = () => {
    const savedSessions = localStorage.getItem('fallback_study_sessions');
    const savedPlans = localStorage.getItem('fallback_study_plans');
    const savedNotes = localStorage.getItem('fallback_study_notes');

    const mappedSessions: StudySession[] = savedSessions ? JSON.parse(savedSessions) : [];
    const mappedPlans: StudyPlan[] = savedPlans ? JSON.parse(savedPlans) : [];
    const mappedNotes: StudyNote[] = savedNotes ? JSON.parse(savedNotes) : [];

    setSessions(mappedSessions);
    setPlans(mappedPlans);
    setNotes(mappedNotes);

    const computed = computeDashboardStats(mappedSessions, mappedPlans, goals);
    setStats(computed);

    setUser(prev => {
      const activeUser = prev || {
        id: 'fallback-user-id',
        email: 'preview@example.com',
        name: 'Demo Student',
        profilePicture: '🦉',
        currentStreak: 0,
        longestStreak: 0
      };
      return {
        ...activeUser,
        currentStreak: computed.currentStreak,
        longestStreak: computed.longestStreak
      };
    });

    setBadges(calculateBadges(mappedSessions, computed.longestStreak, mappedPlans));
  };

  // REQUIREMENT: Listen to supabase.auth.onAuthStateChange for smooth routing
  useEffect(() => {
    let subscription: any = null;

    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          if (session.user && !session.user.email_confirmed_at) {
            if (!isLogin) {
              supabase.auth.signOut().catch(() => {});
              setToken(null);
              setUser(null);
              setShowOtpStep(true);
              return;
            }
            setToken(null);
            setUser(null);
            return;
          }

          setToken(session.access_token);
          const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Student';
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: name,
            currentStreak: 0,
            longestStreak: 0,
            profilePicture: '🦉'
          });
        } else {
          // If we are using fallback, don't clear fallback token
          if (!isUsingFallback) {
            setToken(null);
            setUser(null);
          }
        }
      });
      subscription = data?.subscription;
    } catch (err) {
      console.warn('Supabase onAuthStateChange failed:', err);
    }

    // Check active session on initial mount
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          if (session.user && !session.user.email_confirmed_at) {
            if (!isLogin) {
              supabase.auth.signOut().catch(() => {});
              setToken(null);
              setUser(null);
              setShowOtpStep(true);
              return;
            }
            setToken(null);
            setUser(null);
            return;
          }
          setToken(session.access_token);
          const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Student';
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: name,
            currentStreak: 0,
            longestStreak: 0,
            profilePicture: '🦉'
          });
        } else {
          // If placeholder project, auto-init local fallback
          if (SUPABASE_URL.includes('placeholder-project')) {
            setIsUsingFallback(true);
            setToken('demo-token');
            loadFallbackTelemetry();
          }
        }
      }).catch(err => {
        console.warn('Supabase getSession failed, falling back:', err);
        setIsUsingFallback(true);
        setToken('demo-token');
        loadFallbackTelemetry();
      });
    } catch (err) {
      console.warn('Supabase getSession sync failed:', err);
      setIsUsingFallback(true);
      setToken('demo-token');
      loadFallbackTelemetry();
    }

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [isUsingFallback, isLogin]);

  // Fetch telemetry from study_sessions & study_plans tables for the logged-in user
  useEffect(() => {
    if (token && user) {
      if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
        loadFallbackTelemetry();
      } else {
        loadAllTelemetry();
      }
    }
  }, [token]);

  const loadAllTelemetry = async () => {
    setDataLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw userError || new Error('No user found');
      }
      const currentUser = userData.user;

      // Query sessions and plans in parallel
      const [sessionsRes, plansRes, notesRes] = await Promise.all([
        supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('session_date', { ascending: false }),
        supabase
          .from('study_plans')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: true }),
        supabase
          .from('study_notes')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: false })
      ]);

      const rawSessions = sessionsRes.data || [];
      const rawPlans = plansRes.data || [];
      const rawNotes = notesRes.data || [];

      // Map rows from PostgreSQL snake_case / camelCase safely
      const mappedSessions: StudySession[] = rawSessions.map((s: any) => ({
        id: s.id?.toString(),
        userId: s.user_id || currentUser.id,
        date: s.session_date || s.date || '',
        startTime: s.start_time || s.startTime || '',
        endTime: s.end_time || s.endTime || '',
        durationMinutes: Number(s.duration_minutes || s.durationMinutes || 0),
        subject: s.subject || '',
        topic: s.topic || '',
        notes: s.notes || '',
        createdAt: s.created_at || s.createdAt || ''
      }));

      const mappedPlans: StudyPlan[] = rawPlans.map((p: any) => ({
        id: p.id?.toString(),
        userId: p.user_id || currentUser.id,
        date: p.date || '',
        subject: p.subject || '',
        topic: p.topic || '',
        estimatedMinutes: Number(p.estimated_minutes || p.estimatedMinutes || 0),
        priority: p.priority || 'medium',
        completed: p.is_completed !== undefined ? p.is_completed : (p.completed || false),
        createdAt: p.created_at || p.createdAt || ''
      }));

      const mappedNotes: StudyNote[] = rawNotes.map((n: any) => ({
        id: n.id?.toString(),
        userId: n.user_id || currentUser.id,
        date: n.date || '',
        topicsCovered: n.topics_covered || n.topicsCovered || '',
        conceptsLearned: n.concepts_learned || n.conceptsLearned || '',
        importantPoints: n.important_points || n.importantPoints || '',
        revisionNotes: n.revision_notes || n.revisionNotes || '',
        personalRemarks: n.personal_remarks || n.personalRemarks || '',
        createdAt: n.created_at || n.createdAt || ''
      }));

      setSessions(mappedSessions);
      setPlans(mappedPlans);
      setNotes(mappedNotes);

      // Compute stats using client-side logic
      const computed = computeDashboardStats(mappedSessions, mappedPlans, goals);
      setStats(computed);

      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentStreak: computed.currentStreak,
          longestStreak: computed.longestStreak
        };
      });

      setBadges(calculateBadges(mappedSessions, computed.longestStreak, mappedPlans));

    } catch (err: any) {
      console.warn('Error reloading study telemetry, falling back to local:', err);
      setIsUsingFallback(true);
      loadFallbackTelemetry();
    } finally {
      setDataLoading(false);
    }
  };

  // REQUIREMENT: Handle Login Form submission using supabase.auth.signInWithPassword()
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email.trim() || !password.trim()) {
      setAuthError('Email and Password are required.');
      return;
    }

    setLoading(true);
    try {
      if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const savedAccountsStr = localStorage.getItem('fallback_accounts') || '{}';
        const savedAccounts = JSON.parse(savedAccountsStr);
        if (savedAccounts[email] && !savedAccounts[email].verified) {
          setAuthError("Your email address is not verified yet. Please verify your account first.");
          setToken(null);
          setUser(null);
          setShowOtpStep(true);
          return;
        }

        setToken('demo-token');
        setUser({
          id: 'demo-user-id',
          email: email,
          name: savedAccounts[email]?.name || email.split('@')[0],
          currentStreak: 0,
          longestStreak: 0,
          profilePicture: '🦉'
        });
        setActiveTab('dashboard');
        loadFallbackTelemetry();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (error) throw error;
      setActiveTab('dashboard');
    } catch (err: any) {
      // If it is a network error, offer fallback
      if (err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
        setIsUsingFallback(true);
        const savedAccountsStr = localStorage.getItem('fallback_accounts') || '{}';
        const savedAccounts = JSON.parse(savedAccountsStr);
        if (savedAccounts[email] && !savedAccounts[email].verified) {
          setAuthError("Your email address is not verified yet. Please verify your account first.");
          setToken(null);
          setUser(null);
          setShowOtpStep(true);
          return;
        }
        setToken('demo-token');
        setUser({
          id: 'demo-user-id',
          email: email,
          name: savedAccounts[email]?.name || email.split('@')[0],
          currentStreak: 0,
          longestStreak: 0,
          profilePicture: '🦉'
        });
        setActiveTab('dashboard');
        loadFallbackTelemetry();
      } else {
        setAuthError(err.message || 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // REQUIREMENT: Handle Registration Form submission with signUp() and save Full Name inside user metadata options
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authName.trim() || !email.trim() || !password.trim()) {
      setAuthError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const savedAccountsStr = localStorage.getItem('fallback_accounts') || '{}';
        const savedAccounts = JSON.parse(savedAccountsStr);
        
        // If the email is already registered and unverified, mimic the "already registered" behavior
        if (savedAccounts[email]) {
          if (!savedAccounts[email].verified) {
            alert("This account is awaiting verification. Sending a new code now...");
            setToken(null);
            setUser(null);
            setShowOtpStep(true);
            return;
          } else {
            setAuthError("An account with this email already exists.");
            return;
          }
        }
        
        // Save new unverified simulated account
        savedAccounts[email] = {
          name: authName,
          password: password,
          verified: false
        };
        localStorage.setItem('fallback_accounts', JSON.stringify(savedAccounts));

        setToken(null);
        setUser(null);
        setShowOtpStep(true);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: authName
          }
        }
      });
      if (error) throw error;
      
      // Ensure that if the email is not yet confirmed, we explicitly clear any local session states
      if (data.user && !data.user.email_confirmed_at) {
        setToken(null);
        setUser(null);
      }
      setShowOtpStep(true);
    } catch (err: any) {
      const errMsg = err.message?.toLowerCase() || '';
      if (err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
        setIsUsingFallback(true);
        setToken(null);
        setUser(null);
        setShowOtpStep(true);
      } else if (errMsg.includes('already registered') || errMsg.includes('already exists') || errMsg.includes('already been registered')) {
        try {
          alert("This account is awaiting verification. Sending a new code now...");
          await supabase.auth.resend({
            type: 'signup',
            email: email,
          });
          setToken(null);
          setUser(null);
          setShowOtpStep(true);
        } catch (resendErr: any) {
          setAuthError(`This account is awaiting verification, but we couldn't send a new code: ${resendErr.message}`);
        }
      } else {
        setAuthError(err.message || 'Error registering account.');
      }
    } finally {
      setLoading(false);
    }
  };

  // REQUIREMENT: Handle OTP submission using supabase.auth.verifyOtp()
  const handleVerifyRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!otpToken.trim() || otpToken.trim().length !== 6) {
      setAuthError('Please enter a valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const savedAccountsStr = localStorage.getItem('fallback_accounts') || '{}';
        const savedAccounts = JSON.parse(savedAccountsStr);
        if (savedAccounts[email]) {
          savedAccounts[email].verified = true;
          localStorage.setItem('fallback_accounts', JSON.stringify(savedAccounts));
        } else {
          // If it somehow doesn't exist, create it as verified now
          savedAccounts[email] = {
            name: authName || email.split('@')[0],
            password: password,
            verified: true
          };
          localStorage.setItem('fallback_accounts', JSON.stringify(savedAccounts));
        }

        setToken('demo-token');
        setUser({
          id: 'demo-user-id',
          email: email,
          name: savedAccounts[email]?.name || authName || email.split('@')[0],
          currentStreak: 0,
          longestStreak: 0,
          profilePicture: '🦉'
        });
        setActiveTab('dashboard');
        loadFallbackTelemetry();
        setShowOtpStep(false);
        setOtpToken('');
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otpToken,
        type: 'signup'
      });
      if (error) throw error;

      if (data.session) {
        setToken(data.session.access_token);
        const name = data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || authName || 'Student';
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
          name: name,
          currentStreak: 0,
          longestStreak: 0,
          profilePicture: '🦉'
        });
        setActiveTab('dashboard');
        setShowOtpStep(false);
        setOtpToken('');
      } else {
        throw new Error('Verification succeeded but no session was returned. Please try logging in.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // REQUIREMENT: Handle Logout using supabase.auth.signOut() and redirect to login
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setToken(null);
    setUser(null);
    setSessions([]);
    setPlans([]);
    setNotes([]);
    setStats(null);
    setEmail('');
    setPassword('');
    setAuthName('');
    setAuthError('');
    setShowOtpStep(false);
    setOtpToken('');
  };

  // STUDY SESSIONS CRUD with automatic duration_minutes calculation
  const handleAddSession = async (sess: any) => {
    if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
      const calculatedMins = calculateDuration(sess.startTime, sess.endTime);
      const newSess: StudySession = {
        id: Date.now().toString(),
        userId: user?.id || 'fallback-user-id',
        date: sess.date,
        startTime: sess.startTime,
        endTime: sess.endTime,
        durationMinutes: calculatedMins,
        subject: sess.subject,
        topic: sess.topic,
        notes: sess.notes,
        createdAt: new Date().toISOString()
      };
      const updated = [newSess, ...sessions];
      localStorage.setItem('fallback_study_sessions', JSON.stringify(updated));
      setSessions(updated);
      const computed = computeDashboardStats(updated, plans, goals);
      setStats(computed);
      setBadges(calculateBadges(updated, computed.longestStreak, plans));
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    // Automatically calculate duration_minutes by subtracting Start Time from End Time
    const calculatedMins = calculateDuration(sess.startTime, sess.endTime);

    const { error } = await supabase
      .from('study_sessions')
      .insert([{
        user_id: currentUser.id,
        session_date: sess.date,
        start_time: sess.startTime,
        end_time: sess.endTime,
        duration_minutes: calculatedMins,
        subject: sess.subject,
        topic: sess.topic,
        notes: sess.notes
      }]);

    if (error) throw error;
    await loadAllTelemetry();
  };

  const handleEditSession = async (id: string, sess: any) => {
    if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
      const calculatedMins = calculateDuration(sess.startTime, sess.endTime);
      const updated = sessions.map(s => s.id === id ? {
        ...s,
        date: sess.date,
        startTime: sess.startTime,
        endTime: sess.endTime,
        durationMinutes: calculatedMins,
        subject: sess.subject,
        topic: sess.topic,
        notes: sess.notes
      } : s);
      localStorage.setItem('fallback_study_sessions', JSON.stringify(updated));
      setSessions(updated);
      const computed = computeDashboardStats(updated, plans, goals);
      setStats(computed);
      setBadges(calculateBadges(updated, computed.longestStreak, plans));
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const calculatedMins = calculateDuration(sess.startTime, sess.endTime);

    const { error } = await supabase
      .from('study_sessions')
      .update({
        session_date: sess.date,
        start_time: sess.startTime,
        end_time: sess.endTime,
        duration_minutes: calculatedMins,
        subject: sess.subject,
        topic: sess.topic,
        notes: sess.notes
      })
      .eq('id', id)
      .eq('user_id', currentUser.id);

    if (error) throw error;
    await loadAllTelemetry();
  };

  const handleDeleteSession = async (id: string) => {
    if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
      const updated = sessions.filter(s => s.id !== id);
      localStorage.setItem('fallback_study_sessions', JSON.stringify(updated));
      setSessions(updated);
      const computed = computeDashboardStats(updated, plans, goals);
      setStats(computed);
      setBadges(calculateBadges(updated, computed.longestStreak, plans));
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);

    if (error) throw error;
    await loadAllTelemetry();
  };

  // DAILY REVISION NOTES CRUD
  const handleSaveNote = async (note: any) => {
    if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
      const existingIdx = notes.findIndex(n => n.date === note.date);
      let updated: StudyNote[];
      if (existingIdx > -1) {
        updated = notes.map((n, i) => i === existingIdx ? {
          ...n,
          topicsCovered: note.topicsCovered || '',
          conceptsLearned: note.conceptsLearned || '',
          importantPoints: note.importantPoints || '',
          revisionNotes: note.revisionNotes || '',
          personalRemarks: note.personalRemarks || ''
        } : n);
      } else {
        const newNote: StudyNote = {
          id: Date.now().toString(),
          userId: user?.id || 'fallback-user-id',
          date: note.date,
          topicsCovered: note.topicsCovered || '',
          conceptsLearned: note.conceptsLearned || '',
          importantPoints: note.importantPoints || '',
          revisionNotes: note.revisionNotes || '',
          personalRemarks: note.personalRemarks || '',
          createdAt: new Date().toISOString()
        };
        updated = [newNote, ...notes];
      }
      localStorage.setItem('fallback_study_notes', JSON.stringify(updated));
      setNotes(updated);
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { data: existing } = await supabase
      .from('study_notes')
      .select('id')
      .eq('date', note.date)
      .eq('user_id', currentUser.id)
      .maybeSingle();

    const payload = {
      user_id: currentUser.id,
      date: note.date,
      topics_covered: note.topicsCovered || '',
      concepts_learned: note.conceptsLearned || '',
      important_points: note.importantPoints || '',
      revision_notes: note.revisionNotes || '',
      personal_remarks: note.personalRemarks || ''
    };

    if (existing?.id) {
      const { error } = await supabase
        .from('study_notes')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('study_notes')
        .insert([payload]);
      if (error) throw error;
    }

    await loadAllTelemetry();
  };

  // STUDY PLANNER CRUD & Toggles with Instant UI Update
  const handleCreatePlan = async (plan: any) => {
    if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
      const newPlan: StudyPlan = {
        id: Date.now().toString(),
        userId: user?.id || 'fallback-user-id',
        date: plan.date,
        subject: plan.subject,
        topic: plan.topic,
        estimatedMinutes: Number(plan.estimatedMinutes),
        priority: plan.priority,
        completed: false,
        createdAt: new Date().toISOString()
      };
      const updated = [...plans, newPlan];
      localStorage.setItem('fallback_study_plans', JSON.stringify(updated));
      setPlans(updated);
      const computed = computeDashboardStats(sessions, updated, goals);
      setStats(computed);
      setBadges(calculateBadges(sessions, computed.longestStreak, updated));
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { error } = await supabase
      .from('study_plans')
      .insert([{
        user_id: currentUser.id,
        date: plan.date,
        subject: plan.subject,
        topic: plan.topic,
        estimated_minutes: Number(plan.estimatedMinutes),
        priority: plan.priority,
        is_completed: false
      }]);

    if (error) throw error;
    await loadAllTelemetry();
  };

  const handleUpdatePlan = async (id: string, plan: any) => {
    if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
      const updated = plans.map(p => p.id === id ? {
        ...p,
        ...(plan.date !== undefined && { date: plan.date }),
        ...(plan.subject !== undefined && { subject: plan.subject }),
        ...(plan.topic !== undefined && { topic: plan.topic }),
        ...(plan.estimatedMinutes !== undefined && { estimatedMinutes: Number(plan.estimatedMinutes) }),
        ...(plan.priority !== undefined && { priority: plan.priority }),
        ...(plan.completed !== undefined && { completed: plan.completed })
      } : p);
      localStorage.setItem('fallback_study_plans', JSON.stringify(updated));
      setPlans(updated);
      const computed = computeDashboardStats(sessions, updated, goals);
      setStats(computed);
      setBadges(calculateBadges(sessions, computed.longestStreak, updated));
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    // REQUIREMENT: Provide a feature to toggle a plan's status (is_completed) with an instant UI update
    const isToggleAction = plan.completed !== undefined;

    if (isToggleAction) {
      // Instant Local UI Update
      setPlans(prev =>
        prev.map(p => (p.id === id ? { ...p, completed: plan.completed } : p))
      );
    }

    try {
      const updatePayload: any = {};
      if (plan.date !== undefined) updatePayload.date = plan.date;
      if (plan.subject !== undefined) updatePayload.subject = plan.subject;
      if (plan.topic !== undefined) updatePayload.topic = plan.topic;
      if (plan.estimatedMinutes !== undefined) updatePayload.estimated_minutes = Number(plan.estimatedMinutes);
      if (plan.priority !== undefined) updatePayload.priority = plan.priority;
      if (plan.completed !== undefined) updatePayload.is_completed = plan.completed;

      const { error } = await supabase
        .from('study_plans')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      await loadAllTelemetry();
    } catch (err) {
      console.error('Failed to update plan:', err);
      if (isToggleAction) {
        // Rollback on failure
        setPlans(prev =>
          prev.map(p => (p.id === id ? { ...p, completed: !plan.completed } : p))
        );
      }
      throw err;
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (isUsingFallback || SUPABASE_URL.includes('placeholder-project')) {
      const updated = plans.filter(p => p.id !== id);
      localStorage.setItem('fallback_study_plans', JSON.stringify(updated));
      setPlans(updated);
      const computed = computeDashboardStats(sessions, updated, goals);
      setStats(computed);
      setBadges(calculateBadges(sessions, computed.longestStreak, updated));
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const { error } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);

    if (error) throw error;
    await loadAllTelemetry();
  };

  // Quick navigation link from Calendar date details panel
  const handleSelectDateTab = (date: string, tabName: string) => {
    setPreselectedDateForNotes(date);
    setActiveTab(tabName);
  };

  // Navigation Items list
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stats', label: 'Statistics', icon: BarChart2 },
    { id: 'sessions', label: 'Study Sessions', icon: Clock },
    { id: 'planner', label: 'Study Planner', icon: BookMarked },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'notes', label: 'Daily Notes', icon: BookOpen },
    { id: 'badges', label: 'Achievements', icon: Award },
    { id: 'profile', label: 'Settings', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F7] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F9F9F7] flex flex-col font-sans transition-all duration-200">
      
      {/* 1. AUTHENTICATION PAGES (LANDING / LOGIN) */}
      {!token || !user || showOtpStep ? (
        <div className="flex-1 flex flex-col md:flex-row min-h-screen">
          {/* Brand Left Column */}
          <div className="flex-1 bg-[#141414] text-[#F9F9F7] p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-[#FF6B35]/20 rounded-full blur-3xl opacity-40"></div>
            
            {/* Branding logo */}
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center shadow-md">
                <Flame className="w-6 h-6 text-black fill-black" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight uppercase text-white">StudyStreak</span>
            </div>

            <div className="max-w-md space-y-4 md:space-y-6 z-10 my-auto py-12 md:py-0">
              <h1 className="font-display text-4xl md:text-5xl font-light text-white leading-none">
                Academic <span className="italic font-serif text-[#FF6B35]">Consistency</span>.
              </h1>
              <p className="text-stone-400 text-sm md:text-base leading-relaxed">
                Log sessions, visualize your habit calendar heatmaps, schedule priority plans, earn milestones, and boost your daily learning efficiency.
              </p>

              <div className="flex items-center space-x-3 text-xs md:text-sm font-semibold bg-[#2A2A2A] p-4 rounded-2xl border border-[#3A3A3A] w-max">
                <Zap className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <span>Join thousands of learners tracking consistency today!</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium pt-6 border-t border-[#2A2A2A]">
              <span>© {new Date().getFullYear()} StudyStreak App</span>
              <span>Premium Learning Productivity</span>
            </div>
          </div>

          {/* Form Right Column */}
          <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-16 bg-[#F9F9F7] dark:bg-[#141414] relative">
            
            {/* Theme switcher on auth page */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="absolute right-6 top-6 p-2 rounded-xl bg-white hover:bg-stone-100 dark:bg-[#2A2A2A] dark:hover:bg-[#3A3A3A] text-stone-500 dark:text-stone-400 border border-[#E5E5E5] dark:border-[#2A2A2A] transition-all cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="w-full max-w-sm space-y-6">
              {showOtpStep ? (
                <>
                  <div className="text-center space-y-1">
                    <h2 className="font-display text-2xl font-black text-stone-900 dark:text-stone-50">
                      Verify Your Email
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      We sent a 6-digit verification code to <strong>{email}</strong>. Enter it below to activate your account.
                    </p>
                  </div>

                  {/* Error messages */}
                  {authError && (
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs md:text-sm">
                      {authError}
                    </div>
                  )}

                  {/* OTP Submission Form */}
                  <form onSubmit={handleVerifyRegistration} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-600 dark:text-stone-400">6-Digit OTP Code</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-stone-400" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="000000"
                          value={otpToken}
                          onChange={e => setOtpToken(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100 tracking-[0.5em] font-mono font-bold text-center text-lg"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white font-semibold transition-colors shadow-sm disabled:opacity-50 text-sm pt-3 cursor-pointer"
                    >
                      {loading ? 'Verifying...' : 'Verify Account'}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await supabase.auth.signOut();
                        } catch (err) {
                          console.warn('Sign out during cancel failed:', err);
                        }
                        setToken(null);
                        setUser(null);
                        setShowOtpStep(false);
                        setOtpToken('');
                        setAuthError('');
                        setIsLogin(true);
                      }}
                      className="w-full text-center py-2 text-xs font-semibold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors cursor-pointer"
                    >
                      Cancel and Back to Sign In
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="text-center space-y-1">
                    <h2 className="font-display text-2xl font-black text-stone-900 dark:text-stone-50">
                      {isLogin ? 'Welcome Back!' : 'Create Your Account'}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {isLogin 
                        ? 'Enter your student credentials to log in.' 
                        : 'Get started by configuring your profile.'}
                    </p>
                  </div>

                  {/* Error messages */}
                  {authError && (
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs md:text-sm">
                      {authError}
                    </div>
                  )}

                  {/* Auth Forms */}
                  <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
                    {!isLogin && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-600 dark:text-stone-400">Full Name</label>
                        <div className="relative">
                          <UserPlus className="absolute left-3.5 top-3 w-4.5 h-4.5 text-stone-400" />
                          <input
                            type="text"
                            required
                            placeholder="John Doe"
                            value={authName}
                            onChange={e => setAuthName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-600 dark:text-stone-400">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-stone-400" />
                        <input
                          type="email"
                          required
                          placeholder="student@example.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-600 dark:text-stone-400">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-stone-400" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white font-semibold transition-colors shadow-sm disabled:opacity-50 text-sm pt-3 cursor-pointer"
                    >
                      {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Create Account'}
                    </button>
                  </form>

                  {/* Toggle Mode */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setAuthError('');
                      }}
                      className="text-xs font-semibold text-stone-600 hover:text-[#FF6B35] dark:text-stone-400 dark:hover:text-[#FF6B35] transition-colors cursor-pointer"
                    >
                      {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 2. AUTHENTICATED CORE DASHBOARD LAYOUT */
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* Navigation Sidebar Drawer */}
          <aside className="w-full md:w-64 bg-[#141414] border-b md:border-b-0 md:border-r border-[#2A2A2A] flex flex-col justify-between p-6 shrink-0 md:h-screen sticky top-0 z-30 text-white">
            <div className="space-y-8">
              
              {/* Sidebar Header Brand */}
              <div className="flex items-center justify-between pb-4 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center font-bold text-black shrink-0">
                    <Flame className="w-5 h-5 text-black fill-black" />
                  </div>
                  <span className="font-display font-semibold tracking-tight uppercase text-lg text-white select-none">StudyStreak</span>
                </div>

                {/* Quick stats label */}
                <div className="flex items-center space-x-1 text-xs font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-2.5 py-1 rounded-lg border border-[#FF6B35]/20">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{user.currentStreak}d</span>
                </div>
              </div>

              {/* Sidebar Tabs list */}
              <nav className="space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1.5 scrollbar-none pb-2 md:pb-0">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (item.id !== 'notes') setPreselectedDateForNotes(undefined);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap w-full ${
                        isActive
                          ? 'bg-[#2A2A2A] text-white font-semibold'
                          : 'text-white/50 hover:bg-[#2A2A2A] hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#FF6B35]' : 'text-white/50'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar User Info & Logout Footer */}
            <div className="hidden md:flex flex-col space-y-4 pt-6 border-t border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#333] border border-[#444] flex items-center justify-center text-lg shadow-inner shrink-0">
                    <span>{user.profilePicture || '🦉'}</span>
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-white truncate max-w-[100px]">{user.name}</h4>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Pro Member</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-lg text-white/50 hover:text-[#FF6B35] hover:bg-[#2A2A2A] transition-all cursor-pointer"
                  title="Toggle Light/Dark Theme"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl border border-[#2A2A2A] hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/40 text-xs font-semibold text-white/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main workspace frame */}
          <main className="flex-1 flex flex-col min-h-0 md:h-screen overflow-y-auto">
            
            {/* Topbar headers for mobile and alerts */}
            <header className="md:hidden px-4 py-3 bg-[#141414] border-b border-[#2A2A2A] text-white flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center space-x-2">
                <span className="font-display font-semibold tracking-tight text-base text-white">{user.name}</span>
                <span className="text-xs font-mono text-[#FF6B35] font-bold bg-[#FF6B35]/10 px-2 py-0.5 rounded-lg border border-[#FF6B35]/25">
                  🔥 {user.currentStreak}d
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-xl text-white/50"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-white/50 hover:text-red-500"
                  title="Log out"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </header>
            
            {isUsingFallback && (
              <div className="bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 px-4 md:px-10 py-3 text-amber-700 dark:text-amber-400 text-xs md:text-sm font-medium flex items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                  <span>
                    <strong>Database Demo Mode Active:</strong> Connecting to Supabase failed or placeholder credentials are in use. Changes are saved locally to your browser. Configure <code>VITE_SUPABASE_URL</code> in your environment for a real database.
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setIsUsingFallback(false);
                    loadAllTelemetry();
                  }}
                  className="shrink-0 text-amber-600 dark:text-amber-400 hover:underline text-xs font-semibold"
                >
                  Retry Live Db
                </button>
              </div>
            )}

            {/* Views Container */}
            <div className="p-4 md:p-10 max-w-7xl w-full mx-auto flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'dashboard' && (
                    <DashboardView
                      stats={stats}
                      loading={dataLoading}
                      onNavigate={setActiveTab}
                      isDarkMode={isDarkMode}
                    />
                  )}

                  {activeTab === 'stats' && (
                    <StatsView
                      stats={stats}
                      loading={dataLoading}
                      isDarkMode={isDarkMode}
                    />
                  )}

                  {activeTab === 'sessions' && (
                    <SessionsView
                      sessions={sessions}
                      onAddSession={handleAddSession}
                      onEditSession={handleEditSession}
                      onDeleteSession={handleDeleteSession}
                    />
                  )}

                  {activeTab === 'planner' && (
                    <PlannerView
                      plans={plans}
                      onCreatePlan={handleCreatePlan}
                      onUpdatePlan={handleUpdatePlan}
                      onDeletePlan={handleDeletePlan}
                    />
                  )}

                  {activeTab === 'calendar' && (
                    <CalendarView
                      sessions={sessions}
                      plans={plans}
                      notes={notes}
                      onSelectDateTab={handleSelectDateTab}
                    />
                  )}

                  {activeTab === 'notes' && (
                    <DailyNotesView
                      notes={notes}
                      onSaveNote={handleSaveNote}
                      preselectedDate={preselectedDateForNotes}
                    />
                  )}

                  {activeTab === 'badges' && (
                    <BadgesView
                      badges={badges}
                      loading={dataLoading}
                    />
                  )}

                  {activeTab === 'profile' && (
                    <ProfileView
                      user={user}
                      goals={goals}
                      reminders={reminders}
                      badges={badges}
                      onUpdateUser={setUser}
                      onUpdateGoals={setGoals}
                      onUpdateReminders={setReminders}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
