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
  Send
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useObservability } from '../services/observabilityService';
import { ArtifactInstance } from '../types';
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
  const { artifacts, activeArtifactId, setActiveArtifactId } = useStore();
  const { startGroup, addLog, startSubGroup, endGroup } = useObservability();
  const [view, setView] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [previewContent, setPreviewContent] = useState('');
  
  const activeArtifact = artifacts.find(a => a.id === activeArtifactId);
  
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
      addLog("Iniciando procesador de resaltado de sintaxis", { 
        engine: "Prism.js", 
        theme: "vscDarkPlus",
        typography: "Tailwind Typography v4"
      }, 'info', groupId);

      const subGroup = startSubGroup(groupId, "Buffer de Transformación Visual");
      addLog("Estado del buffer", {
        rawLength: activeArtifact.content.length,
        lines: telemetry.lines,
        version: activeArtifact.version
      }, 'info', subGroup);

      // We'll end the group after a short delay to simulate "Layout Refreshed"
      const timer = setTimeout(() => {
        addLog("Layout Refreshed", { height: scrollContainerRef.current?.scrollHeight }, 'success', groupId);
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
          addLog("Iniciando compilación de Iframe Sandbox", { 
            type: activeArtifact.type,
            size: activeArtifact.content.length 
          }, 'info', groupId);
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
      addLog("Contenido copiado exitosamente", { length: activeArtifact.content.length }, 'success', groupId);
      endGroup();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    const groupId = startGroup("Canvas Action: Close Stage");
    addLog("Cerrando panel de artefactos", { id: activeArtifactId }, 'info', groupId);
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
        "relative h-full z-50 flex flex-col bg-neutral-950 border-l border-white/10 shadow-2xl backdrop-blur-3xl",
        isExpanded ? "w-[600px]" : "w-12"
      )}
    >
      {!isExpanded ? (
        <div className="flex flex-col items-center py-6 gap-6">
          <button onClick={() => setIsExpanded(true)} className="p-2 text-neutral-500 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col gap-4">
            {artifacts.slice(-5).map(art => (
              <button 
                key={art.id}
                onClick={() => { setActiveArtifactId(art.id); setIsExpanded(true); }}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  activeArtifactId === art.id ? "bg-indigo-500 text-white" : "bg-neutral-900 text-neutral-500 hover:bg-neutral-800"
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
          <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-white/5 bg-neutral-900/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                {activeArtifact?.type === 'code' ? getLanguageIcon(activeArtifact.language) : <FileText className="w-4 h-4 text-indigo-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate max-w-[150px]">{activeArtifact?.title}</h3>
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500",
                    activeArtifact?.isStreaming ? "bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  )} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
                  <span>{activeArtifact?.language || activeArtifact?.type}</span>
                  <span className="text-neutral-700">|</span>
                  <span>{telemetry.lines} lines</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Version Selector */}
              {artifactVersions.length > 1 && (
                <div className="flex items-center bg-black/40 rounded-lg border border-white/5 p-0.5">
                  <button 
                    disabled={currentVersionIndex === 0}
                    onClick={() => navigateVersion('prev')}
                    className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="px-2 flex flex-col items-center min-w-[40px]">
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">V{activeArtifact?.version}</span>
                    <span className="text-[8px] text-neutral-600 uppercase tracking-tighter">Version</span>
                  </div>
                  <button 
                    disabled={currentVersionIndex === artifactVersions.length - 1}
                    onClick={() => navigateVersion('next')}
                    className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-500 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                <button 
                  onClick={() => setView('code')}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                    view === 'code' ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  <CodeIcon className="w-3 h-3" />
                  Code
                </button>
                <button 
                  onClick={() => setView('preview')}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5",
                    view === 'preview' ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              </div>
              
              <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                <button onClick={handleCopy} title="Copy Code" className="p-2 text-neutral-400 hover:text-white transition-colors bg-white/5 rounded-lg hover:bg-white/10">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={handleDownload} title="Download File" className="p-2 text-neutral-400 hover:text-white transition-colors bg-white/5 rounded-lg hover:bg-white/10">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={handleEditInChat} title="Edit in Chat" className="p-2 text-neutral-400 hover:text-indigo-400 transition-colors bg-white/5 rounded-lg hover:bg-white/10">
                  <Send className="w-4 h-4" />
                </button>
                <button onClick={() => setIsExpanded(false)} className="p-2 text-neutral-400 hover:text-white transition-colors">
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button onClick={handleClose} className="p-2 text-neutral-400 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto bg-neutral-950 scrollbar-hide relative"
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
                  <div className="absolute left-0 top-0 bottom-0 w-[45px] border-r border-white/5 bg-black/20 pointer-events-none z-10" />
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
                  >
                    {activeArtifact?.content || ''}
                  </SyntaxHighlighter>
                </motion.div>
              ) : (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-8 prose prose-invert prose-neutral max-w-none prose-headings:tracking-tight prose-a:text-indigo-400 prose-code:text-indigo-300 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/5"
                >
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
                      className="w-full h-[600px] bg-white rounded-xl border-none shadow-2xl"
                      title="Preview"
                    />
                  ) : (
                    <div className="text-neutral-500 italic text-center py-20">
                      No preview available for this artifact type.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer / Status */}
          <div className="p-3 border-t border-white/5 bg-neutral-900/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-neutral-600 font-mono">
                {activeArtifact?.content.length} characters · v{activeArtifact?.version}
              </span>
              {activeArtifact?.isStreaming && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">Streaming...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-neutral-600 hover:text-neutral-400 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 text-neutral-600 hover:text-neutral-400 transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
