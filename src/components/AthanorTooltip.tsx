import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Info, ThumbsUp, ThumbsDown, Loader2, RefreshCw, X } from 'lucide-react';
import { useForgeLogs } from '../contexts/ForgeLogger';
import { groqService } from '../services/groqService';
import { useStore } from '../contexts/StoreContext';

interface DidacticContent {
  overview: string;
  scientific: string;
  professional: string;
  intuition: string;
  heuristic: string;
  pitfall: string;
  user_evaluation?: Record<string, number>;
  isError?: boolean;
  message?: string;
}

interface AthanorTooltipProps {
  term: string;
}

export const InfoIcon: React.FC<AthanorTooltipProps> = ({ term }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<DidacticContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<Record<string, string>>({});
  const [isVerified, setIsVerified] = useState(() => localStorage.getItem(`knowledge-verified-${term}`) === 'true');
  
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addLog, startGroup, startSubGroup, endGroup } = useForgeLogs();
  const { config } = useStore();

  const getCache = (): Record<string, DidacticContent> => {
    const cache = localStorage.getItem('athanor_didactic_cache');
    return cache ? JSON.parse(cache) : {};
  };

  const setCache = (newContent: DidacticContent) => {
    if (newContent.isError) return; // Don't cache errors
    const cache = getCache();
    cache[term] = newContent;
    localStorage.setItem('athanor_didactic_cache', JSON.stringify(cache));
  };

  const fetchContent = async (specificSection?: string) => {
    if (specificSection) {
      setRegeneratingSection(specificSection);
      setSectionError(prev => ({ ...prev, [specificSection]: '' }));
    } else {
      setIsLoading(true);
      setFetchError(null);
    }

    try {
      const apiKey = localStorage.getItem('ATHANOR_GROQ_API_KEY') || '';
      const newContent = await groqService.generateDidacticContent(
        apiKey, 
        term,
        config,
        { addLog, startGroup, startSubGroup, endGroup } as any,
        specificSection
      );
      
      if (newContent.isError) {
        setFetchError("No se puede cargar la sabiduría técnica. Revisa el prompt maestro.");
        addLog('Didactic', 'error', "Didactic Fetch Error: " + newContent.message, {});
        return;
      }

      const currentCache = getCache();
      const existingContent = currentCache[term] || content;

      const updatedContent = specificSection && existingContent 
        ? { 
            ...existingContent, 
            [specificSection]: newContent[specificSection],
            user_evaluation: {
              ...(existingContent.user_evaluation || {}),
              [specificSection]: 0 // Reset evaluation on success
            }
          }
        : { ...newContent, user_evaluation: existingContent?.user_evaluation || {} };
        
      setContent(updatedContent);
      setCache(updatedContent);
    } catch (error) {
      addLog('Didactic', 'error', "Error fetching didactic content", { error });
      if (specificSection) {
        setSectionError(prev => ({ ...prev, [specificSection]: 'Fallo al regenerar. Intenta de nuevo.' }));
        // Reset evaluation so it's not stuck in blurry state
        if (content) {
          const resetContent = {
            ...content,
            user_evaluation: {
              ...(content.user_evaluation || {}),
              [specificSection]: 0
            }
          };
          setContent(resetContent);
        }
      } else {
        setFetchError("No se puede cargar la sabiduría técnica. Revisa el prompt maestro.");
        addLog('Didactic', 'error', "Didactic Fetch Critical Error: " + (error instanceof Error ? error.message : String(error)), { error });
      }
    } finally {
      setIsLoading(false);
      setRegeneratingSection(null);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
    
    const cache = getCache();
    if (cache[term]) {
      setContent(cache[term]);
    } else if (!isLoading) {
      fetchContent();
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    if (isOpen) {
      addLog('UI', 'info', "Ephemeral Blueprints: New 6-D tooltip layout with technical indexing active", { term });
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSectionFeedback = (section: string, isPositive: boolean) => {
    if (!content || content.isError) return;

    const currentEvaluation = content.user_evaluation?.[section] || 0;
    let evaluation = isPositive ? 1 : -1;
    
    // Toggle logic for positive evaluation: If already learned (1), reset to neutral (0)
    if (isPositive && currentEvaluation === 1) {
      evaluation = 0;
    }

    const updatedContent = {
      ...content,
      user_evaluation: {
        ...(content.user_evaluation || {}),
        [section]: evaluation
      }
    };

    setContent(updatedContent);
    setCache(updatedContent);

    if (evaluation === 1) {
      addLog('Didactic', 'success', `Éxito pedagógico (${section}): ${term}`, {});
    } else if (evaluation === -1) {
      addLog('Didactic', 'warn', `Didactic Friction (${section}): ${term}`, {});
      // Automatically trigger regeneration on ThumbsDown
      fetchContent(section);
    } else {
      addLog('Didactic', 'info', `Aprendizaje revertido a neutral (${section}): ${term}`, {});
    }
  };

  const toggleVerification = () => {
    if (isVerified) {
      // Unlearn logic
      setIsVerified(false);
      localStorage.removeItem(`knowledge-verified-${term}`);
      
      // Clean evaluation in content and cache
      if (content) {
        const updatedContent = {
          ...content,
          user_evaluation: {}
        };
        setContent(updatedContent);
        setCache(updatedContent);
      }
      
      addLog('Didactic', 'info', `Conocimiento restablecido: ${term}`, {});
    } else {
      // Learn logic
      setIsVerified(true);
      localStorage.setItem(`knowledge-verified-${term}`, 'true');
      addLog('Didactic', 'success', `Término verificado globalmente: ${term}`, {});
      setIsOpen(false);
    }
  };

  const renderSection = (
    id: string, 
    label: string, 
    text: string
  ) => {
    const evaluation = content?.user_evaluation?.[id] || 0;
    const isRegenerating = regeneratingSection === id;
    const isDominado = evaluation === 1;

    return (
      <motion.div 
        animate={evaluation === -1 ? { opacity: 0.5, scale: 0.98, x: [0, -5, 5, -5, 5, 0], filter: ['contrast(100%)', 'contrast(150%) brightness(120%)', 'contrast(100%)'] } : { opacity: 1, scale: 1, x: 0, filter: 'contrast(100%) brightness(100%)' }}
        transition={{ duration: 0.4 }}
        className={`group/section transition-all duration-300 relative ${isDominado ? 'border-l-2 border-emerald-500/50 pl-3' : ''} ${evaluation === -1 ? 'grayscale blur-[1px]' : ''}`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-widest text-orange-500`}>[{label}]</span>
            {isDominado && <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
            {isRegenerating ? (
              <span className="text-[9px] font-mono text-neutral-500 animate-pulse">Regenerando...</span>
            ) : sectionError[id] ? (
              <span className="text-[9px] font-mono text-rose-500 animate-pulse">{sectionError[id]}</span>
            ) : (
              <>
                {/* ThumbsUp is always visible */}
                <button 
                  onClick={() => handleSectionFeedback(id, true)} 
                  className={`px-1.5 py-0.5 rounded transition-colors font-mono text-[10px] ${isDominado ? 'bg-emerald-500/20 text-emerald-500' : 'hover:bg-emerald-500/20 text-neutral-500'}`}
                >
                  [+]
                </button>

                {/* ThumbsDown only visible if not dominated and not neutral (if neutral, it's visible) */}
                {evaluation !== 1 && (
                  <button 
                    onClick={() => handleSectionFeedback(id, false)} 
                    className={`px-1.5 py-0.5 rounded transition-colors font-mono text-[10px] hover:bg-red-500/20 text-neutral-500`}
                  >
                    [-]
                  </button>
                )}

                {/* Refresh only visible if dominated */}
                {isDominado && (
                  <button 
                    onClick={() => fetchContent(id)} 
                    className="p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <p className={`text-xs leading-relaxed ${isDominado ? 'text-neutral-200' : 'text-neutral-400'}`}>{text}</p>
      </motion.div>
    );
  };

  return (
    <>
      <div 
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full border border-neutral-600 cursor-help opacity-40 hover:opacity-100 transition-opacity ml-1 ${isVerified ? 'border-emerald-500/50 opacity-100' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Info className={`w-2.5 h-2.5 ${isVerified ? 'text-emerald-500' : 'text-neutral-400'}`} />
      </div>
      {isOpen && createPortal(
        <motion.div 
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "circOut" }}
          style={{ originX: 0.5 }}
          ref={tooltipRef}
          className="fixed z-[99999] p-6 bg-black/90 backdrop-blur-2xl border border-zinc-800 rounded-sm shadow-2xl w-[90vw] max-w-md max-h-[80vh] overflow-y-auto font-sans bottom-10 left-1/2 -translate-x-1/2"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <h4 className="font-bold text-white text-base">{term}</h4>
            <div className="flex items-center gap-2">
              {(isLoading || regeneratingSection) && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {isLoading && !content ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Forging technical wisdom...</p>
            </div>
          ) : fetchError ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-red-500">
                <X className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">System Failure</span>
              </div>
              <p className="text-xs text-red-200/70 leading-relaxed">{fetchError}</p>
              <button 
                onClick={() => fetchContent()}
                className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                Reintentar Handshake
              </button>
            </div>
          ) : content ? (
            <div className="space-y-6">
              {renderSection('overview', '01_OVERVIEW', content.overview || "Analizando dimensión...")}
              {renderSection('scientific', '02_FOUNDATION', content.scientific || "Analizando dimensión...")}
              {renderSection('professional', '03_CONTEXT', content.professional || "Analizando dimensión...")}
              {renderSection('intuition', '04_INTUITION', content.intuition || "Analizando dimensión...")}
              {renderSection('heuristic', '05_RULE', content.heuristic || "Analizando dimensión...")}
              {renderSection('pitfall', '06_RISK', content.pitfall || "Analizando dimensión...")}

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
                  {isVerified ? 'Conocimiento verificado' : '¿Dominas este concepto?'}
                </span>
                <button 
                  onClick={toggleVerification} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-tight border ${
                    isVerified 
                      ? 'bg-neutral-800 border-white/10 text-neutral-400 hover:bg-neutral-700' 
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                  }`}
                >
                  {isVerified ? (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      Restablecer conocimiento
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="w-3 h-3" />
                      Marcar como aprendido
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500 text-xs">
              No se pudo cargar la sabiduría técnica.
            </div>
          )}
        </motion.div>,
        document.body
      )}
    </>
  );
};
