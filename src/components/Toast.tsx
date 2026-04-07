import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { ToastState } from '../types';

interface ToastProps {
  toast: ToastState;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-4 py-2 bg-neutral-900 border border-white/10 rounded-full shadow-2xl backdrop-blur-md"
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
          
          <span className="text-xs font-bold text-white/90 uppercase tracking-widest">
            {toast.message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
