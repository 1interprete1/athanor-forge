import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Shield, AlertTriangle, Terminal, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { BUG_REGISTRY, SystemBug } from '../system/bugRegistry';
import { RuntimeEvent, subscribeToRuntimeEvents } from '../system/runtimeEvents';

export const BugRegistry: React.FC = () => {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [view, setView] = useState<'bugs' | 'events'>('bugs');

  useEffect(() => {
    return subscribeToRuntimeEvents(setEvents);
  }, []);

  const getStatusColor = (status: SystemBug['status']) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'identified': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'in-progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getSeverityColor = (severity: SystemBug['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-400 font-mono text-[11px] border-l border-zinc-800/50">
      <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-500" />
            <span className="uppercase tracking-widest font-bold text-zinc-200">Registry</span>
          </div>
          <div className="flex bg-zinc-800/50 rounded-lg p-0.5">
            <button 
              onClick={() => setView('bugs')}
              className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-colors ${view === 'bugs' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Hardcoded Bugs
            </button>
            <button 
              onClick={() => setView('events')}
              className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold transition-colors flex items-center gap-1 ${view === 'events' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Runtime Events
              {events.length > 0 && (
                <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full text-[8px]">
                  {events.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded-full bg-zinc-800 text-[9px] text-zinc-500 border border-zinc-700/50">
            {view === 'bugs' ? `${BUG_REGISTRY.length} ENTRIES` : `${events.length} EVENTS`}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {view === 'bugs' ? (
          BUG_REGISTRY.map((bug) => (
          <motion.div 
            key={bug.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-bold text-xs">{bug.id}</span>
                <div className={`px-1.5 py-0.5 rounded text-[9px] border uppercase font-bold ${getStatusColor(bug.status)}`}>
                  {bug.status}
                </div>
                <div className={`px-1.5 py-0.5 rounded text-[9px] border uppercase font-bold ${getSeverityColor(bug.severity)}`}>
                  {bug.severity}
                </div>
                {bug.status === 'resolved' && (
                  <div className="flex items-center gap-1 text-[8px] text-emerald-500/50 uppercase font-black tracking-tighter">
                    <Shield className="w-2 h-2" /> Verified
                  </div>
                )}
              </div>
              <span className="text-[9px] text-zinc-600">
                {new Date(bug.dateFound).toLocaleDateString()}
              </span>
            </div>
            
            <h4 className="text-zinc-200 font-bold mb-2 group-hover:text-white transition-colors text-sm">
              {bug.title}
            </h4>
            
            <p className="text-zinc-400 leading-relaxed mb-3">
              {bug.description}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 rounded bg-black/40 border border-zinc-800/50">
                <div className="text-zinc-600 mb-1 uppercase text-[8px] font-bold">Category</div>
                <div className="text-zinc-300">{bug.category}</div>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800/50">
                <div className="text-zinc-600 mb-1 uppercase text-[8px] font-bold">Type</div>
                <div className="text-zinc-300">{bug.type}</div>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800/50 col-span-2">
                <div className="text-zinc-600 mb-1 uppercase text-[8px] font-bold">Location</div>
                <div className="text-zinc-300 font-mono text-[9px] break-all">{bug.location}</div>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800/50 col-span-2">
                <div className="text-zinc-600 mb-1 uppercase text-[8px] font-bold">Trigger</div>
                <div className="text-zinc-300">{bug.trigger}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-2 rounded bg-red-950/10 border border-red-900/20">
                <div className="text-red-500/70 mb-1 uppercase text-[8px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Root Cause
                </div>
                <div className="text-zinc-300">{bug.rootCause}</div>
              </div>
              <div className="p-2 rounded bg-orange-950/10 border border-orange-900/20">
                <div className="text-orange-500/70 mb-1 uppercase text-[8px] font-bold">Impact</div>
                <div className="text-zinc-300">{bug.impact}</div>
              </div>
            </div>

            {bug.status === 'resolved' && bug.dateResolved && (
              <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center gap-1 text-[9px] text-zinc-500 italic">
                <CheckCircle className="w-3 h-3 text-emerald-500/50" />
                Resolved on {new Date(bug.dateResolved).toLocaleDateString()}
              </div>
            )}
          </motion.div>
        ))) : (
          events.slice().reverse().map((event) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg border transition-colors group ${
                event.type === 'runtime-error' ? 'border-red-900/30 bg-red-950/10 hover:bg-red-950/20' :
                event.type === 'auto-fix' ? 'border-emerald-900/30 bg-emerald-950/10 hover:bg-emerald-950/20' :
                event.type === 'warning' ? 'border-orange-900/30 bg-orange-950/10 hover:bg-orange-950/20' :
                'border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className={`w-3 h-3 ${
                    event.type === 'runtime-error' ? 'text-red-500' :
                    event.type === 'auto-fix' ? 'text-emerald-500' :
                    event.type === 'warning' ? 'text-orange-500' :
                    'text-zinc-500'
                  }`} />
                  <span className="text-zinc-300 font-bold text-[10px] uppercase">{event.type}</span>
                </div>
                <span className="text-[9px] text-zinc-600">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <h4 className="text-zinc-200 font-bold mb-2 text-xs break-words">
                {event.message}
              </h4>
              
              <div className="text-[9px] text-zinc-500 mb-2 break-all">
                <span className="font-bold text-zinc-600 mr-1">SOURCE:</span>
                {event.source}
              </div>

              {event.context && (
                <div className="mt-2 p-2 rounded bg-black/40 border border-zinc-800/50 overflow-x-auto">
                  <pre className="text-[9px] text-zinc-400">
                    {JSON.stringify(event.context, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

