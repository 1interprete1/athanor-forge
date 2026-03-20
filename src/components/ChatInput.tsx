/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Variable, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  selectedExpert: string;
  onSelectExpert: (expertId: string) => void;
  contextText: string;
  onContextChange: (text: string) => void;
}

export const EXPERTS = [
  { id: 'default', name: 'General Assistant', description: 'Helpful and versatile.' },
  { id: 'coder', name: 'Senior Developer', description: 'Expert in software engineering.' },
  { id: 'writer', name: 'Creative Writer', description: 'Focuses on storytelling and prose.' }
];

export function ChatInput({ 
  onSend, 
  disabled, 
  selectedExpert, 
  onSelectExpert,
  contextText,
  onContextChange
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showExperts, setShowExperts] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const activeExpert = EXPERTS.find(e => e.id === selectedExpert) || EXPERTS[0];

  return (
    <div className="relative p-6 bg-neutral-950 border-t border-white/5">
      <div className="max-w-3xl mx-auto relative">
        <div className="absolute -top-12 left-0 right-0 flex justify-center">
          <div className="px-3 py-1 bg-neutral-900/50 border border-white/5 rounded-full backdrop-blur-sm flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-cyan-500" />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Inference Engine Active</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 relative">
          <button 
            onClick={() => { setShowExperts(!showExperts); setShowContext(false); }}
            className={`px-3 py-1.5 border rounded-lg backdrop-blur-sm flex items-center gap-2 transition-colors ${
              showExperts || selectedExpert !== 'default' 
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">
              {selectedExpert !== 'default' ? activeExpert.name : 'Expertos'}
            </span>
          </button>
          
          <button 
            onClick={() => { setShowContext(!showContext); setShowExperts(false); }}
            className={`px-3 py-1.5 border rounded-lg backdrop-blur-sm flex items-center gap-2 transition-colors ${
              showContext || contextText.trim().length > 0
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'
            }`}
          >
            <Variable className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">
              {contextText.trim().length > 0 ? 'Contexto Activo' : 'Contexto'}
            </span>
          </button>

          <AnimatePresence>
            {showExperts && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-2 w-64 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-white/5 flex justify-between items-center bg-neutral-950/50">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Select Persona</span>
                  <button onClick={() => setShowExperts(false)} className="text-neutral-500 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {EXPERTS.map(expert => (
                    <button
                      key={expert.id}
                      onClick={() => { onSelectExpert(expert.id); setShowExperts(false); }}
                      className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                        selectedExpert === expert.id ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-white/5 text-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium">{expert.name}</div>
                        <div className="text-[10px] text-neutral-500">{expert.description}</div>
                      </div>
                      {selectedExpert === expert.id && <Check className="w-4 h-4 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {showContext && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-24 mb-2 w-80 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-white/5 flex justify-between items-center bg-neutral-950/50">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">System Context</span>
                  <button onClick={() => setShowContext(false)} className="text-neutral-500 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-3">
                  <textarea
                    value={contextText}
                    onChange={(e) => onContextChange(e.target.value)}
                    placeholder="Inject custom system instructions or context here..."
                    className="w-full h-32 bg-neutral-950 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="relative group">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Transmit command to Athanor..."
            className="w-full bg-neutral-900/80 border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none backdrop-blur-md shadow-xl disabled:opacity-50"
          />
          <button 
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-3 flex items-center justify-center gap-4">
          <span className="text-[9px] text-neutral-700 uppercase tracking-widest flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            LPU Optimized
          </span>
          <div className="w-1 h-1 rounded-full bg-neutral-800" />
          <span className="text-[9px] text-neutral-700 uppercase tracking-widest">End-to-End Encryption</span>
        </div>
      </div>
    </div>
  );
}
