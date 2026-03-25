import { X, Copy, Terminal } from 'lucide-react';
import { ForgeLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LogInspectorModalProps {
  log: ForgeLog | null;
  onClose: () => void;
}

export function LogInspectorModal({ log, onClose }: LogInspectorModalProps) {
  if (!log) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-4 bg-neutral-900/50">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-orange-500" />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Log Inspector: {log.id}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-neutral-300">
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
          <div className="h-12 shrink-0 border-t border-white/5 flex items-center justify-end px-4 gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(log.metadata, null, 2))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors text-[10px] font-bold uppercase"
            >
              <Copy className="w-3 h-3" />
              Copy Raw
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
