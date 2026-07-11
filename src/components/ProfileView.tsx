import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Target,
  Bell,
  Sparkles,
  Award,
  Clock,
  Activity,
  CheckCircle,
  Camera,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../utils/supabase';

interface ProfileViewProps {
  user: any;
  goals: any;
  reminders: any;
  badges: any[];
  onUpdateUser: (updatedUser: any) => void;
  onUpdateGoals: (updatedGoals: any) => void;
  onUpdateReminders: (updatedReminders: any) => void;
}

// 6 Preset Beautiful Study Avatars (SVG/Emoji illustrations represented as text or SVG)
const PRESET_AVATARS = [
  '📚', '🎓', '🦉', '💻', '☕', '🧠', '✍️', '🔬', '🚀', '🌟'
];

export default function ProfileView({
  user,
  goals,
  reminders,
  badges,
  onUpdateUser,
  onUpdateGoals,
  onUpdateReminders
}: ProfileViewProps) {
  // Tabs within settings page
  const [activeSection, setActiveSection] = useState<'profile' | 'goals' | 'reminders'>('profile');

  // Edit Profile States
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(user.profilePicture || '🦉');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Goals States
  const [dailyHours, setDailyHours] = useState(goals.dailyHours);
  const [weeklyHours, setWeeklyHours] = useState(goals.weeklyHours);
  const [monthlyHours, setMonthlyHours] = useState(goals.monthlyHours);
  const [goalsMsg, setGoalsMsg] = useState({ type: '', text: '' });
  const [isUpdatingGoals, setIsUpdatingGoals] = useState(false);

  // Reminders States
  const [reminderEnabled, setReminderEnabled] = useState(reminders.enabled);
  const [reminderTime, setReminderTime] = useState(reminders.time);
  const [remindersMsg, setRemindersMsg] = useState({ type: '', text: '' });
  const [isUpdatingReminders, setIsUpdatingReminders] = useState(false);

  // Profile Submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });

    if (password && password !== confirmPassword) {
      setProfileMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updateData: any = {
        data: {
          full_name: name,
          profile_picture: selectedAvatar
        }
      };
      if (password) {
        updateData.password = password;
      }

      const { data, error } = await supabase.auth.updateUser(updateData);
      if (error) throw error;

      onUpdateUser({
        ...user,
        name: name,
        profilePicture: selectedAvatar
      });

      setProfileMsg({ type: 'success', text: 'Profile successfully updated!' });
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Error updating profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Goals Submit
  const handleGoalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalsMsg({ type: '', text: '' });
    setIsUpdatingGoals(true);

    try {
      onUpdateGoals({
        dailyHours: Number(dailyHours),
        weeklyHours: Number(weeklyHours),
        monthlyHours: Number(monthlyHours)
      });
      setGoalsMsg({ type: 'success', text: 'Study goals updated successfully!' });
    } catch (err: any) {
      setGoalsMsg({ type: 'error', text: err.message || 'Error saving study goals.' });
    } finally {
      setIsUpdatingGoals(false);
    }
  };

  // Reminders Submit
  const handleRemindersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemindersMsg({ type: '', text: '' });
    setIsUpdatingReminders(true);

    try {
      onUpdateReminders({
        enabled: reminderEnabled,
        time: reminderTime
      });
      setRemindersMsg({ type: 'success', text: 'Study reminder settings saved!' });
    } catch (err: any) {
      setRemindersMsg({ type: 'error', text: err.message || 'Error saving reminders.' });
    } finally {
      setIsUpdatingReminders(false);
    }
  };

  // Test notification helper
  const handleTestNotification = () => {
    if (!reminderEnabled) {
      alert("Please enable study reminders first!");
      return;
    }
    
    // Attempt standard browser Notification API or fallback to alert
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification("StudyStreak Reminder", {
          body: "⏰ Time to Study! Let's keep your amazing streak going!",
          icon: "/favicon.ico"
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification("StudyStreak Reminder", {
              body: "⏰ Time to Study! Let's keep your amazing streak going!"
            });
          } else {
            alert("⏰ StudyStreak: Time to Study!");
          }
        });
      } else {
        alert("⏰ StudyStreak: Time to Study!");
      }
    } else {
      alert("⏰ StudyStreak: Time to Study!");
    }
  };

  const unlockedBadges = badges.filter(b => b.unlockedAt);
  const formattedJoinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-[#2A2A2A] pb-5">
        <h2 className="text-2xl font-light text-stone-900 dark:text-stone-50">
          Profile & <span className="italic font-serif text-[#FF6B35]">Settings</span>
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 font-display">Configure your study targets, reminders, and profile credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Card Sidebar */}
        <div className="p-6 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm flex flex-col items-center text-center space-y-4 h-max">
          {/* Avatar Container */}
          <div className="w-24 h-24 rounded-full bg-[#FF6B35]/5 dark:bg-[#FF6B35]/10 border-2 border-[#FF6B35] flex items-center justify-center text-5xl relative shadow-xs">
            <span>{selectedAvatar}</span>
          </div>

          <div className="space-y-1">
            <h3 className="font-display font-semibold text-lg text-stone-900 dark:text-stone-50">{user.name}</h3>
            <p className="text-xs text-stone-400 dark:text-stone-500 font-mono">{user.email}</p>
          </div>

          <p className="text-[10px] text-stone-400 font-medium font-display uppercase tracking-wide">Student Member since {formattedJoinDate}</p>

          <div className="w-full pt-4 border-t border-stone-200 dark:border-[#2A2A2A] grid grid-cols-2 gap-3.5 text-left font-display">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400">Current Streak</span>
              <p className="text-sm font-bold text-stone-850 dark:text-stone-100">{user.currentStreak} days</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400">Longest Streak</span>
              <p className="text-sm font-bold text-stone-850 dark:text-stone-100">{user.longestStreak} days</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400">Badges Unlocked</span>
              <p className="text-sm font-bold text-stone-850 dark:text-stone-100">{unlockedBadges.length}</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400">Daily Target</span>
              <p className="text-sm font-bold text-stone-850 dark:text-stone-100">{goals.dailyHours} hours</p>
            </div>
          </div>
        </div>

        {/* Content Panel & Tab Switchers */}
        <div className="lg:col-span-3 space-y-6">
          {/* Section Selector tabs */}
          <div className="flex space-x-1 border-b border-stone-200 dark:border-[#2A2A2A]">
            <button
              onClick={() => setActiveSection('profile')}
              className={`px-4 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSection === 'profile'
                  ? 'border-[#FF6B35] text-[#FF6B35]'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Edit Credentials</span>
            </button>
            <button
              onClick={() => setActiveSection('goals')}
              className={`px-4 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSection === 'goals'
                  ? 'border-[#FF6B35] text-[#FF6B35]'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Study Goals</span>
            </button>
            <button
              onClick={() => setActiveSection('reminders')}
              className={`px-4 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSection === 'reminders'
                  ? 'border-[#FF6B35] text-[#FF6B35]'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Reminders</span>
            </button>
          </div>

          {/* RENDER EDIT PROFILE */}
          {activeSection === 'profile' && (
            <div className="p-6 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm">
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <h3 className="font-display font-semibold text-base text-stone-900 dark:text-stone-50 flex items-center space-x-2 pb-2 border-b border-stone-100 dark:border-stone-850/60">
                  <Shield className="w-4.5 h-4.5 text-[#FF6B35]" />
                  <span>Update Account Details</span>
                </h3>

                {profileMsg.text && (
                  <div className={`p-3.5 rounded-xl text-xs md:text-sm flex items-center space-x-2 border ${
                    profileMsg.type === 'success'
                      ? 'bg-[#FF6B35]/5 dark:bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/15'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40'
                  }`}>
                    {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#FF6B35]" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                {/* Avatar presets Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Select Study Mascot Avatar</label>
                  <div className="flex flex-wrap gap-2.5">
                    {PRESET_AVATARS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border transition-all cursor-pointer ${
                          selectedAvatar === emoji
                            ? 'bg-[#FF6B35]/5 dark:bg-[#FF6B35]/15 border-[#FF6B35] ring-1 ring-[#FF6B35]'
                            : 'bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] hover:border-stone-300'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-display">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                    />
                  </div>

                  <div className="space-y-1 font-mono">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Email Address (Read-only)</label>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={user.email}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-100/55 dark:bg-[#141414]/60 border-stone-200 dark:border-[#2A2A2A] text-sm text-stone-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-display">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">New Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="px-6 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save Credentials'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* RENDER EDIT GOALS */}
          {activeSection === 'goals' && (
            <div className="p-6 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm">
              <form onSubmit={handleGoalsSubmit} className="space-y-5">
                <h3 className="font-display font-semibold text-base text-stone-900 dark:text-stone-50 flex items-center space-x-2 pb-2 border-b border-stone-100 dark:border-stone-850/60">
                  <Target className="w-4.5 h-4.5 text-[#FF6B35]" />
                  <span>Configure Study Goals</span>
                </h3>

                {goalsMsg.text && (
                  <div className={`p-3.5 rounded-xl text-xs md:text-sm flex items-center space-x-2 border ${
                    goalsMsg.type === 'success'
                      ? 'bg-[#FF6B35]/5 dark:bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/15'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40'
                  }`}>
                    {goalsMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#FF6B35]" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{goalsMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-display">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Daily Study Goal (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={dailyHours}
                      onChange={e => setDailyHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Weekly Study Goal (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={weeklyHours}
                      onChange={e => setWeeklyHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Monthly Study Goal (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={744}
                      value={monthlyHours}
                      onChange={e => setMonthlyHours(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isUpdatingGoals}
                    className="px-6 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdatingGoals ? 'Saving Goals...' : 'Save Goals'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* RENDER EDIT REMINDERS */}
          {activeSection === 'reminders' && (
            <div className="p-6 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm space-y-6">
              <form onSubmit={handleRemindersSubmit} className="space-y-5">
                <h3 className="font-display font-semibold text-base text-stone-900 dark:text-stone-50 flex items-center space-x-2 pb-2 border-b border-stone-100 dark:border-stone-850/60">
                  <Bell className="w-4.5 h-4.5 text-[#FF6B35]" />
                  <span>Configure Study Reminders</span>
                </h3>

                {remindersMsg.text && (
                  <div className={`p-3.5 rounded-xl text-xs md:text-sm flex items-center space-x-2 border ${
                    remindersMsg.type === 'success'
                      ? 'bg-[#FF6B35]/5 dark:bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/15'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40'
                  }`}>
                    {remindersMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#FF6B35]" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{remindersMsg.text}</span>
                  </div>
                )}

                <div className="space-y-4 font-display">
                  {/* Toggle Reminders */}
                  <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#141414] rounded-2xl border border-stone-200 dark:border-[#2A2A2A]">
                    <div>
                      <h4 className="font-semibold text-sm text-stone-850 dark:text-stone-200">Enable Study Reminders</h4>
                      <p className="text-xs text-stone-400">Receive alert notifications when it is time to focus</p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reminderEnabled}
                        onChange={e => setReminderEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-stone-600 peer-checked:bg-[#FF6B35]"></div>
                    </label>
                  </div>

                  {/* Reminder Time Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Daily Reminder Time</label>
                    <input
                      type="time"
                      disabled={!reminderEnabled}
                      value={reminderTime}
                      onChange={e => setReminderTime(e.target.value)}
                      className="w-full max-w-xs px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-150 dark:border-[#2A2A2A] flex justify-between items-center font-display">
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Test Alert Trigger
                  </button>

                  <button
                    type="submit"
                    disabled={isUpdatingReminders}
                    className="px-6 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdatingReminders ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
