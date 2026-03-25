/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Sparkles, Bot, Variable, X, Check, AlertTriangle, Paperclip, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { AttachedFile } from '../types';
import { Loader2, AlertCircle, Database } from 'lucide-react';
import { SimpleTooltip } from './SimpleTooltip';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  selectedExpert: string;
  onSelectExpert: (expertId: string) => void;
  contextText: string;
  onContextChange: (text: string) => void;
  isPilotActive?: boolean;
  pilotGhostText?: string;
  coolDown: number | null;
  tier: string;
  isDragging?: boolean;
  attachedFiles: AttachedFile[];
  onFilesAttached: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onInspectFile?: (file: AttachedFile) => void;
  stagedTokens: number;
  estimatedTokens: number;
  effectiveContextLimit: number;
  onMentionUpdate?: (mentionedIds: string[]) => void;
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
  onContextChange,
  isPilotActive,
  pilotGhostText,
  coolDown,
  tier,
  isDragging,
  attachedFiles,
  onFilesAttached,
  onRemoveFile,
  onInspectFile,
  stagedTokens,
  estimatedTokens,
  effectiveContextLimit,
  onMentionUpdate
}: ChatInputProps) {
  if (!attachedFiles) return null;
  const [input, setInput] = useState('');
  const [showExperts, setShowExperts] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBlocked = disabled || isPilotActive || coolDown !== null;
  
  // Mention Detection Logic
  const getMentions = (text: string) => {
    const matches = text.match(/@(\S+)/g) || [];
    return matches.map(m => m.slice(1));
  };

  const mentionedFileNames = getMentions(input);
  const hasMentions = mentionedFileNames.length > 0;

  const filteredFilesForMentions = attachedFiles.filter(f => 
    f.status === 'ready' && 
    (mentionFilter === '' || f.name.toLowerCase().includes(mentionFilter.toLowerCase()))
  );

  useEffect(() => {
    if (onMentionUpdate) {
      const mentionedIds = attachedFiles
        .filter(f => mentionedFileNames.includes(f.name))
        .map(f => f.id);
      onMentionUpdate(mentionedIds);
    }
  }, [input, attachedFiles, onMentionUpdate]);

  const effectiveStagedTokens = useMemo(() => {
    if (!hasMentions) return stagedTokens;
    return attachedFiles
      .filter(f => f.status === 'ready' && mentionedFileNames.includes(f.name))
      .reduce((acc, f) => acc + (f.estimatedTokens || 0), 0);
  }, [hasMentions, mentionedFileNames, attachedFiles, stagedTokens]);

  const totalContext = estimatedTokens + effectiveStagedTokens;
  const isSaturated = totalContext > effectiveContextLimit;
  const isTense = totalContext > effectiveContextLimit * 0.85;

  const handleSend = () => {
    if (isBlocked || isSaturated) return;
    if (input.trim() || attachedFiles.length > 0) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onFilesAttached(newFiles);
    }
  };

  const insertMention = (fileName: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = input.slice(0, cursor);
    const lastAt = textBefore.lastIndexOf('@');
    const textAfter = input.slice(cursor);
    
    const newInput = input.slice(0, lastAt) + `@${fileName} ` + textAfter;
    setInput(newInput);
    setShowMentions(false);
    setMentionFilter('');
    
    // Refocus and set cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = lastAt + fileName.length + 2;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredFilesForMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredFilesForMentions.length) % filteredFilesForMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredFilesForMentions[mentionIndex]) {
          insertMention(filteredFilesForMentions[mentionIndex].name);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    const cursor = e.target.selectionStart;
    const textBefore = value.slice(0, cursor);
    const lastAt = textBefore.lastIndexOf('@');
    
    if (lastAt !== -1 && !textBefore.slice(lastAt).includes(' ')) {
      setShowMentions(true);
      setMentionFilter(textBefore.slice(lastAt + 1));
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const activeExpert = EXPERTS.find(e => e.id === selectedExpert) || EXPERTS[0];
  const { config } = useStore();

  return (
    <div className="relative p-6 bg-[#0a0a0a] border-t border-zinc-800/50 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto relative">
        {config.jsonMode && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-tight">
              Nota: Debes incluir la palabra 'JSON' en tu prompt para que este modo funcione correctamente.
            </span>
          </motion.div>
        )}

        <div className="absolute -top-12 left-0 right-0 flex justify-center">
          <div className={`px-3 py-1 border rounded-full backdrop-blur-sm flex items-center gap-2 ${coolDown !== null ? 'bg-amber-500/10 border-amber-500/40' : (tier === 'FREE' && isPilotActive ? 'bg-violet-500/10 border-violet-500/40' : 'bg-neutral-900/50 border-white/5')}`}>
            <Sparkles className={`w-3 h-3 ${coolDown !== null ? 'text-amber-500' : (tier === 'FREE' && isPilotActive ? 'text-violet-500' : 'text-cyan-500')}`} />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
              {coolDown !== null ? `LPU Saturada. Enfriamiento en curso: ${coolDown}s` : (tier === 'FREE' && isPilotActive ? '[PILOTING - ECONOMY MODE] Auditando con bajo consumo...' : 'Inference Engine Active')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 relative">
          <button 
            onClick={() => { setShowExperts(!showExperts); setShowContext(false); }}
            disabled={isBlocked}
            className={`px-3 py-1.5 border rounded-lg backdrop-blur-sm flex items-center gap-2 transition-colors ${
              showExperts || selectedExpert !== 'default' 
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
            } ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">
              {selectedExpert !== 'default' ? activeExpert.name : 'Expertos'}
            </span>
          </button>
          
          <button 
            onClick={() => { setShowContext(!showContext); setShowExperts(false); }}
            disabled={isBlocked}
            className={`px-3 py-1.5 border rounded-lg backdrop-blur-sm flex items-center gap-2 transition-colors ${
              showContext || contextText.trim().length > 0
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'
            } ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
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

        {/* Context Chips Container */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-3 overflow-hidden"
            >
              {attachedFiles.map((file, i) => (
                <motion.div 
                  key={file.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: hasMentions && !mentionedFileNames.includes(file.name) ? 0.3 : 1 
                  }}
                  onClick={() => file.status === 'ready' && onInspectFile?.(file)}
                  className={`px-2 py-1 rounded-sm flex items-center gap-2 group transition-all duration-300 border ${
                    file.status === 'error' 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : file.status === 'ready'
                        ? 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.1)] cursor-zoom-in hover:border-orange-500/60'
                        : 'bg-zinc-800/50 border-zinc-700'
                  }`}
                >
                  {file.status === 'processing' ? (
                    <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
                  ) : file.status === 'error' ? (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  ) : (
                    <FileText className={`w-3 h-3 ${file.status === 'ready' ? 'text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'text-zinc-500'}`} />
                  )}
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] max-w-[100px] truncate ${file.status === 'error' ? 'text-red-400' : 'text-zinc-300'}`}>
                        {file.name}
                      </span>
                      {file.status === 'processing' && file.pageCount !== undefined && (
                        <span className="text-[8px] font-mono text-zinc-500">
                          [Páginas: {file.pageCount}]
                        </span>
                      )}
                      {file.status === 'ready' && file.estimatedTokens !== undefined && (
                        <SimpleTooltip content="Este valor representa la carga estimada en el Horizonte de Contexto de tu modelo activo.">
                          <span className="text-[8px] font-mono text-orange-500/70 bg-orange-500/5 px-1 rounded-xs">
                            [{file.estimatedTokens >= 1000 ? (file.estimatedTokens / 1000).toFixed(1) + 'k' : file.estimatedTokens} TKN]
                          </span>
                        </SimpleTooltip>
                      )}
                    </div>
                    {file.status === 'error' && (
                      <span className="text-[8px] text-red-500/70 leading-none truncate max-w-[100px]">
                        {file.errorMessage || 'Error'}
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveFile(i); }}
                    className="text-zinc-500 hover:text-white transition-colors ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          className={`relative group rounded-2xl transition-all duration-300 border ${
            isDragging 
              ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
              : 'border-zinc-800'
          }`}
          animate={isDragging ? { scale: 1.01 } : { scale: 1 }}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept=".pdf,.txt,.js,.py,.json,.csv"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isBlocked}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-orange-500 transition-colors disabled:opacity-50"
            title="Attach Files"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={isPilotActive ? pilotGhostText : input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isBlocked}
            placeholder={coolDown !== null ? `LPU Saturada. Enfriamiento en curso: ${coolDown}s` : (isPilotActive ? "[PILOTING] Escribiendo prompt de auditoría..." : "Transmit command to Athanor...")}
            className="w-full bg-zinc-900/50 rounded-2xl py-4 pl-12 pr-16 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition-all resize-none backdrop-blur-md shadow-xl disabled:opacity-50"
          />
          <button 
            onClick={handleSend}
            disabled={isBlocked || isSaturated || (!input.trim() && attachedFiles.length === 0)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-300 ${
              isSaturated 
                ? 'bg-red-500 text-white animate-pulse' 
                : isTense 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-white text-black hover:bg-indigo-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaturated ? <AlertCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>

          {stagedTokens > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                scale: isSaturated ? [1, 1.05, 1] : 1
              }}
              transition={{ 
                scale: { repeat: Infinity, duration: 1 }
              }}
              className={`absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-md pointer-events-none border transition-colors duration-300 ${
                isSaturated 
                  ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                  : isTense 
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                    : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
              }`}
            >
              <Database className={`w-3 h-3 ${isSaturated ? 'text-red-500' : isTense ? 'text-amber-500' : 'text-orange-500'}`} />
              <span className="text-[9px] font-mono uppercase tracking-tighter whitespace-nowrap">
                {isSaturated ? 'CONTEXT_OVERLOAD' : 'PENDING_CONTEXT'}: {effectiveStagedTokens >= 1000 ? (effectiveStagedTokens / 1000).toFixed(1) + 'k' : effectiveStagedTokens} TKN
              </span>
            </motion.div>
          )}

          {/* Mention Popover */}
          <AnimatePresence>
            {showMentions && filteredFilesForMentions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-4 w-64 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60]"
              >
                <div className="p-2 border-b border-white/5 bg-neutral-950/50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-2">Mencionar Archivo</span>
                  <Database className="w-3 h-3 text-orange-500/50 mr-2" />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {filteredFilesForMentions.map((file, idx) => (
                    <button
                      key={file.id}
                      onClick={() => insertMention(file.name)}
                      onMouseEnter={() => setMentionIndex(idx)}
                      className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${
                        mentionIndex === idx ? 'bg-orange-500/20 text-orange-300' : 'hover:bg-white/5 text-neutral-400'
                      }`}
                    >
                      <FileText className={`w-3.5 h-3.5 ${mentionIndex === idx ? 'text-orange-400' : 'text-zinc-500'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate">{file.name}</span>
                        <span className="text-[8px] font-mono opacity-50 uppercase tracking-tighter">
                          {file.estimatedTokens} TKN
                        </span>
                      </div>
                      {mentionIndex === idx && (
                        <div className="ml-auto text-[8px] font-mono text-orange-500/50">ENTER</div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
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
