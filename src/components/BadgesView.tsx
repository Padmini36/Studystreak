import React from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Trophy,
  Award,
  Layers,
  Sun,
  Moon,
  Target,
  Sparkles,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../types';

interface BadgesViewProps {
  badges: Badge[];
  loading: boolean;
}

// Map badge icons dynamically
const iconMap: Record<string, React.ComponentType<any>> = {
  Flame: Flame,
  Trophy: Trophy,
  Award: Award,
  Layers: Layers,
  Sun: Sun,
  Moon: Moon,
  Target: Target,
};

export default function BadgesView({ badges, loading }: BadgesViewProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-stone-500 font-medium font-display">Opening your badges cabinet...</p>
      </div>
    );
  }

  // Count unlocked
  const unlockedCount = badges.filter(b => b.unlockedAt).length;

  return (
    <div className="space-y-6">
      {/* Header and stats overview */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 dark:border-[#2A2A2A] pb-5">
        <div>
          <h2 className="text-2xl font-light text-stone-900 dark:text-stone-50">
            Achievements & <span className="italic font-serif text-[#FF6B35]">Badges</span>
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-display">Unlock custom study milestones and maintain consistent habits</p>
        </div>

        <div className="flex items-center space-x-2.5 bg-[#FF6B35]/5 dark:bg-[#FF6B35]/10 px-4 py-2 rounded-xl border border-[#FF6B35]/15">
          <Sparkles className="w-4 h-4 text-[#FF6B35] animate-pulse" />
          <span className="text-sm font-semibold text-[#FF6B35]">
            {unlockedCount} of {badges.length} Unlocked
          </span>
        </div>
      </div>

      {/* Progress visual bar */}
      <div className="p-6 bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2A2A2A] rounded-[24px] shadow-sm space-y-3">
        <div className="flex justify-between items-center text-xs font-semibold text-stone-500 dark:text-stone-400 font-display">
          <span>Cabinet Progress</span>
          <span>{Math.round((unlockedCount / badges.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-stone-100 dark:bg-[#141414] h-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FF6B35] rounded-full transition-all duration-500"
            style={{ width: `${(unlockedCount / badges.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {badges.map((badge, idx) => {
          const IconComponent = iconMap[badge.icon] || Award;
          const isUnlocked = !!badge.unlockedAt;

          return (
            <motion.div
              key={badge.code}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
              className={`p-6 rounded-[24px] border text-center relative flex flex-col items-center justify-between min-h-[220px] transition-all shadow-sm ${
                isUnlocked
                  ? 'bg-white dark:bg-[#1A1A1A] border-[#FF6B35]/25 dark:border-[#FF6B35]/35'
                  : 'bg-stone-50/50 dark:bg-[#141414]/30 border-stone-200 dark:border-[#2A2A2A] opacity-70'
              }`}
            >
              {/* Unlocked / Locked small tag */}
              <div className="absolute right-4 top-4">
                {isUnlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-[#FF6B35]" />
                ) : (
                  <Lock className="w-4 h-4 text-stone-400 dark:text-stone-600" />
                )}
              </div>

              {/* Icon Container */}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-colors mb-4 ${
                isUnlocked
                  ? 'bg-[#FF6B35]/5 dark:bg-[#FF6B35]/10 border-[#FF6B35]/15 text-[#FF6B35] shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500'
              }`}>
                <IconComponent className={`w-9 h-9 ${isUnlocked ? 'animate-wiggle' : 'grayscale'}`} />
              </div>

              {/* Text content */}
              <div className="space-y-1">
                <h3 className={`font-display font-semibold text-sm ${
                  isUnlocked ? 'text-stone-900 dark:text-stone-50' : 'text-stone-500 dark:text-stone-400'
                }`}>
                  {badge.name}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed max-w-[180px] mx-auto font-display">
                  {badge.description}
                </p>
              </div>

              {/* Unlock Footer timestamp */}
              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-850/60 w-full text-[10px] font-mono text-stone-400 dark:text-stone-500">
                {isUnlocked ? (
                  <span className="text-[#FF6B35] font-semibold">Unlocked {badge.unlockedAt}</span>
                ) : (
                  <span>Locked</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
