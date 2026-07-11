import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Calendar,
  Award,
  Plus,
  StickyNote,
  CheckSquare,
  Square
} from 'lucide-react';
import { StudySession, StudyPlan, StudyNote } from '../types';

interface CalendarViewProps {
  sessions: StudySession[];
  plans: StudyPlan[];
  notes: StudyNote[];
  onSelectDateTab: (date: string, tabName: string) => void;
}

export default function CalendarView({ sessions, plans, notes, onSelectDateTab }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate days in current month grid
  const startOfMonth = new Date(year, month, 1);
  const startDayIndex = startOfMonth.getDay(); // 0 is Sun, 1 is Mon...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Padding days from previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevM = month === 0 ? 11 : month - 1;
    const prevY = month === 0 ? year - 1 : year;
    daysGrid.push({
      dateStr: `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Days in current month
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push({
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Padding days for next month to complete 6-row grid (42 cells)
  const remainingCells = 42 - daysGrid.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextM = month === 11 ? 0 : month + 1;
    const nextY = month === 11 ? year + 1 : year;
    daysGrid.push({
      dateStr: `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  // Calculate day study details
  const getDayStudyMinutes = (dateStr: string) => {
    return sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  };

  // Color-coding class based on minutes studied:
  // 🟢 More than 4 hours (240 mins)
  // 🟡 Between 2 and 4 hours (120 - 240 mins)
  // 🟠 Less than 2 hours (1 - 120 mins)
  // ⚪ No study (0 mins)
  const getHeatmapColorClass = (dateStr: string) => {
    const mins = getDayStudyMinutes(dateStr);
    if (mins > 240) {
      return 'cal-high hover:opacity-90 text-white';
    } else if (mins >= 120 && mins <= 240) {
      return 'cal-mid hover:opacity-90 text-black';
    } else if (mins > 0) {
      return 'cal-low hover:opacity-90 text-black';
    }
    return 'cal-none border border-stone-200/50 dark:border-[#2A2A2A]';
  };

  // Load details for selected date
  const selectedSessions = sessions.filter(s => s.date === selectedDateStr);
  const selectedPlans = plans.filter(p => p.date === selectedDateStr);
  const selectedNote = notes.find(n => n.date === selectedDateStr);
  const totalMinsSelected = selectedSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} mins`;
    return m === 0 ? `${h} hrs` : `${h}h ${m}m`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200 dark:border-[#2A2A2A] pb-5">
        <h2 className="text-2xl font-light text-stone-900 dark:text-stone-50">
          Calendar <span className="italic font-serif text-[#FF6B35]">Tracker</span>
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 font-display">Visualize your study heatmaps and timeline history</p>
      </div>

      {/* Heatmap Legend indicator */}
      <div className="flex flex-wrap items-center gap-4 text-xs bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] p-4 rounded-2xl">
        <span className="font-semibold text-stone-600 dark:text-stone-400 font-display">Study activity intensity:</span>
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 rounded bg-stone-50 dark:bg-[#1A1A1A] border border-stone-200/50 dark:border-[#2A2A2A]"></div>
          <span className="text-stone-500 dark:text-stone-400 font-mono">No study</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#FF6B35]/40"></div>
          <span className="text-stone-500 dark:text-stone-400 font-mono">&lt; 2 hours</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#FF6B35]/70"></div>
          <span className="text-stone-500 dark:text-stone-400 font-mono">2 – 4 hours</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#FF6B35]"></div>
          <span className="text-stone-500 dark:text-stone-400 font-mono">&gt; 4 hours</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Grid Calendar */}
        <div className="lg:col-span-2 p-6 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-[#2A2A2A]">
            <h3 className="font-display text-base md:text-lg font-semibold text-stone-900 dark:text-stone-50">
              {monthNames[month]} {year}
            </h3>

            <div className="flex space-x-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl border border-[#E5E5E5] dark:border-[#2A2A2A] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[10px] tracking-wider text-stone-400 select-none font-display">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {daysGrid.map((dayObj, i) => {
              const isSelected = dayObj.dateStr === selectedDateStr;
              const hasActivity = getDayStudyMinutes(dayObj.dateStr) > 0;
              const cellColor = getHeatmapColorClass(dayObj.dateStr);

              return (
                <button
                  key={`${dayObj.dateStr}-${i}`}
                  onClick={() => setSelectedDateStr(dayObj.dateStr)}
                  className={`relative aspect-square rounded-xl p-1.5 font-mono text-xs md:text-sm font-semibold flex flex-col justify-between transition-all cursor-pointer ${cellColor} ${
                    isSelected ? 'ring-2 ring-[#FF6B35] scale-[0.98] z-10' : ''
                  } ${!dayObj.isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <span className="self-start">{dayObj.dayNum}</span>
                  {hasActivity && (
                    <span className="self-end w-1.5 h-1.5 bg-white dark:bg-[#141414] rounded-full shadow-xs"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details Panel */}
        <div className="p-6 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm flex flex-col space-y-5">
          <div className="border-b border-stone-200 dark:border-[#2A2A2A] pb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-stone-50 flex items-center space-x-2">
              <Calendar className="w-4.5 h-4.5 text-[#FF6B35]" />
              <span>Details for {selectedDateStr}</span>
            </h3>
          </div>

          {/* Stats quick view */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3.5 bg-stone-50 dark:bg-[#141414] border border-stone-100 dark:border-[#2A2A2A] rounded-2xl">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-stone-400 font-display">Total Study Time</span>
              <p className="text-base font-bold text-stone-800 dark:text-stone-100 font-mono mt-1">
                {formatMins(totalMinsSelected)}
              </p>
            </div>
            <div className="p-3.5 bg-stone-50 dark:bg-[#141414] border border-stone-100 dark:border-[#2A2A2A] rounded-2xl">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-stone-400 font-display">Sessions</span>
              <p className="text-base font-bold text-stone-800 dark:text-stone-100 font-mono mt-1">
                {selectedSessions.length} logged
              </p>
            </div>
          </div>

          {/* Sessions List segment */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide font-display">Sessions ({selectedSessions.length})</h4>
              <button
                onClick={() => onSelectDateTab(selectedDateStr, 'sessions')}
                className="text-xs text-[#FF6B35] hover:text-[#e0592b] hover:underline font-semibold cursor-pointer"
              >
                Log Session
              </button>
            </div>

            {selectedSessions.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No study sessions logged on this day.</p>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {selectedSessions.map(sess => (
                  <div key={sess.id} className="p-3 bg-stone-50 dark:bg-[#141414] rounded-xl border border-stone-200/50 dark:border-[#2A2A2A] text-xs">
                    <div className="flex justify-between font-bold text-stone-800 dark:text-stone-100">
                      <span className="font-display">{sess.topic}</span>
                      <span className="text-[#FF6B35] font-mono">{formatMins(sess.durationMinutes)}</span>
                    </div>
                    {sess.subject && (
                      <p className="text-[10px] font-semibold text-stone-400 mt-1 uppercase tracking-wide font-display">{sess.subject}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Planned Tasks segment */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide font-display">Study Plans ({selectedPlans.length})</h4>
              <button
                onClick={() => onSelectDateTab(selectedDateStr, 'planner')}
                className="text-xs text-[#FF6B35] hover:text-[#e0592b] hover:underline font-semibold cursor-pointer"
              >
                Manage Planner
              </button>
            </div>

            {selectedPlans.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No tasks scheduled for this day.</p>
            ) : (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {selectedPlans.map(plan => (
                  <div key={plan.id} className="flex items-center space-x-2 text-xs text-stone-700 dark:text-stone-300">
                    {plan.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#FF6B35] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-300 dark:text-stone-700 shrink-0" />
                    )}
                    <span className={`font-display ${plan.completed ? 'line-through text-stone-400' : ''}`}>
                      <strong className="text-xs font-semibold mr-1">[{plan.subject}]</strong> {plan.topic}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Revision Notes segment */}
          <div className="space-y-2 pt-3 border-t border-stone-150 dark:border-[#2A2A2A]">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide font-display">Daily Notes</h4>
              <button
                onClick={() => onSelectDateTab(selectedDateStr, 'notes')}
                className="text-xs text-[#FF6B35] hover:text-[#e0592b] hover:underline font-semibold cursor-pointer"
              >
                Edit Notes
              </button>
            </div>

            {selectedNote ? (
              <div className="p-3 bg-[#FF6B35]/5 dark:bg-[#FF6B35]/10 rounded-2xl border border-[#FF6B35]/10 space-y-1.5">
                {selectedNote.topicsCovered && (
                  <p className="text-xs text-stone-700 dark:text-stone-300 font-display">
                    <strong className="text-[#FF6B35]">Covered:</strong> {selectedNote.topicsCovered}
                  </p>
                )}
                {selectedNote.conceptsLearned && (
                  <p className="text-xs text-stone-700 dark:text-stone-300 font-display">
                    <strong className="text-[#FF6B35]">Learned:</strong> {selectedNote.conceptsLearned}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">No daily notes recorded on this date.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
