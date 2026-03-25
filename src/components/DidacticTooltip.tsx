import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useForgeLogs } from '../contexts/ForgeLogger';

interface DidacticTooltipProps {
  term: string;
  definition: React.ReactNode;
  children: React.ReactNode;
}

export function DidacticTooltip({ term, definition, children }: DidacticTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const { startGroup, addLog, startSubGroup, endGroup } = useForgeLogs();
  const [voteState, setVoteState] = useState<'neutral' | 'positive' | 'negative'>('neutral');

  const handleVote = (vote: 'positive' | 'negative') => {
    setVoteState(vote);
    const groupId = startGroup("Athanor Forge Didactic Hub: Feedback Received");
    addLog('Didactic', 'info', `Término Consultado: ${term}`, { groupId });
    addLog('Didactic', vote === 'positive' ? 'success' : 'warn', `Voto de Usuario: ${vote === 'positive' ? 'Positive' : 'Negative'}`, { groupId });
    startSubGroup(groupId, "Metodología de Explicación Utilizada");
    addLog('Didactic', 'debug', typeof definition === 'string' ? definition : 'Complex definition', { groupId });
    endGroup();

    // Guardar en caché de entrenamiento
    const cache = JSON.parse(localStorage.getItem('athanor_didactic_cache') || '[]');
    const newEntry = {
      instruction: `Explain the AI term: ${term}`,
      context: "6-D Matrix Metadata: [Placeholder]", // TODO: Implementar metadatos reales
      response: typeof definition === 'string' ? definition : 'Complex definition',
      label: vote === 'positive' ? 'preferred' : 'rejected',
      model_origin: "openai/gpt-oss-120b",
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('athanor_didactic_cache', JSON.stringify([...cache, newEntry]));
    
    setTimeout(() => setIsOpen(false), 500);
  };

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
      });
    } else {
      setVoteState('neutral');
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
            initial={{ scaleX: 0, opacity: 0 }}
            animate={voteState === 'negative' ? { opacity: 0.5, scale: 0.98, x: [0, -5, 5, -5, 5, 0], filter: ['contrast(100%)', 'contrast(150%) brightness(120%)', 'contrast(100%)'] } : { scaleX: 1, opacity: 1, x: 0, filter: 'contrast(100%) brightness(100%)' }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "circOut" }}
            style={{ top: coords.top, left: coords.left, originX: 0.5 }}
            className="fixed z-[10000] p-4 bg-black/90 backdrop-blur-2xl border border-zinc-800 rounded-sm shadow-2xl max-w-[250px] w-max whitespace-normal break-words text-sm text-neutral-400 font-sans"
          >
            <div className="mb-2 font-mono font-bold text-[10px] uppercase tracking-widest text-orange-500">[{term}]</div>
            <div className="mb-4 text-xs leading-relaxed">{definition}</div>
            <div className="flex gap-2">
              <button onClick={() => handleVote('positive')} className={`px-1.5 py-0.5 rounded transition-colors font-mono text-[10px] ${voteState === 'positive' ? 'bg-emerald-500/20 text-emerald-500' : 'hover:bg-emerald-500/20 text-neutral-500'}`}>[+]</button>
              <button onClick={() => handleVote('negative')} className={`px-1.5 py-0.5 rounded transition-colors font-mono text-[10px] ${voteState === 'negative' ? 'bg-red-500/20 text-red-500' : 'hover:bg-red-500/20 text-neutral-500'}`}>[-]</button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
