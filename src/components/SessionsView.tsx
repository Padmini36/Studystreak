import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
  X,
  Search,
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { StudySession } from '../types';

interface SessionsViewProps {
  sessions: StudySession[];
  onAddSession: (session: { date: string; startTime: string; endTime: string; subject?: string; topic: string; notes?: string }) => Promise<void>;
  onEditSession: (id: string, session: { date?: string; startTime?: string; endTime?: string; subject?: string; topic?: string; notes?: string }) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
}

export default function SessionsView({ sessions, onAddSession, onEditSession, onDeleteSession }: SessionsViewProps) {
  // Tabs within Sessions: "History" vs "Live Study Timer"
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'timer'>('history');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');

  // Manual Session Modal / Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);

  // Form Fields
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('11:00');
  const [formSubject, setFormSubject] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Study Timer / Pomodoro State
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0); // for stopwatch
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState(25 * 60); // 25 min default
  const [timerSubject, setTimerSubject] = useState('');
  const [timerTopic, setTimerTopic] = useState('');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string>('');

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Timer interval runner
  const handleStartTimer = () => {
    if (isRunning) return;

    if (!timerTopic.trim()) {
      alert('Please enter what topic you are studying before starting the timer.');
      return;
    }

    // Set startTime if starting from 0
    if (secondsElapsed === 0 || (timerMode === 'pomodoro' && pomoSecondsLeft === 25 * 60)) {
      const now = new Date();
      const HH = String(now.getHours()).padStart(2, '0');
      const MM = String(now.getMinutes()).padStart(2, '0');
      startTimeRef.current = `${HH}:${MM}`;
    }

    setIsRunning(true);
    if (timerMode === 'stopwatch') {
      intervalRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      intervalRef.current = setInterval(() => {
        setPomoSecondsLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            // Alert user Pomodoro ended
            alert("Pomodoro timer completed! Take a 5-minute break.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleResetTimer = () => {
    handlePauseTimer();
    setSecondsElapsed(0);
    setPomoSecondsLeft(25 * 60);
  };

  const handleFinishTimerSession = () => {
    handlePauseTimer();

    // Determine duration and times
    let calculatedMinutes = 0;
    if (timerMode === 'stopwatch') {
      calculatedMinutes = Math.max(1, Math.round(secondsElapsed / 60));
    } else {
      const elapsed = 25 * 60 - pomoSecondsLeft;
      calculatedMinutes = Math.max(1, Math.round(elapsed / 60));
    }

    const startStr = startTimeRef.current || '09:00';
    const now = new Date();
    const HH = String(now.getHours()).padStart(2, '0');
    const MM = String(now.getMinutes()).padStart(2, '0');
    const endStr = `${HH}:${MM}`;

    // Load into add session form and trigger modal
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStart(startStr);
    setFormEnd(endStr);
    setFormSubject(timerSubject);
    setFormTopic(timerTopic);
    setFormNotes('Logged using Live Study Timer.');
    setFormError('');

    setShowAddModal(true);
    
    // reset timer
    setSecondsElapsed(0);
    setPomoSecondsLeft(25 * 60);
    setTimerTopic('');
    setTimerSubject('');
  };

  // Manual Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTopic.trim()) {
      setFormError('Topic Covered is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSession) {
        await onEditSession(editingSession.id, {
          date: formDate,
          startTime: formStart,
          endTime: formEnd,
          subject: formSubject,
          topic: formTopic,
          notes: formNotes,
        });
      } else {
        await onAddSession({
          date: formDate,
          startTime: formStart,
          endTime: formEnd,
          subject: formSubject,
          topic: formTopic,
          notes: formNotes,
        });
      }
      setShowAddModal(false);
      setEditingSession(null);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Error saving session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStart('09:00');
    setFormEnd('11:00');
    setFormSubject('');
    setFormTopic('');
    setFormNotes('');
    setFormError('');
  };

  const openEditModal = (sess: StudySession) => {
    setEditingSession(sess);
    setFormDate(sess.date);
    setFormStart(sess.startTime);
    setFormEnd(sess.endTime);
    setFormSubject(sess.subject || '');
    setFormTopic(sess.topic);
    setFormNotes(sess.notes || '');
    setFormError('');
    setShowAddModal(true);
  };

  // Format stopwatch/pomodoro display time
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  // Extract unique subjects for filter dropdown
  const uniqueSubjects = Array.from(new Set(sessions.map(s => s.subject).filter(Boolean)));

  // Filter study sessions list
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (s.subject && s.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = subjectFilter === 'All' || s.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      {/* Header and Sub Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 dark:border-[#2A2A2A] pb-5">
        <div>
          <h2 className="text-2xl font-light text-stone-900 dark:text-stone-50">
            Study Session <span className="italic font-serif text-[#FF6B35]">Tracking</span>
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-display">Track and manage your study sessions</p>
        </div>

        <div className="flex space-x-2 bg-white dark:bg-[#2A2A2A] p-1.5 rounded-xl border border-[#E5E5E5] dark:border-[#2A2A2A] self-stretch sm:self-auto">
          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-[#FF6B35] text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Study History
          </button>
          <button
            onClick={() => setActiveSubTab('timer')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === 'timer'
                ? 'bg-[#FF6B35] text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Live Timer
          </button>
        </div>
      </div>

      {/* RENDER TAB 1: HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search & Subject filter */}
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search topic or notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-stone-800 dark:text-stone-100 text-sm"
                />
              </div>

              <select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                className="px-4 py-2 rounded-xl border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-stone-700 dark:text-stone-200 text-sm cursor-pointer"
              >
                <option value="All">All Subjects</option>
                {uniqueSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setEditingSession(null);
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white font-semibold transition-colors text-sm shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Session Manually</span>
            </button>
          </div>

          {/* Sessions List */}
          {filteredSessions.length === 0 ? (
            <div className="text-center p-12 border rounded-2xl bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A]">
              <BookOpen className="w-12 h-12 text-[#FF6B35]/40 mx-auto mb-3" />
              <h4 className="font-semibold text-stone-750 dark:text-stone-300 font-display">No study sessions found</h4>
              <p className="text-xs text-stone-500 mt-1">Start by adding your first study session manually, or use the live study timer!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessions.map(sess => {
                // calculate duration formatting
                const hours = Math.floor(sess.durationMinutes / 60);
                const mins = sess.durationMinutes % 60;
                const durationStr = hours > 0 
                  ? `${hours} hr${hours > 1 ? 's' : ''} ${mins > 0 ? `${mins} min` : ''}`
                  : `${mins} min`;

                return (
                  <div
                    key={sess.id}
                    className="p-5 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm flex flex-col justify-between hover:border-[#FF6B35]/35 transition-all duration-200"
                  >
                    <div>
                      {/* Badge / Subject and Date */}
                      <div className="flex items-start justify-between">
                        <div>
                          {sess.subject ? (
                            <span className="px-2.5 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/15 text-xs font-semibold">
                              {sess.subject}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-750 text-xs font-medium">
                              General
                            </span>
                          )}
                          <p className="text-xs text-stone-400 dark:text-stone-500 font-medium font-mono mt-2">{sess.date}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => openEditModal(sess)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-[#FF6B35] hover:bg-stone-50 dark:hover:bg-stone-800 transition-all cursor-pointer"
                            title="Edit session"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this study session?')) {
                                onDeleteSession(sess.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all cursor-pointer"
                            title="Delete session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Topic */}
                      <h3 className="font-display font-semibold text-stone-850 dark:text-stone-50 text-base mt-3 leading-snug">
                        {sess.topic}
                      </h3>

                      {/* Notes if any */}
                      {sess.notes && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-850/50 p-3 rounded-xl mt-3 line-clamp-3 font-display">
                          {sess.notes}
                        </p>
                      )}
                    </div>

                    {/* Time breakdown Footer */}
                    <div className="mt-5 pt-3 border-t border-stone-150 dark:border-stone-800 flex items-center justify-between text-xs font-medium text-stone-500 dark:text-stone-400 font-mono">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-[#FF6B35]" />
                        <span>{sess.startTime} – {sess.endTime}</span>
                      </span>
                      <span className="text-[#FF6B35] dark:text-[#FF6B35] font-bold bg-[#FF6B35]/10 px-2 py-0.5 rounded-lg border border-[#FF6B35]/20">
                        {durationStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RENDER TAB 2: LIVE TIMER */}
      {activeSubTab === 'timer' && (
        <div className="max-w-2xl mx-auto p-8 md:p-10 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm text-center space-y-8">
          <div className="space-y-2">
            <h3 className="text-xl font-light text-[#1A1A1A] dark:text-[#F9F9F7]">
              Interactive <span className="italic font-serif text-[#FF6B35]">Focus Mode</span>
            </h3>
            <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 font-display">
              Run a stopwatch or a 25-minute Pomodoro study tracker.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex bg-[#F1F1EF] dark:bg-[#2A2A2A] p-1 rounded-xl border border-stone-200/55 dark:border-[#2A2A2A]">
            <button
              onClick={() => {
                if (isRunning) {
                  alert('Stop or pause the active study timer first before switching modes.');
                  return;
                }
                setTimerMode('stopwatch');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timerMode === 'stopwatch'
                  ? 'bg-white text-stone-900 dark:bg-stone-800 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Stopwatch (Count Up)
            </button>
            <button
              onClick={() => {
                if (isRunning) {
                  alert('Stop or pause the active study timer first before switching modes.');
                  return;
                }
                setTimerMode('pomodoro');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timerMode === 'pomodoro'
                  ? 'bg-white text-stone-900 dark:bg-stone-800 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Pomodoro Timer (25 Min)
            </button>
          </div>

          {/* Timer Circle */}
          <div className="relative flex items-center justify-center w-60 h-60 mx-auto rounded-full border-[8px] border-[#FF6B35]/10 dark:border-[#FF6B35]/5 bg-stone-50 dark:bg-stone-800/40">
            {/* Visual ticking indicator ring */}
            <div className={`absolute inset-0 rounded-full border-[6px] border-[#FF6B35] transition-all ${isRunning ? 'animate-pulse' : ''}`} style={{ opacity: isRunning ? 0.4 : 0.1 }}></div>
            
            <div className="space-y-1 z-10">
              <span className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-stone-900 dark:text-stone-50 select-none">
                {timerMode === 'stopwatch' ? formatTimer(secondsElapsed) : formatTimer(pomoSecondsLeft)}
              </span>
              <p className="text-xs font-medium uppercase tracking-widest text-[#FF6B35] font-mono">
                {isRunning ? 'Studying...' : 'Paused'}
              </p>
            </div>
          </div>

          {/* Target Study Subject & Topic inputs */}
          <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Subject (optional)</label>
              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={timerSubject}
                onChange={e => setTimerSubject(e.target.value)}
                disabled={isRunning}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-[#E5E5E5] dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm disabled:opacity-50 text-stone-800 dark:text-stone-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Topic Covered <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Calculus Derivatives"
                value={timerTopic}
                onChange={e => setTimerTopic(e.target.value)}
                disabled={isRunning}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-[#E5E5E5] dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm disabled:opacity-50 text-stone-800 dark:text-stone-50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4 pt-2">
            <button
              onClick={handleResetTimer}
              className="p-3.5 rounded-full bg-[#F1F1EF] hover:bg-[#E5E5E3] dark:bg-[#2A2A2A] dark:hover:bg-[#3A3A3A] text-stone-600 dark:text-stone-300 transition-all focus:outline-none cursor-pointer"
              title="Reset timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {isRunning ? (
              <button
                onClick={handlePauseTimer}
                className="p-5 rounded-full bg-amber-500 hover:bg-amber-600 text-stone-900 transition-all font-bold focus:outline-none shadow-md cursor-pointer"
                title="Pause"
              >
                <Pause className="w-6 h-6 fill-stone-900" />
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                className="p-5 rounded-full bg-[#FF6B35] hover:bg-[#e0592b] text-white transition-all font-bold focus:outline-none shadow-md cursor-pointer"
                title="Start Study"
              >
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </button>
            )}

            <button
              onClick={handleFinishTimerSession}
              disabled={timerMode === 'stopwatch' ? secondsElapsed === 0 : pomoSecondsLeft === 25 * 60}
              className="p-3.5 rounded-full bg-[#FF6B35]/15 hover:bg-[#FF6B35]/25 text-[#FF6B35] transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
              title="Finish and log study time"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ADD/EDIT MANUALLY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1A1A1A] rounded-[32px] border border-[#E5E5E5] dark:border-[#2A2A2A] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200/60 dark:border-[#2A2A2A]">
              <h3 className="text-lg font-light text-stone-900 dark:text-stone-50">
                <span className="font-display font-semibold">{editingSession ? 'Edit' : 'Log'} <span className="italic font-serif text-[#FF6B35]">Study Session</span></span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs md:text-sm flex items-center space-x-2 border border-red-200 dark:border-red-900/40">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Physics, Calculus"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Start Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={formStart}
                    onChange={e => setFormStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">End Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={formEnd}
                    onChange={e => setFormEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Topic Covered <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Chemistry Carbon Atoms"
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Notes & Reflections</label>
                <textarea
                  placeholder="Write quick points or remarks on what you covered."
                  rows={3}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100 resize-none font-display"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-stone-150 dark:border-[#2A2A2A] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-[#2A2A2A] text-sm text-stone-600 dark:text-stone-350 hover:bg-stone-50 dark:hover:bg-stone-850 transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingSession ? 'Save Changes' : 'Add Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
