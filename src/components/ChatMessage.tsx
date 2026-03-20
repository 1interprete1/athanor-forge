import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { DidacticTooltip } from './DidacticTooltip';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isGenerating?: boolean;
  logprobs?: {
    token: string;
    logprob: number;
    top_logprobs: {
      token: string;
      logprob: number;
    }[];
  }[];
}

export function ChatMessage({ role, content, isGenerating, logprobs }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 w-full ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center ${
        isUser ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`relative inline-block p-4 rounded-md ${
          isUser 
            ? 'bg-indigo-500/10 border border-indigo-500/20 text-white' 
            : 'bg-neutral-900/50 border border-white/5 text-neutral-200'
        }`}>
          {/* Animated gradient border for generating state */}
          {isGenerating && !isUser && (
            <div className="absolute inset-0 -m-[1px] rounded-md bg-[linear-gradient(90deg,transparent,rgba(6,182,212,0.5),transparent)] bg-[length:200%_100%] animate-shimmer pointer-events-none" style={{ maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', padding: '1px' }} />
          )}

          {isUser ? (
            <div className="whitespace-pre-wrap text-sm font-sans">{content}</div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-white/10 font-sans">
              {content ? (
                <div className="flex flex-wrap gap-1">
                  {content.split(/(\s+)/).map((part, i) => {
                    const tokenLogprob = logprobs?.[i];
                    return tokenLogprob ? (
                      <DidacticTooltip
                        key={i}
                        term={part}
                        definition={
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-400">Probabilidad de Token: {Math.exp(tokenLogprob.logprob).toFixed(2)}</p>
                            <div className="space-y-1">
                              {tokenLogprob.top_logprobs.map((top, j) => (
                                <div key={j} className="flex items-center gap-2 text-xs">
                                  <span className="font-mono text-neutral-500 w-12">{top.token}</span>
                                  <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${Math.exp(top.logprob) * 100}%` }} />
                                  </div>
                                  <span className="font-mono text-neutral-400 w-10 text-right">{(Math.exp(top.logprob) * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-neutral-500 mt-2">
                              Las probabilidades de token (logprobs) reflejan la confianza del modelo en la elección de esta palabra. 
                              La Temperatura ajusta la distribución de estas probabilidades.
                            </p>
                          </div>
                        }
                      >
                        <span className="cursor-help border-b border-dotted border-neutral-600 hover:bg-neutral-800 transition-colors">{part}</span>
                      </DidacticTooltip>
                    ) : (
                      <span key={i}>{part}</span>
                    );
                  })}
                </div>
              ) : (
                isGenerating && (
                  <div className="flex items-center h-5">
                    <div className="w-24 h-[2px] bg-cyan-500/20 overflow-hidden">
                      <div className="w-full h-full bg-cyan-500/60 origin-left animate-pulse-width" />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
