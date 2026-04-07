import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Clock, 
  Cpu, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Code,
  Terminal,
  Info
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { groupMessagesIntoTurns } from '../utils/turnHelper';
import { runtimeEvents, RuntimeEvent } from '../system/runtimeEvents';

export const ReplayInspector: React.FC = () => {
  const { replayState, sessions, activeSessionId } = useStore();
  const [isRawExpanded, setIsRawExpanded] = useState(false);
  const [localEvents, setLocalEvents] = useState<RuntimeEvent[]>([]);

  const activeSession = useMemo(() => 
    sessions.find(s => s.id === activeSessionId), 
    [sessions, activeSessionId]
  );

  const turns = useMemo(() => 
    activeSession ? groupMessagesIntoTurns(activeSession.messages) : [], 
    [activeSession]
  );

  const currentTurn = turns[replayState.currentTurnIndex];

  // Sync with runtimeEvents
  useEffect(() => {
    setLocalEvents([...runtimeEvents]);
    // In a real scenario, we might want to subscribe to changes if events can happen during replay
    // but usually replay is for past sessions.
  }, [replayState.currentTurnIndex]);

  const turnEvents = useMemo(() => {
    if (!currentTurn) return [];
    
    const startTime = currentTurn.user?.timestampMs || 0;
    const endTime = currentTurn.assistant?.timestampMs || Date.now();

    return localEvents.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime + 2000 // Buffer of 2s for post-response events
    );
  }, [currentTurn, localEvents]);

  if (!replayState.isActive || !currentTurn) return null;

  const duration = currentTurn.assistant?.timestampMs && currentTurn.user?.timestampMs
    ? ((currentTurn.assistant.timestampMs - currentTurn.user.timestampMs) / 1000).toFixed(2)
    : 'N/A';

  const tokens = currentTurn.assistant?.tokens || 0;
  const cost = currentTurn.assistant?.cost || 0;
  const model = currentTurn.assistant?.model || 'Desconocido';

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-80 border-l border-white/10 bg-[#0A0A0A] flex flex-col h-full overflow-hidden"
    >
      <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-white/5">
        <Activity className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/90">Replay Inspector</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* A) TURN SUMMARY */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
            <Clock className="w-3 h-3" />
            <span>Turn Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <div className="text-[10px] text-white/40 uppercase">Index</div>
              <div className="text-lg font-mono text-white">#{replayState.currentTurnIndex + 1}</div>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <div className="text-[10px] text-white/40 uppercase">Duration</div>
              <div className="text-lg font-mono text-orange-400">{duration}s</div>
            </div>
          </div>
          <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/40 uppercase">User</span>
              <span className="text-white/60 font-mono">{currentTurn.user?.timestamp}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/40 uppercase">Assistant</span>
              <span className="text-white/60 font-mono">{currentTurn.assistant?.timestamp}</span>
            </div>
          </div>
        </section>

        {/* B) MODEL DATA */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
            <Cpu className="w-3 h-3" />
            <span>Model Intelligence</span>
          </div>
          <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-3">
            <div>
              <div className="text-[10px] text-white/40 uppercase mb-1">Model ID</div>
              <div className="text-xs font-mono text-blue-400 truncate">{model}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-white/40 uppercase mb-1">Tokens</div>
                <div className="text-sm font-mono text-white">{tokens}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 uppercase mb-1">Cost</div>
                <div className="text-sm font-mono text-green-400">${cost.toFixed(6)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* C) RAW OUTPUT */}
        <section className="space-y-3">
          <button 
            onClick={() => setIsRawExpanded(!isRawExpanded)}
            className="w-full flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              <span>Raw Output</span>
            </div>
            {isRawExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          <AnimatePresence>
            {isRawExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-black p-3 rounded-lg border border-white/10 font-mono text-[10px] text-green-500/80 overflow-x-auto max-h-60 custom-scrollbar">
                  <pre>{JSON.stringify(currentTurn.assistant?.rawResponse || { error: "No raw response captured" }, null, 2)}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* D) SYSTEM EVENTS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
            <Database className="w-3 h-3" />
            <span>System Events</span>
          </div>
          
          <div className="space-y-2">
            {turnEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/20">
                <Info className="w-8 h-8 mb-2 opacity-20" />
                <span className="text-[10px] uppercase tracking-tighter">No events recorded</span>
              </div>
            ) : (
              turnEvents.map((event) => (
                <div 
                  key={event.id}
                  className={`p-2 rounded border text-[10px] leading-tight ${
                    event.type === 'runtime-error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    event.type === 'auto-fix' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                    event.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                    'bg-white/5 border-white/10 text-white/60'
                  }`}
                >
                  <div className="flex justify-between mb-1 opacity-60 font-bold uppercase tracking-tighter">
                    <span>{event.type}</span>
                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="font-mono">{event.message}</div>
                  {event.source && (
                    <div className="mt-1 text-[9px] opacity-40 italic">Source: {event.source}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="uppercase tracking-widest font-bold">Live Debugger Active</span>
        </div>
      </div>
    </motion.div>
  );
};
