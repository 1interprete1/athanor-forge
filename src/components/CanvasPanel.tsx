/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Code as CodeIcon, 
  Eye, 
  FileText, 
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  Terminal,
  Hash,
  Braces,
  FileJson,
  Layout,
  ChevronLeft,
  History,
  Send,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useForgeLogs } from '../contexts/ForgeLogger';
import { ArtifactInstance, ArtifactType } from '../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
});

export function CanvasPanel() {
  const { artifacts, activeArtifactId, setActiveArtifactId, sessions, activeSessionId, stagedArtifact } = useStore();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  
  // Reconstruct the active timeline to filter artifacts
  const timelineIds = useMemo(() => {
    if (!activeSession) return [];
    const allMessages = activeSession.messages;
    const branchSelections = activeSession.activeBranchIndices || {};
    
    const ids: string[] = [];
    let currentParentId: string | null = null;
    
    while (true) {
      const children = allMessages.filter(m => m.parentId === currentParentId);
      if (children.length === 0) break;
      children.sort((a, b) => a.branchIndex - b.branchIndex);
      const selectedIndex = branchSelections[currentParentId || 'root'] || 0;
      const selectedMessage = children[selectedIndex] || children[0];
      ids.push(selectedMessage.id);
      currentParentId = selectedMessage.id;
    }
    return ids;
  }, [activeSession]);

  const timelineArtifacts = useMemo(() => {
    return artifacts.filter(a => timelineIds.includes(a.messageId));
  }, [artifacts, timelineIds]);

  const activeArtifact = useMemo(() => {
    if (activeArtifactId === 'staged' && stagedArtifact) {
      const extension = stagedArtifact.name.split('.').pop()?.toLowerCase() || '';
      let type: ArtifactType = 'markdown';
      let language = extension;

      if (stagedArtifact.type === 'code') {
        type = 'code';
      } else if (stagedArtifact.type === 'json') {
        type = 'code';
        language = 'json';
      } else if (stagedArtifact.type === 'csv') {
        type = 'markdown';
        language = 'markdown';
      } else if (stagedArtifact.type === 'pdf') {
        type = 'markdown';
        language = 'markdown';
      } else if (extension === 'md') {
        type = 'markdown';
      }

      return {
        id: 'staged',
        sessionId: activeSessionId || 'staged',
        messageId: 'staged',
        type,
        language,
        title: stagedArtifact.name,
        content: stagedArtifact.content || '',
        version: 1,
        isStreaming: false,
        timestamp: Date.now()
      } as ArtifactInstance;
    }
    return timelineArtifacts.find(a => a.id === activeArtifactId);
  }, [activeArtifactId, stagedArtifact, timelineArtifacts, activeSessionId]);
  
  const [view, setView] = useState<'code' | 'preview'>('code');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const observability = useForgeLogs();
  const { addLog, startGroup, startSubGroup, endGroup } = observability;

  // Versioning logic
  const artifactVersions = useMemo(() => {
    if (!activeArtifact) return [];
    const parentId = activeArtifact.parentId || activeArtifact.id;
    return artifacts
      .filter(a => a.id === parentId || a.parentId === parentId)
      .sort((a, b) => a.version - b.version);
  }, [activeArtifact?.id, activeArtifact?.parentId, artifacts]);

  const currentVersionIndex = artifactVersions.findIndex(v => v.id === activeArtifactId);

  const mermaidRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastContentLength = useRef(0);

  // Telemetry calculations
  const telemetry = useMemo(() => {
    if (!activeArtifact) return { lines: 0, sizeKB: 0 };
    const lines = activeArtifact.content.split('\n').length;
    const sizeKB = (new Blob([activeArtifact.content]).size / 1024).toFixed(2);
    return { lines, sizeKB };
  }, [activeArtifact?.content]);

  // Observability for Render Engine
  useEffect(() => {
    if (activeArtifact) {
      const groupId = startGroup(`Canvas Render Engine: Activación de Stage [${activeArtifact.language?.toUpperCase() || activeArtifact.type.toUpperCase()}]`);
      addLog('UI', 'info', "Production Bench: Refactoring Canvas to High-Fidelity Technical Drawing Stage", { 
        engine: "Prism.js", 
        theme: "Forge Syntax",
        typography: "Tailwind Typography v4",
        groupId
      });

      const subGroup = startSubGroup(groupId, "Canvas UI Audit");
      addLog('UI', 'info', "Nuevas proporciones de panel: Expanded(600px) con zero-radius configuration", {
        rawLength: activeArtifact.content.length,
        lines: telemetry.lines,
        version: activeArtifact.version,
        subGroup
      });

      addLog('UI', 'info', "Forge Syntax: Customizing syntax highlighting tokens [Orange/Emerald/Cyan]", { groupId });

      // We'll end the group after a short delay to simulate "Layout Refreshed"
      const timer = setTimeout(() => {
        addLog('UI', 'success', "Layout Refreshed", { height: scrollContainerRef.current?.scrollHeight, groupId });
        endGroup();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [activeArtifact?.id, activeArtifact?.type]);

  // Debounced preview update
  useEffect(() => {
    if (activeArtifact && view === 'preview') {
      const timer = setTimeout(() => {
        setPreviewContent(activeArtifact.content);
        
        if (activeArtifact.type === 'html') {
          const groupId = startGroup("Canvas Runtime: Handshake de Preview / Acción");
          addLog('UI', 'info', "Iniciando compilación de Iframe Sandbox", { 
            type: activeArtifact.type,
            size: activeArtifact.content.length,
            groupId
          });
          endGroup();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeArtifact?.content, view]);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && activeArtifact?.isStreaming) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [activeArtifact?.content, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 50;
    setAutoScroll(isAtBottom);
  };

  const handleCopy = async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      const groupId = startGroup("Canvas Action: Copy to Clipboard");
      addLog('UI', 'success', "Contenido copiado exitosamente", { length: activeArtifact.content.length, groupId });
      endGroup();
    } catch (err) {
      addLog('UI', 'error', "Failed to copy to clipboard", { error: err });
    }
  };

  const handleClose = () => {
    const groupId = startGroup("Canvas Action: Close Stage");
    addLog('UI', 'info', "Cerrando panel de artefactos", { id: activeArtifactId, groupId });
    setActiveArtifactId(null);
    endGroup();
  };

  const getLanguageIcon = (lang?: string) => {
    switch (lang?.toLowerCase()) {
      case 'javascript':
      case 'typescript':
      case 'js':
      case 'ts':
        return <Braces className="w-4 h-4 text-yellow-400" />;
      case 'python':
      case 'py':
        return <Terminal className="w-4 h-4 text-blue-400" />;
      case 'html':
      case 'xml':
        return <Layout className="w-4 h-4 text-orange-400" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-emerald-400" />;
      case 'css':
        return <Hash className="w-4 h-4 text-blue-300" />;
      default:
        return <CodeIcon className="w-4 h-4 text-indigo-400" />;
    }
  };

  const handleDownload = () => {
    if (!activeArtifact) return;
    const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ext = activeArtifact.language || (activeArtifact.type === 'markdown' ? 'md' : 'txt');
    a.href = url;
    a.download = `${activeArtifact.title.replace(/\s+/g, '_')}_v${activeArtifact.version}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditInChat = () => {
    if (!activeArtifact) return;
    const input = document.querySelector('textarea') as HTMLTextAreaElement;
    if (input) {
      const text = `Basándome en el artefacto ${activeArtifact.title} v${activeArtifact.version}, realiza este cambio: `;
      input.value = text;
      input.focus();
      input.setSelectionRange(text.length, text.length);
    }
  };

  const navigateVersion = (dir: 'prev' | 'next') => {
    const newIndex = dir === 'prev' ? currentVersionIndex - 1 : currentVersionIndex + 1;
    if (newIndex >= 0 && newIndex < artifactVersions.length) {
      setActiveArtifactId(artifactVersions[newIndex].id);
    }
  };

  if (!activeArtifactId) return null;

  return (
    <motion.div
      layout
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        "relative h-full z-50 flex flex-col bg-zinc-950 border-l border-zinc-900 shadow-2xl backdrop-blur-3xl rounded-none",
        isExpanded ? "w-[600px]" : "w-12"
      )}
    >
      {!isExpanded ? (
        <div className="flex flex-col items-center py-6 gap-6">
          <button onClick={() => setIsExpanded(true)} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="w-px h-8 bg-white/5" />
            <div className="flex flex-col gap-4">
            {timelineArtifacts.slice(-5).map(art => (
              <button 
                key={art.id}
                onClick={() => { setActiveArtifactId(art.id); setIsExpanded(true); }}
                className={cn(
                  "w-8 h-8 rounded-none flex items-center justify-center transition-all",
                  activeArtifactId === art.id ? "bg-orange-500 text-white" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
                )}
              >
                {art.type === 'code' ? <CodeIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl rounded-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-none border border-white/10">
                {activeArtifact?.type === 'code' ? getLanguageIcon(activeArtifact.language) : <FileText className="w-4 h-4 text-orange-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate max-w-[150px]">
                    {activeArtifactId === 'staged' ? `[STAGING] ${activeArtifact?.title}` : activeArtifact?.title}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 bg-black/40 px-1.5 py-0.5 border border-zinc-800">
                    REVISION_ID: [V0{activeArtifact?.version}]
                  </span>
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500",
                    activeArtifact?.isStreaming ? "bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  )} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                  <span>{activeArtifact?.language || activeArtifact?.type}</span>
                  <span className="text-zinc-700">|</span>
                  <span>{telemetry.lines} lines</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Version Selector - Timeline Nav */}
              {artifactVersions.length > 1 && (
                <div className="flex items-center bg-black/40 rounded-none border border-zinc-800 p-0.5">
                  <button 
                    disabled={currentVersionIndex === 0}
                    onClick={() => navigateVersion('prev')}
                    className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="px-3 flex items-center gap-2 min-w-[60px] border-x border-zinc-800/50">
                    <span className="text-[10px] font-bold text-orange-400 font-mono">V{activeArtifact?.version}</span>
                    {activeArtifact?.isStreaming && <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />}
                  </div>
                  <button 
                    disabled={currentVersionIndex === artifactVersions.length - 1}
                    onClick={() => navigateVersion('next')}
                    className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex bg-black/20 rounded-none border-b border-zinc-800">
                <button 
                  onClick={() => setView('code')}
                  className={cn(
                    "px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2",
                    view === 'code' ? "border-orange-500 text-orange-400 bg-orange-500/5" : "text-zinc-600 border-transparent hover:text-zinc-400"
                  )}
                >
                  <CodeIcon className="w-3 h-3" />
                  Code
                </button>
                <button 
                  onClick={() => setView('preview')}
                  className={cn(
                    "px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2",
                    view === 'preview' ? "border-orange-500 text-orange-400 bg-orange-500/5" : "text-zinc-600 border-transparent hover:text-zinc-400"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              </div>
              
              <div className="flex items-center gap-1 border border-zinc-800 bg-black/40 p-1 rounded-none">
                <button onClick={handleCopy} title="Copy Code" className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-none">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={handleDownload} title="Download File" className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-none">
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  disabled={activeArtifactId === 'staged'}
                  onClick={handleEditInChat} 
                  title={activeArtifactId === 'staged' ? "Not available in staging" : "Edit in Chat"} 
                  className="p-2 text-zinc-400 hover:text-orange-400 transition-colors hover:bg-white/5 rounded-none disabled:opacity-30 disabled:hover:text-zinc-400"
                >
                  <Send className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-zinc-800 mx-1" />
                <button onClick={() => setIsExpanded(false)} className="p-2 text-zinc-400 hover:text-white transition-colors">
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button onClick={handleClose} className="p-2 text-zinc-400 hover:text-rose-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {activeArtifactId === 'staged' && (
            <div className="px-4 py-1.5 bg-orange-500/10 border-b border-orange-500/20 flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-orange-500" />
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                Inspecting local content before context injection
              </span>
            </div>
          )}

          {/* Content */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto bg-[#050505] scrollbar-hide relative"
          >
            <AnimatePresence mode="wait">
              {view === 'code' ? (
                <motion.div 
                  key="code"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full font-mono text-xs relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[45px] border-r border-zinc-800 bg-black/40 pointer-events-none z-10" />
                  <SyntaxHighlighter
                    language={activeArtifact?.language || 'text'}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '24px 24px 24px 56px',
                      background: 'transparent',
                      fontSize: '12px',
                      lineHeight: '1.6'
                    }}
                    showLineNumbers
                    lineNumberStyle={{ 
                      minWidth: '2.5em', 
                      paddingRight: '1.5em', 
                      color: '#3f3f46', 
                      textAlign: 'right',
                      userSelect: 'none'
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: 'inherit'
                      }
                    }}
                  >
                    {activeArtifact?.content || ''}
                  </SyntaxHighlighter>
                  
                  {/* Custom CSS for Forge Syntax Highlighting */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    .token.keyword { color: #f97316 !important; }
                    .token.string { color: #34d399e6 !important; }
                    .token.function { color: #22d3ee !important; }
                    .token.comment { color: #52525b !important; font-style: italic !important; }
                    .token.number, .token.boolean { color: #f59e0b !important; }
                    .token.operator, .token.punctuation { color: #71717a !important; }
                  `}} />
                </motion.div>
              ) : (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="relative h-full"
                >
                  {/* Micro-grid texture background */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                    style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '10px 10px' }} 
                  />
                  
                  {/* Scanner sweep animation */}
                  {activeArtifact?.isStreaming && (
                    <motion.div 
                      initial={{ top: '-100%' }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-orange-500/20 to-transparent z-10 pointer-events-none"
                    />
                  )}

                  <div className="p-8 prose prose-invert prose-neutral max-w-none prose-headings:tracking-tight prose-a:text-orange-400 prose-code:text-orange-300 prose-pre:bg-black/50 prose-pre:border prose-pre:border-zinc-800">
                    {activeArtifact?.type === 'markdown' ? (
                      <ReactMarkdown>{activeArtifact.content}</ReactMarkdown>
                    ) : activeArtifact?.type === 'mermaid' ? (
                      <div className="mermaid" ref={mermaidRef}>
                        {activeArtifact.content}
                      </div>
                    ) : activeArtifact?.type === 'html' ? (
                      <iframe 
                        srcDoc={previewContent || activeArtifact.content}
                        sandbox="allow-scripts"
                        className="w-full h-[600px] bg-white rounded-none border-none shadow-2xl"
                        title="Preview"
                      />
                    ) : (
                      <div className="text-zinc-500 italic text-center py-20">
                        No preview available for this artifact type.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer / Status */}
          <div className="p-3 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-zinc-600 font-mono">
                {activeArtifact?.content.length} characters · v{activeArtifact?.version}
              </span>
              {activeArtifact?.isStreaming && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Streaming...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
