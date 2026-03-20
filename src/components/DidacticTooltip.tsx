import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useObservability } from '../services/observabilityService';

interface DidacticTooltipProps {
  term: string;
  definition: React.ReactNode;
  children: React.ReactNode;
}

export function DidacticTooltip({ term, definition, children }: DidacticTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const { startGroup, addLog, startSubGroup, endGroup } = useObservability();

  const handleVote = (vote: 'positive' | 'negative') => {
    const groupId = startGroup("Athanor Forge Didactic Hub: Feedback Received");
    addLog(`Término Consultado: ${term}`, null, 'info', groupId);
    addLog(`Voto de Usuario: ${vote === 'positive' ? 'Positive' : 'Negative'}`, null, vote === 'positive' ? 'success' : 'warn', groupId);
    startSubGroup("Metodología de Explicación Utilizada", groupId);
    addLog(typeof definition === 'string' ? definition : 'Complex definition', null, 'debug', groupId);
    endGroup();
    endGroup();
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen]);

  return (
    <>
      <div ref={triggerRef} className="inline-block" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
        {children}
      </div>
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="fixed z-[10000] p-4 bg-neutral-900 border border-white/10 rounded-lg shadow-xl max-w-xs text-sm text-neutral-200 font-sans"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="mb-2 font-bold text-neutral-100">{term}</div>
            <div className="mb-4">{definition}</div>
            <div className="flex gap-2">
              <button onClick={() => handleVote('positive')} className="p-1 hover:bg-white/10 rounded"><ThumbsUp className="w-4 h-4" /></button>
              <button onClick={() => handleVote('negative')} className="p-1 hover:bg-white/10 rounded"><ThumbsDown className="w-4 h-4" /></button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
