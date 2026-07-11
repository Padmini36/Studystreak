import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Clock,
  Calendar as CalendarIcon,
  Award,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Sparkles,
  Zap,
  Activity,
  History
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

interface DashboardViewProps {
  stats: any;
  loading: boolean;
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
}

const MOTIVATIONAL_MESSAGES = [
  { text: "Consistency is more important than perfection. Every minute counts!", author: "StudyStreak" },
  { text: "You don't have to be extreme, just consistent. Don't break your streak!", author: "StudyStreak" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Your future self will thank you for the effort you put in today.", author: "Anonymous" },
  { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
  { text: "Focus on the process, not just the outcome. You are building a great habit!", author: "StudyStreak" }
];

export default function DashboardView({ stats, loading, onNavigate, isDarkMode }: DashboardViewProps) {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length));

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-stone-500 font-medium font-display">Assembling your study dashboard...</p>
      </div>
    );
  }

  const currentQuote = MOTIVATIONAL_MESSAGES[quoteIndex];

  // Helper to format minutes to Hours and Minutes
  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const streakLevel = stats.currentStreak;
  let motivationText = "Keep Going!";
  if (streakLevel >= 7) motivationText = "Amazing Consistency!";
  else if (streakLevel >= 3) motivationText = "You're Building a Great Habit!";
  else if (streakLevel > 0) motivationText = "Don't Break Your Streak!";

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome & Streak Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Card */}
        <div className="lg:col-span-2 p-8 rounded-[32px] bg-[#141414] text-white border border-[#2A2A2A] shadow-md relative overflow-hidden flex flex-col justify-between min-h-[190px]">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-44 h-44 bg-[#FF6B35]/20 rounded-full blur-3xl opacity-60"></div>
          <div className="z-10">
            <div className="flex items-center space-x-2 bg-white/10 text-stone-300 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold w-max mb-5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
              <span>Daily Motivation</span>
            </div>
            <p className="text-lg md:text-xl font-light leading-relaxed">
              "{currentQuote.text}"
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between z-10 pt-4 border-t border-white/5">
            <span className="text-xs text-[#FF6B35] font-mono font-medium">— {currentQuote.author}</span>
            <button 
              onClick={() => setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length)}
              className="text-xs text-stone-400 hover:text-white underline font-medium focus:outline-none transition-colors cursor-pointer"
            >
              Next Quote
            </button>
          </div>
        </div>

        {/* Streak Highlight Card - Special Bento Card Background */}
        <div className="p-8 rounded-[32px] border bg-[#E9EAE3] dark:bg-[#1C1E18] border-[#D5D6CC] dark:border-[#2F3227] text-stone-900 dark:text-[#E9EAE3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-stone-600 dark:text-[#E9EAE3]/70 text-sm font-medium tracking-wide uppercase font-mono text-[11px]">Current Streak</p>
              <h3 className="font-display text-5xl font-black mt-2 text-stone-900 dark:text-white">
                {stats.currentStreak} <span className="text-xl font-normal text-stone-500 dark:text-[#E9EAE3]/50">days</span>
              </h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#FF6B35]/15 flex items-center justify-center border border-[#FF6B35]/25">
              <Flame className="w-8 h-8 text-[#FF6B35] fill-[#FF6B35]" />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[#D5D6CC]/50 dark:border-[#2F3227]/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-sm font-semibold text-stone-850 dark:text-[#E9EAE3]">{motivationText}</span>
            </div>
            <span className="text-xs text-stone-500 dark:text-[#E9EAE3]/60 font-mono">Longest: {stats.longestStreak}d</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Statistics Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="p-6 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm hover:border-[#FF6B35]/35 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 dark:text-stone-400 text-xs md:text-sm font-medium">Today's Time</span>
            <Clock className="w-4.5 h-4.5 text-[#FF6B35]" />
          </div>
          <p className="font-display text-xl md:text-2xl font-bold mt-2 text-stone-900 dark:text-stone-50">
            {formatMins(stats.todayMinutes)}
          </p>
        </div>

        <div className="p-6 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm hover:border-[#FF6B35]/35 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 dark:text-stone-400 text-xs md:text-sm font-medium">Total Hours</span>
            <TrendingUp className="w-4.5 h-4.5 text-[#FF6B35]" />
          </div>
          <p className="font-display text-xl md:text-2xl font-bold mt-2 text-stone-900 dark:text-stone-50">
            {stats.totalHours} <span className="text-sm font-normal text-stone-400">hours</span>
          </p>
        </div>

        <div className="p-6 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm hover:border-[#FF6B35]/35 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 dark:text-stone-400 text-xs md:text-sm font-medium">Sessions Logged</span>
            <Activity className="w-4.5 h-4.5 text-[#FF6B35]" />
          </div>
          <p className="font-display text-xl md:text-2xl font-bold mt-2 text-stone-900 dark:text-stone-50">
            {stats.totalSessions} <span className="text-sm font-normal text-stone-400">sessions</span>
          </p>
        </div>

        <div className="p-6 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm hover:border-[#FF6B35]/35 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 dark:text-stone-400 text-xs md:text-sm font-medium">Study Plans</span>
            <CheckCircle className="w-4.5 h-4.5 text-[#FF6B35]" />
          </div>
          <p className="font-display text-xl md:text-2xl font-bold mt-2 text-stone-900 dark:text-stone-50">
            {stats.completedPlans} <span className="text-xs text-stone-400 font-normal">done</span>
            <span className="text-sm text-stone-400 mx-1">/</span>
            <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">{stats.pendingPlans} pending</span>
          </p>
        </div>
      </div>

      {/* Goal Tracking Progress Bars */}
      <div className="p-8 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm space-y-6">
        <h3 className="text-lg font-light flex items-center space-x-2">
          <Award className="w-5 h-5 text-[#FF6B35]" />
          <span className="font-display font-medium">Study Goal <span className="italic font-serif text-[#FF6B35]">Progress</span></span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Goal */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-stone-600 dark:text-stone-300 font-medium">Daily Goal ({stats.goals.dailyHours} hours)</span>
              <span className="text-[#FF6B35] font-bold">{stats.dailyGoalProgress}%</span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden border border-stone-200/50 dark:border-stone-700/50">
              <div 
                className="bg-[#FF6B35] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(stats.dailyGoalProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-mono">
              Completed {formatMins(stats.todayMinutes)} today
            </p>
          </div>

          {/* Weekly Goal */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-stone-600 dark:text-stone-300 font-medium">Weekly Goal ({stats.goals.weeklyHours} hours)</span>
              <span className="text-[#FF6B35] font-bold">{stats.weeklyGoalProgress}%</span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden border border-stone-200/50 dark:border-stone-700/50">
              <div 
                className="bg-[#FF6B35] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(stats.weeklyGoalProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-mono">
              Completed {stats.weeklyHours}h this week
            </p>
          </div>

          {/* Monthly Goal */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-stone-600 dark:text-stone-300 font-medium">Monthly Goal ({stats.goals.monthlyHours} hours)</span>
              <span className="text-[#FF6B35] font-bold">{stats.monthlyGoalProgress}%</span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden border border-stone-200/50 dark:border-stone-700/50">
              <div 
                className="bg-[#FF6B35] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(stats.monthlyGoalProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-mono">
              Completed {stats.monthlyHours}h this month
            </p>
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Study Hours Area Chart */}
        <div className="lg:col-span-2 p-6 md:p-8 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-light flex items-center space-x-2">
              <History className="w-4.5 h-4.5 text-[#FF6B35]" />
              <span className="font-display font-medium">Daily Study Time <span className="italic font-serif text-[#FF6B35]">(Last 7 Days)</span></span>
            </h3>
            <span className="text-xs text-stone-400 font-mono">Hours</span>
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.history7Days} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#2d2d2d' : '#e5e5e5'} />
                <XAxis dataKey="dayName" stroke={isDarkMode ? '#888888' : '#666666'} tickLine={false} fontSize={11} fontStyle="font-mono" />
                <YAxis stroke={isDarkMode ? '#888888' : '#666666'} tickLine={false} axisLine={false} fontSize={11} fontStyle="font-mono" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', 
                    borderColor: isDarkMode ? '#2d2d2d' : '#e5e5e5',
                    color: isDarkMode ? '#fafaf9' : '#1a1a1a',
                    borderRadius: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="hours" name="Hours" stroke="#FF6B35" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly & Monthly Breakdown Sidebar */}
        <div className="p-6 md:p-8 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm flex flex-col justify-between space-y-6">
          {/* Weekly progress bar chart */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest font-mono">Weekly consistency</h4>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.history4Weeks} margin={{ left: -30, right: 5, top: 10, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} stroke="#a8a29e" />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#a8a29e" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', 
                      borderColor: isDarkMode ? '#2d2d2d' : '#e5e5e5',
                      color: isDarkMode ? '#fafaf9' : '#1a1a1a',
                      borderRadius: '12px'
                    }} 
                  />
                  <Bar dataKey="hours" name="Hours" fill="#FF6B35" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Action Navigation links */}
          <div className="pt-5 border-t border-stone-200 dark:border-stone-800/60 space-y-3">
            <h4 className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-widest font-mono">Plan Your Day</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigate('sessions')}
                className="px-3.5 py-2.5 text-xs font-semibold text-center bg-[#F1F1EF] hover:bg-[#E5E5E3] dark:bg-[#2A2A2A] dark:hover:bg-[#3A3A3A] text-stone-800 dark:text-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Log Session
              </button>
              <button
                onClick={() => onNavigate('planner')}
                className="px-3.5 py-2.5 text-xs font-semibold text-center bg-[#FF6B35] hover:bg-[#e0592b] text-white rounded-xl transition-colors cursor-pointer"
              >
                View Planner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
