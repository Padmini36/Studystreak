import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  FileText,
  Bookmark,
  ArrowRight,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { StudyPlan, PriorityLevel } from '../types';

interface PlannerViewProps {
  plans: StudyPlan[];
  onCreatePlan: (plan: { date: string; subject: string; topic: string; estimatedMinutes: number; priority: string }) => Promise<void>;
  onUpdatePlan: (id: string, plan: { date?: string; subject?: string; topic?: string; estimatedMinutes?: number; priority?: string; completed?: boolean }) => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
}

export default function PlannerView({ plans, onCreatePlan, onUpdatePlan, onDeletePlan }: PlannerViewProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);

  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formSubject, setFormSubject] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formEstMins, setFormEstMins] = useState(60);
  const [formPriority, setFormPriority] = useState<PriorityLevel>('medium');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Reschedule States
  const [reschedulingPlanId, setReschedulingPlanId] = useState<string | null>(null);
  const [newDateValue, setNewDateValue] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formSubject.trim() || !formTopic.trim()) {
      setFormError('Subject and Topic are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await onUpdatePlan(editingPlan.id, {
          date: formDate,
          subject: formSubject,
          topic: formTopic,
          estimatedMinutes: Number(formEstMins),
          priority: formPriority,
        });
      } else {
        await onCreatePlan({
          date: formDate,
          subject: formSubject,
          topic: formTopic,
          estimatedMinutes: Number(formEstMins),
          priority: formPriority,
        });
      }
      setShowAddModal(false);
      setEditingPlan(null);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Error saving study plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormSubject('');
    setFormTopic('');
    setFormEstMins(60);
    setFormPriority('medium');
    setFormError('');
  };

  const openEditModal = (p: StudyPlan) => {
    setEditingPlan(p);
    setFormDate(p.date);
    setFormSubject(p.subject);
    setFormTopic(p.topic);
    setFormEstMins(p.estimatedMinutes);
    setFormPriority(p.priority);
    setFormError('');
    setShowAddModal(true);
  };

  const handleToggleComplete = async (plan: StudyPlan) => {
    try {
      await onUpdatePlan(plan.id, { completed: !plan.completed });
    } catch (err) {
      alert('Error updating status.');
    }
  };

  const handleQuickRescheduleSubmit = async (id: string) => {
    if (!newDateValue) return;
    try {
      await onUpdatePlan(id, { date: newDateValue });
      setReschedulingPlanId(null);
      setNewDateValue('');
    } catch (err) {
      alert('Error rescheduling plan.');
    }
  };

  // Split plans
  const pendingPlans = plans.filter(p => !p.completed).sort((a, b) => a.date.localeCompare(b.date));
  const completedPlans = plans.filter(p => p.completed).sort((a, b) => b.date.localeCompare(a.date));

  // Helpers
  const getPriorityBadgeColor = (prio: PriorityLevel) => {
    switch (prio) {
      case 'high':
        return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40';
      case 'medium':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40';
      case 'low':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40';
      default:
        return 'bg-stone-100 text-stone-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 dark:border-[#2A2A2A] pb-5">
        <div>
          <h2 className="text-2xl font-light text-stone-900 dark:text-stone-50">
            Study <span className="italic font-serif text-[#FF6B35]">Planner</span>
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-display">Schedule your study targets, topics, and priority loads</p>
        </div>

        <button
          onClick={() => {
            setEditingPlan(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white font-semibold transition-colors text-sm shadow-sm self-stretch sm:self-auto justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Study Plan</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-stone-200 dark:border-[#2A2A2A]">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'pending'
              ? 'border-[#FF6B35] text-[#FF6B35]'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <span>Pending Plans</span>
          <span className="px-1.5 py-0.5 text-xs bg-[#FF6B35]/10 text-[#FF6B35] rounded-full font-mono font-medium">
            {pendingPlans.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === 'completed'
              ? 'border-[#FF6B35] text-[#FF6B35]'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <span>Completed Plans</span>
          <span className="px-1.5 py-0.5 text-xs bg-stone-100 dark:bg-stone-850 rounded-full font-mono font-medium text-stone-600 dark:text-stone-400">
            {completedPlans.length}
          </span>
        </button>
      </div>

      {/* Display Grid */}
      {((activeTab === 'pending' ? pendingPlans : completedPlans).length === 0) ? (
        <div className="text-center p-12 border rounded-2xl bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A]">
          <ClipboardList className="w-12 h-12 text-[#FF6B35]/40 mx-auto mb-3" />
          <h4 className="font-semibold text-stone-750 dark:text-stone-300 font-display">No {activeTab} plans found</h4>
          <p className="text-xs text-stone-500 mt-1">
            {activeTab === 'pending'
              ? 'Prepare your goals and schedules for your upcoming topics!'
              : 'Check off some pending tasks to see them logged here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'pending' ? pendingPlans : completedPlans).map(plan => (
            <div
              key={plan.id}
              className={`p-5 rounded-[24px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm flex flex-col justify-between hover:border-[#FF6B35]/35 transition-all duration-200 ${
                plan.completed ? 'opacity-85' : ''
              }`}
            >
              <div>
                {/* Header: Subject & Priority */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/15 text-xs font-semibold">
                      {plan.subject}
                    </span>
                    <p className="text-xs text-stone-400 dark:text-stone-500 font-medium font-mono mt-2.5 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-[#FF6B35]" />
                      <span>{plan.date}</span>
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getPriorityBadgeColor(plan.priority)}`}>
                    {plan.priority}
                  </span>
                </div>

                {/* Topic */}
                <h3 className="font-display font-semibold text-stone-850 dark:text-stone-50 text-base mt-4 leading-snug">
                  {plan.topic}
                </h3>

                {/* Est time */}
                <div className="flex items-center space-x-1.5 mt-3 text-xs text-stone-500 dark:text-stone-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#FF6B35]" />
                  <span>Est: {plan.estimatedMinutes} mins</span>
                </div>
              </div>

              {/* Quick rescheduling inputs */}
              {reschedulingPlanId === plan.id ? (
                <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">Select new date</label>
                  <div className="flex space-x-1.5">
                    <input
                      type="date"
                      value={newDateValue}
                      onChange={e => setNewDateValue(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] text-xs focus:ring-1 focus:ring-[#FF6B35] focus:outline-none text-stone-800 dark:text-stone-100"
                    />
                    <button
                      onClick={() => handleQuickRescheduleSubmit(plan.id)}
                      className="px-2.5 py-1 bg-[#FF6B35] text-white rounded-lg text-xs font-semibold hover:bg-[#e0592b]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setReschedulingPlanId(null)}
                      className="px-2 py-1 bg-stone-100 dark:bg-[#2A2A2A] text-stone-600 dark:text-stone-300 rounded-lg text-xs hover:bg-stone-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Footer Actions */
                <div className="mt-5 pt-3 border-t border-stone-150 dark:border-stone-800 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleComplete(plan)}
                    className={`flex items-center space-x-1 text-xs font-bold transition-colors cursor-pointer ${
                      plan.completed
                        ? 'text-stone-400 hover:text-amber-600'
                        : 'text-[#FF6B35] hover:text-[#e0592b]'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 fill-current" />
                    <span>{plan.completed ? 'Mark Pending' : 'Mark Completed'}</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {!plan.completed && (
                      <button
                        onClick={() => {
                          setReschedulingPlanId(plan.id);
                          setNewDateValue(plan.date);
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-[#FF6B35] hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-medium cursor-pointer"
                        title="Reschedule"
                      >
                        Reschedule
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-[#FF6B35] hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                      title="Edit plan"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this study plan?')) {
                          onDeletePlan(plan.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                      title="Delete plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1A1A1A] rounded-[32px] border border-[#E5E5E5] dark:border-[#2A2A2A] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200/60 dark:border-[#2A2A2A]">
              <h3 className="text-lg font-light text-stone-900 dark:text-stone-50">
                <span className="font-display font-semibold">{editingPlan ? 'Edit' : 'Create'} <span className="italic font-serif text-[#FF6B35]">Study Plan</span></span>
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
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Planned Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Subject <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics, History"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Topic <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quadratic Equations, WWII Alliances"
                  value={formTopic}
                  onChange={e => setFormTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Estimated Study Time (mins) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formEstMins}
                    onChange={e => setFormEstMins(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 font-display">Priority Level <span className="text-red-500">*</span></label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100 cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
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
                  {isSubmitting ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
