import { Bot, User, ThumbsUp, ThumbsDown, Edit2, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { DidacticTooltip } from './DidacticTooltip';
import { useForgeLogs } from '../contexts/ForgeLogger';
import { useStore } from '../contexts/StoreContext';
import { BranchSwitcher } from './BranchSwitcher';
import { useState } from 'react';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  cost?: number;
  tps?: number;
  ttft?: number;
  jsonMode?: boolean;
  isGenerating?: boolean;
  branchIndex?: number;
  totalBranches?: number;
  onSwitchBranch?: (direction: 'prev' | 'next') => void;
  onCreateBranch?: (newContent: string) => void;
  logprobs?: {
    token: string;
    logprob: number;
    top_logprobs: {
      token: string;
      logprob: number;
    }[];
  }[];
}

export function ChatMessage({ 
  id,
  role, 
  content, 
  timestamp,
  cost, 
  tps,
  ttft,
  jsonMode, 
  isGenerating, 
  logprobs,
  branchIndex = 0,
  totalBranches = 1,
  onSwitchBranch,
  onCreateBranch
}: ChatMessageProps) {
  const isUser = role === 'user';
  const { addLog } = useForgeLogs();
  const { usdToMxnRate } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [feedbackState, setFeedbackState] = useState<'none' | 'positive' | 'negative'>('none');

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedbackState(type);
    addLog('Feedback', type === 'positive' ? 'success' : 'error', `Feedback: ${type}`, { content });
    
    if (type === 'negative') {
      // Trigger regeneration logic here if needed, similar to AF-127
      // For now, we just log it and show the state
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== content && onCreateBranch) {
      onCreateBranch(editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const displayTime = timestamp || new Date().toLocaleTimeString('es-MX', { hour12: false });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1.5 w-full max-w-3xl mx-auto group/msg"
    >
      <div className="flex items-center justify-between px-1">
        <div className={`font-mono text-[9px] font-medium tracking-tighter uppercase flex items-center gap-1.5 ${isUser ? 'text-indigo-400' : 'text-cyan-400'}`}>
          <span>[{displayTime}]</span>
          {isUser ? (
            <span>USR_SIG &gt;</span>
          ) : (
            <span>LPU_OUT &gt; [120B_ENGINE]</span>
          )}
        </div>
        
        {totalBranches > 1 && onSwitchBranch && (
          <div className="flex items-center gap-2">
            <BranchSwitcher 
              currentIndex={branchIndex}
              total={totalBranches}
              onPrev={() => onSwitchBranch('prev')}
              onNext={() => onSwitchBranch('next')}
            />
          </div>
        )}
      </div>
      
      <div className={`relative pl-4 border-l transition-all duration-500 ${
        isGenerating && !isUser 
          ? 'border-solid border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
          : 'border-dashed border-zinc-800'
      } text-left`}>
        {/* Connection Node */}
        <div className="absolute -left-[2px] top-0 w-[3px] h-[3px] bg-zinc-700 rounded-full" />

        {/* Animated gradient border for generating state */}
        {isGenerating && !isUser && (
          <div className="absolute left-[-1px] top-0 bottom-0 w-[1px] bg-[linear-gradient(180deg,transparent,rgba(6,182,212,0.8),transparent)] bg-[length:100%_200%] animate-shimmer pointer-events-none" />
        )}

        {isUser ? (
          isEditing ? (
            <div className="space-y-3 min-w-[300px] py-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-black/40 border border-indigo-500/30 rounded-md p-3 text-sm font-sans text-white focus:outline-none focus:border-indigo-500/60 min-h-[100px] resize-none"
                autoFocus
              />
              <div className="flex justify-start gap-2">
                <button 
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3" /> Guardar y Bifurcar
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative py-1">
              <div className="whitespace-pre-wrap text-sm font-sans text-white leading-relaxed">{content}</div>
              {!isGenerating && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="absolute -left-10 top-0 p-1.5 rounded-md bg-white/5 border border-white/10 text-neutral-500 opacity-0 group-hover:opacity-100 transition-all hover:text-white hover:bg-white/10"
                  title="Editar mensaje"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-white/10 font-sans text-neutral-200 py-1">
            {jsonMode ? (
              <ReactMarkdown>{content ? `\`\`\`json\n${content}\n\`\`\`` : ''}</ReactMarkdown>
            ) : content ? (
              <div className="flex flex-wrap gap-1">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="leading-relaxed inline">{children}</p>,
                    code: ({ node, inline, className, children, ...props }: any) => {
                      if (inline) {
                        return <code className="bg-zinc-900 text-cyan-400 px-1 rounded" {...props}>{children}</code>;
                      }
                      return (
                        <pre className="bg-neutral-950 border border-white/10 p-4 rounded-none my-4 overflow-x-auto scrollbar-hide">
                          <code className="text-cyan-400 font-mono text-xs" {...props}>{children}</code>
                        </pre>
                      );
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
                {isGenerating && (
                  <span className="inline-block w-2 h-4 bg-orange-500 animate-terminal-caret ml-1 align-middle shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                )}
              </div>
            ) : (
              isGenerating && (
                <div className="flex items-center h-5">
                  <span className="inline-block w-2 h-4 bg-orange-500 animate-terminal-caret align-middle shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                </div>
              )
            )}
          </div>
        )}

        {!isUser && content && !isGenerating && (
          <div className="mt-3 group/telemetry relative h-[18px] bg-zinc-900/30 flex items-center px-2 transition-colors hover:bg-zinc-800/50 overflow-hidden">
            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest flex items-center gap-2 transition-colors group-hover/telemetry:text-zinc-300 w-full">
              <span>LPU_STATS &gt;&gt;</span>
              <span>[TPS: <span className="group-hover/telemetry:text-orange-400 transition-colors">{tps?.toFixed(1) || '0.0'}</span>]</span>
              <span>//</span>
              <span>[TTFT: <span className="group-hover/telemetry:text-cyan-400 transition-colors">{ttft?.toFixed(0) || '0'}</span>ms]</span>
              <span>//</span>
              <span className="flex items-center">
                [COST: ${cost ? cost.toFixed(5) : '0.00000'} USD
                <span className="inline-block max-w-0 opacity-0 group-hover/telemetry:max-w-[100px] group-hover/telemetry:opacity-100 group-hover/telemetry:ml-1 transition-all duration-300 ease-out overflow-hidden whitespace-nowrap">
                  &gt; MXN_[${((cost || 0) * usdToMxnRate).toFixed(4)}]
                </span>
                ]
              </span>
              
              <div className="ml-auto flex items-center gap-2 opacity-0 group-hover/telemetry:opacity-100 transition-opacity">
                {feedbackState === 'positive' ? (
                  <span className="text-emerald-400 px-1">[ASSIMILATED]</span>
                ) : feedbackState === 'negative' ? (
                  <span className="text-rose-400 px-1 animate-pulse">[POOR]</span>
                ) : (
                  <>
                    <button 
                      onClick={() => handleFeedback('positive')} 
                      className="text-zinc-500 hover:text-emerald-400 transition-colors hover:bg-white/5 px-1"
                    >
                      [GOOD]
                    </button>
                    <button 
                      onClick={() => handleFeedback('negative')} 
                      className="text-zinc-500 hover:text-rose-400 transition-colors hover:bg-white/5 px-1"
                    >
                      [POOR]
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
