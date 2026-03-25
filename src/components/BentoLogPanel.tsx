import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Terminal, Trash2, ChevronRight } from 'lucide-react';
import { useForgeLogs } from '../contexts/ForgeLogger';
import { ForgeLog } from '../types';

export function BentoLogPanel({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const { logs, clearLogs } = useForgeLogs();
  const [selectedLog, setSelectedLog] = useState<ForgeLog | null>(null);

  const getSeverityColor = (severity: ForgeLog['severity']) => {
    switch (severity) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-amber-400';
      case 'success': return 'text-emerald-400';
      case 'info': return 'text-indigo-400';
      default: return 'text-neutral-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="fixed inset-y-0 right-0 z-[999999] w-[450px] bg-neutral-950 border-l border-white/10 shadow-2xl flex flex-col"
        >
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-orange-500" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Forge Event Log</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearLogs} className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-500 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {logs.map(log => {
              const isExpanded = selectedLog?.id === log.id;
              
              return (
                <div 
                  key={log.id} 
                  className="rounded-lg border border-transparent hover:border-white/5 hover:bg-white/5 transition-colors overflow-hidden"
                >
                  <div 
                    className="p-2 flex items-start gap-2 cursor-pointer"
                    onClick={() => setSelectedLog(isExpanded ? null : log)}
                  >
                    <span className="text-[10px] font-mono text-neutral-500 shrink-0">[{log.timestamp}]</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${getSeverityColor(log.severity)}`}>[{log.category}]</span>
                    <span className="text-[11px] text-neutral-300 break-words leading-relaxed">{log.message}</span>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-2 pb-2"
                      >
                        <div className="bg-black/50 border border-white/5 rounded-md p-3 overflow-x-auto">
                          <pre className="text-[10px] font-mono text-neutral-400 leading-relaxed">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
