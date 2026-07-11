import React from 'react';
import {
  TrendingUp,
  Activity,
  Award,
  Clock,
  Calendar,
  CheckCircle,
  HelpCircle,
  BarChart2
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

interface StatsViewProps {
  stats: any;
  loading: boolean;
  isDarkMode: boolean;
}

export default function StatsView({ stats, loading, isDarkMode }: StatsViewProps) {
  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-stone-500 font-medium font-display">Analyzing study statistics...</p>
      </div>
    );
  }

  // Calculate some insights on client side if needed
  const completionRatio = Math.round((stats.completedPlans / (stats.completedPlans + stats.pendingPlans || 1)) * 100) || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-[#2A2A2A] pb-5">
        <h2 className="text-2xl font-light text-stone-900 dark:text-stone-50">
          Study <span className="italic font-serif text-[#FF6B35]">Insights & Analytics</span>
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 font-display">In-depth statistical reports on your study routines and planning metrics</p>
      </div>

      {/* Grid: Analytic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="p-6 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm hover:border-[#FF6B35]/35 transition-all">
          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 font-mono">Avg. Daily Time</span>
          <p className="text-base md:text-lg font-bold text-stone-850 dark:text-stone-100 mt-2 flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-[#FF6B35]" />
            <span>{stats.averageDailyStudyTimeHours} hours</span>
          </p>
        </div>

        <div className="p-6 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm hover:border-[#FF6B35]/35 transition-all">
          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 font-mono">Productive Day</span>
          <p className="text-base md:text-lg font-bold text-stone-850 dark:text-stone-100 mt-2 flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-[#FF6B35]" />
            <span>{stats.mostProductiveDay}</span>
          </p>
        </div>

        <div className="p-6 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm hover:border-[#FF6B35]/35 transition-all">
          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 font-mono">Longest Streak</span>
          <p className="text-base md:text-lg font-bold text-stone-850 dark:text-stone-100 mt-2 flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-[#FF6B35]" />
            <span>{stats.longestStreak} days</span>
          </p>
        </div>

        <div className="p-6 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm hover:border-[#FF6B35]/35 transition-all">
          <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 font-mono">Success Ratio</span>
          <p className="text-base md:text-lg font-bold text-stone-850 dark:text-stone-100 mt-2 flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5 text-[#FF6B35]" />
            <span>{completionRatio}% Done</span>
          </p>
        </div>
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Daily Study Hours Area Chart */}
        <div className="p-6 md:p-8 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm space-y-4">
          <h3 className="text-base font-light flex items-center space-x-2">
            <BarChart2 className="w-4.5 h-4.5 text-[#FF6B35]" />
            <span className="font-display font-medium">Daily Study Patterns <span className="italic font-serif text-[#FF6B35]">(Last 7 Days)</span></span>
          </h3>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.history7Days} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHoursArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#2d2d2d' : '#e5e5e5'} />
                <XAxis dataKey="dayName" fontSize={11} tickLine={false} stroke="#878684" />
                <YAxis fontSize={11} axisLine={false} tickLine={false} stroke="#878684" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', 
                    borderColor: isDarkMode ? '#2d2d2d' : '#e5e5e5',
                    color: isDarkMode ? '#fafaf9' : '#1a1a1a',
                    borderRadius: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="hours" name="Study Hours" stroke="#FF6B35" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHoursArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Weekly Consistency Bar Chart */}
        <div className="p-6 md:p-8 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm space-y-4">
          <h3 className="text-base font-light flex items-center space-x-2">
            <TrendingUp className="w-4.5 h-4.5 text-[#FF6B35]" />
            <span className="font-display font-medium">Weekly Study Hours <span className="italic font-serif text-[#FF6B35]">(Last 4 Weeks)</span></span>
          </h3>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.history4Weeks} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#2d2d2d' : '#e5e5e5'} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} stroke="#878684" />
                <YAxis fontSize={11} axisLine={false} tickLine={false} stroke="#878684" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', 
                    borderColor: isDarkMode ? '#2d2d2d' : '#e5e5e5',
                    color: isDarkMode ? '#fafaf9' : '#1a1a1a',
                    borderRadius: '12px'
                  }} 
                />
                <Bar dataKey="hours" name="Study Hours" fill="#FF6B35" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Monthly Trends Line Chart */}
        <div className="p-6 md:p-8 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-base font-light flex items-center space-x-2">
            <Activity className="w-4.5 h-4.5 text-[#FF6B35]" />
            <span className="font-display font-medium">Monthly Study History <span className="italic font-serif text-[#FF6B35]">(Last 6 Months)</span></span>
          </h3>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.history6Months} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#2d2d2d' : '#e5e5e5'} />
                <XAxis dataKey="monthName" fontSize={11} tickLine={false} stroke="#878684" />
                <YAxis fontSize={11} axisLine={false} tickLine={false} stroke="#878684" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', 
                    borderColor: isDarkMode ? '#2d2d2d' : '#e5e5e5',
                    color: isDarkMode ? '#fafaf9' : '#1a1a1a',
                    borderRadius: '12px'
                  }} 
                />
                <Line type="monotone" dataKey="hours" name="Study Hours" stroke="#FF6B35" strokeWidth={3} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
