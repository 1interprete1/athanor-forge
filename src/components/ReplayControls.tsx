import React, { useEffect, useMemo } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Play, Pause, SkipBack, SkipForward, Square, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { groupMessagesIntoTurns } from '../utils/turnHelper';
import { runtimeEvents } from '../system/runtimeEvents';
import { motion } from 'motion/react';

export function ReplayControls() {
  const { replayState, togglePlay, nextTurn, prevTurn, stopReplay, sessions, activeSessionId, isMobile } = useStore();
  const { isActive, isPlaying, currentTurnIndex } = replayState;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);
  const totalTurns = turns.length;

  const turnIndicators = useMemo(() => {
    return turns.map((turn, index) => {
      const startTime = turn.user?.timestampMs || 0;
      const endTime = turn.assistant?.timestampMs || Date.now();
      
      const events = runtimeEvents.filter(e => e.timestamp >= startTime && e.timestamp <= endTime + 2000);
      const hasError = events.some(e => e.type === 'runtime-error');
      const hasAutoFix = events.some(e => e.type === 'auto-fix');
      const hasWarning = events.some(e => e.type === 'warning');

      return { index, hasError, hasAutoFix, hasWarning };
    });
  }, [turns]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTurnIndex < totalTurns - 1) {
      interval = setInterval(() => {
        nextTurn();
      }, 1200);
    } else if (isPlaying && currentTurnIndex >= totalTurns - 1) {
      togglePlay(); // Auto-pause at the end
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTurnIndex, totalTurns, nextTurn, togglePlay]);

  if (!isActive) return null;

  return (
    <div className={`bg-neutral-900 border border-white/10 rounded-full ${isMobile ? 'px-4 py-2 gap-4' : 'px-6 py-3 gap-6'} flex items-center shadow-2xl z-50`}>
      <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
        <button
          onClick={prevTurn}
          disabled={currentTurnIndex === 0}
          className="text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
        >
          <SkipBack className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
        </button>
        
        <button
          onClick={togglePlay}
          className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-white text-black rounded-full flex items-center justify-center hover:bg-neutral-200 transition-colors`}
        >
          {isPlaying ? <Pause className={isMobile ? "w-4 h-4" : "w-5 h-5"} /> : <Play className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ml-1`} />}
        </button>

        <button
          onClick={nextTurn}
          disabled={currentTurnIndex >= totalTurns - 1}
          className="text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
        >
          <SkipForward className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
        </button>
      </div>

      <div className={`w-px ${isMobile ? 'h-4' : 'h-6'} bg-white/10`} />

      <button
        onClick={stopReplay}
        className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
      >
        <Square className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} fill-current`} />
        {!isMobile && "Stop"}
      </button>

      {!isMobile && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 items-end h-6">
          {turnIndicators.map((indicator) => (
            <div 
              key={indicator.index}
              className={`w-1.5 rounded-t-sm transition-all duration-300 ${
                indicator.index === currentTurnIndex ? 'h-6 bg-white' : 'h-3 bg-white/20'
              } relative group`}
            >
              {indicator.hasError && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
              )}
              {indicator.hasAutoFix && !indicator.hasError && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
              )}
              {indicator.hasWarning && !indicator.hasError && !indicator.hasAutoFix && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.8)]" />
              )}
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-[60]">
                <div className="bg-black border border-white/10 px-2 py-1 rounded text-[8px] whitespace-nowrap uppercase tracking-tighter text-white/60">
                  Turn {indicator.index + 1}
                  {indicator.hasError && <span className="text-red-500 ml-1">Error</span>}
                  {indicator.hasAutoFix && <span className="text-green-500 ml-1">Fix</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`absolute ${isMobile ? '-top-6' : '-top-8'} left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-950 px-3 py-1 rounded-full border border-white/5`}>
        {isMobile ? `${currentTurnIndex + 1}/${totalTurns}` : `Turn ${currentTurnIndex + 1} / ${totalTurns}`}
      </div>
    </div>
  );
}
