/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, ChevronRight, ChevronDown, Activity, Copy } from 'lucide-react';
import { useObservability } from '../services/observabilityService';
import { LogEvent } from '../types';

export function ObservabilityPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { logs, startGroup, addLog, startSubGroup, endGroup } = useObservability();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  // Auto-reveal on error and Initial Silent Log
  useEffect(() => {
    if (!hasInitialized.current) {
      const groupId = startGroup("UI Initialization: Silent Logging Mode");
      addLog("Configuración de visibilidad inicial: [CLOSED]", { 
        defaultOpen: false,
        backgroundService: "ACTIVE" 
      }, 'info', groupId);
      
      const subGroup = startSubGroup(groupId, "Verificación de Background Service");
      addLog("Sistema de logs activo y registrando eventos en segundo plano", {
        timestamp: new Date().toISOString(),
        status: "READY"
      }, 'success', subGroup);
      
      endGroup();
      hasInitialized.current = true;
    }

    // Auto-reveal logic: If a new error log appears and panel is closed, open it
    const lastLog = logs[logs.length - 1];
    if (lastLog?.level === 'error' && !isOpen) {
      const timeoutId = setTimeout(() => {
        setIsOpen(true);
        const groupId = startGroup("System Alert: Auto-Reveal Triggered");
        addLog("Panel abierto automáticamente debido a un error crítico", { 
          cause: lastLog.message 
        }, 'error', groupId);
        endGroup();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [logs, isOpen]);

  const toggleGroup = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedGroups(next);
  };

  const renderLog = (log: LogEvent) => {
    const isGroup = logs.some(l => l.parentId === log.id);
    const isExpanded = expandedGroups.has(log.id);
    const isDepth0 = log.depth === 0;

    return (
      <div key={log.id} style={{ paddingLeft: `${log.depth * 12}px` }} className="group">
        <div 
          className={`flex items-start gap-2 rounded transition-colors ${
            isDepth0 
              ? 'bg-neutral-900/80 my-1.5 p-2 border border-white/5' 
              : 'py-0.5 px-1 hover:bg-white/5'
          } ${isGroup || log.raw ? 'cursor-pointer' : ''}`}
          onClick={() => {
            if (isGroup || log.raw) toggleGroup(log.id);
          }}
        >
          <div className="mt-[3px] shrink-0">
            {isGroup ? (
              isExpanded ? <ChevronDown className="w-3 h-3 text-neutral-500" /> : <ChevronRight className="w-3 h-3 text-neutral-500" />
            ) : isDepth0 ? (
              <div className="w-3 h-3 flex items-center justify-center">
                <div className={`w-1.5 h-1.5 rounded-full ${log.level === 'error' ? 'bg-red-500' : log.level === 'success' ? 'bg-emerald-500' : 'bg-neutral-500'}`} />
              </div>
            ) : (
              <span className="text-neutral-600 text-[10px] font-mono select-none">—</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isDepth0 && (
                <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                </span>
              )}
              <span className={`text-[11px] font-mono truncate ${
                log.level === 'error' ? 'text-red-400' : 
                log.level === 'success' ? 'text-emerald-400' : 
                isDepth0 ? 'text-neutral-200 font-medium' : 'text-neutral-400'
              }`}>
                {log.message}
              </span>
            </div>
            {log.raw && isExpanded && (
              <motion.pre 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-1.5 p-2 bg-black/60 rounded border border-white/5 text-[10px] text-neutral-400 overflow-x-auto font-mono"
              >
                {typeof log.raw === 'string' ? log.raw : JSON.stringify(log.raw, null, 2)}
              </motion.pre>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    const groupId = startGroup(`UI Toggle: Observability Panel ${next ? 'Open' : 'Closed'}`);
    addLog(`Panel de observabilidad ${next ? 'abierto' : 'cerrado'}`, { isOpen: next }, 'info', groupId);
    endGroup();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0, scale: 0.95 }}
            animate={{ width: 384, opacity: 1, scale: 1 }}
            exit={{ width: 0, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            className="mb-4 h-[500px] bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-neutral-900/50">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Observability</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
                    addLog("Logs copiados al portapapeles", null, 'success');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-500 hover:text-white"
                  title="Copiar logs"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono text-neutral-500">{logs.length} events</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono scrollbar-hide">
              {logs.filter(l => !l.parentId || expandedGroups.has(l.parentId)).map(renderLog)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleToggle}
        className={`p-4 rounded-full shadow-2xl transition-all ${isOpen ? 'bg-white text-black' : 'bg-neutral-900 text-white hover:bg-neutral-800 border border-white/10'}`}
      >
        <Terminal className="w-5 h-5" />
      </button>
    </div>
  );
}
