import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  Save,
  CheckCircle,
  FileText,
  Bookmark,
  Activity,
  AlertCircle
} from 'lucide-react';
import { StudyNote } from '../types';

interface DailyNotesViewProps {
  notes: StudyNote[];
  onSaveNote: (note: { date: string; topicsCovered?: string; conceptsLearned?: string; importantPoints?: string; revisionNotes?: string; personalRemarks?: string }) => Promise<void>;
  preselectedDate?: string;
}

export default function DailyNotesView({ notes, onSaveNote, preselectedDate }: DailyNotesViewProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return preselectedDate || new Date().toISOString().split('T')[0];
  });

  // Search through existing notes
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields
  const [topicsCovered, setTopicsCovered] = useState('');
  const [conceptsLearned, setConceptsLearned] = useState('');
  const [importantPoints, setImportantPoints] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [personalRemarks, setPersonalRemarks] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync editor fields when selectedDate or notes list changes
  useEffect(() => {
    const existingNote = notes.find(n => n.date === selectedDate);
    if (existingNote) {
      setTopicsCovered(existingNote.topicsCovered || '');
      setConceptsLearned(existingNote.conceptsLearned || '');
      setImportantPoints(existingNote.importantPoints || '');
      setRevisionNotes(existingNote.revisionNotes || '');
      setPersonalRemarks(existingNote.personalRemarks || '');
    } else {
      setTopicsCovered('');
      setConceptsLearned('');
      setImportantPoints('');
      setRevisionNotes('');
      setPersonalRemarks('');
    }
    setSaveSuccess(false);
    setErrorMessage('');
  }, [selectedDate, notes]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      await onSaveNote({
        date: selectedDate,
        topicsCovered,
        conceptsLearned,
        importantPoints,
        revisionNotes,
        personalRemarks,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving study notes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter notes for sidebar list
  const filteredNotes = notes.filter(note => {
    const query = searchQuery.toLowerCase();
    return (
      note.date.includes(query) ||
      note.topicsCovered.toLowerCase().includes(query) ||
      note.conceptsLearned.toLowerCase().includes(query) ||
      note.importantPoints.toLowerCase().includes(query) ||
      note.revisionNotes.toLowerCase().includes(query) ||
      note.personalRemarks.toLowerCase().includes(query)
    );
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200 dark:border-[#2A2A2A] pb-5">
        <h2 className="text-2xl font-light text-stone-900 dark:text-stone-50">
          Daily Study <span className="italic font-serif text-[#FF6B35]">Notes</span>
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 font-display">Keep journal records of concepts learned, summaries, and revision reminders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Notes Directory */}
        <div className="p-6 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm flex flex-col space-y-4">
          <div className="space-y-2">
            <h3 className="font-display text-base font-semibold text-stone-900 dark:text-stone-50">Notebook Directory</h3>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search notes content..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#FF6B35] text-stone-800 dark:text-stone-100 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-4 text-center">No matching records found.</p>
            ) : (
              filteredNotes.map(note => {
                const isSelected = note.date === selectedDate;
                return (
                  <button
                    key={note.id}
                    onClick={() => setSelectedDate(note.date)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col space-y-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF6B35]/5 dark:bg-[#FF6B35]/10 border-[#FF6B35]/30 dark:border-[#FF6B35]/40'
                        : 'bg-stone-50/50 dark:bg-[#141414]/40 border-stone-150 dark:border-stone-850 hover:border-[#FF6B35]/20'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold text-stone-400 dark:text-stone-500 font-mono">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-[#FF6B35]" />
                        <span>{note.date}</span>
                      </span>
                    </div>

                    <h4 className="font-display font-semibold text-stone-850 dark:text-stone-200 text-xs line-clamp-1">
                      {note.topicsCovered || 'Untitled Study Entry'}
                    </h4>

                    {note.conceptsLearned && (
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2">
                        {note.conceptsLearned}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Notebook Editor Panel */}
        <div className="lg:col-span-2 p-6 rounded-[32px] border bg-white dark:bg-[#1A1A1A] border-[#E5E5E5] dark:border-[#2A2A2A] shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-200 dark:border-[#2A2A2A] pb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#FF6B35]" />
                <h3 className="font-display text-base font-semibold text-stone-900 dark:text-stone-50">Note Entry Editor</h3>
              </div>

              {/* Date Selection */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-stone-500 font-medium font-display">Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
                />
              </div>
            </div>

            {/* Error or Success Toast */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs md:text-sm flex items-center space-x-2 border border-red-200 dark:border-red-900/40">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 rounded-xl bg-[#FF6B35]/5 dark:bg-[#FF6B35]/15 text-[#FF6B35] text-xs md:text-sm flex items-center space-x-2 border border-[#FF6B35]/15">
                <CheckCircle className="w-4 h-4 shrink-0 text-[#FF6B35]" />
                <span>Study notes successfully saved for {selectedDate}!</span>
              </div>
            )}

            {/* Notebook form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-display">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Topics Covered</label>
                <input
                  type="text"
                  placeholder="e.g. Newton's laws, integration, cell division"
                  value={topicsCovered}
                  onChange={e => setTopicsCovered(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Concepts Learned</label>
                <input
                  type="text"
                  placeholder="e.g. First-principle, force relations, energy transfer"
                  value={conceptsLearned}
                  onChange={e => setConceptsLearned(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100"
                />
              </div>
            </div>

            <div className="space-y-1 font-display">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Important Points</label>
              <textarea
                placeholder="List major formulas, definitions, or bullet points."
                rows={2}
                value={importantPoints}
                onChange={e => setImportantPoints(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100 resize-none animate-none"
              ></textarea>
            </div>

            <div className="space-y-1 font-display">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Revision Notes</label>
              <textarea
                placeholder="What requires revisiting or further exercises before tests?"
                rows={2}
                value={revisionNotes}
                onChange={e => setRevisionNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100 resize-none animate-none"
              ></textarea>
            </div>

            <div className="space-y-1 font-display">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Personal Remarks</label>
              <textarea
                placeholder="e.g. 'Felt highly focused today', 'Tired during derivations'."
                rows={2}
                value={personalRemarks}
                onChange={e => setPersonalRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-stone-50 dark:bg-[#141414] border-stone-200 dark:border-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-sm text-stone-800 dark:text-stone-100 resize-none animate-none"
              ></textarea>
            </div>

            <div className="pt-4 border-t border-stone-150 dark:border-[#2A2A2A] flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-[#e0592b] text-white font-semibold transition-colors text-sm shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Notes...' : 'Save Daily Notes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
