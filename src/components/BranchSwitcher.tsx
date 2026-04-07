import React from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useContextTracker } from '../hooks/useContextTracker';

interface BranchSwitcherProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function BranchSwitcher({ currentIndex, total, onPrev, onNext }: BranchSwitcherProps) {
  if (total <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-500 tracking-tighter uppercase">
      <button 
        onClick={onPrev}
        className="hover:text-white transition-colors disabled:opacity-20"
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="w-2.5 h-2.5" />
      </button>
      
      <span className="tracking-widest text-zinc-600">
        REALITY_INDEX: [{String(currentIndex + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}]
      </span>

      <button 
        onClick={onNext}
        className="hover:text-white transition-colors disabled:opacity-20"
        disabled={currentIndex === total - 1}
      >
        <ChevronRight className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}
