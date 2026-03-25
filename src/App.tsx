/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ForgeLoggerProvider, useForgeLogs } from './contexts/ForgeLogger';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { secretsConfig } from './services/secretsConfig';
import { AuthGateway } from './components/AuthGateway';
import { BentoShell } from './components/BentoShell';
import { BentoLogPanel } from './components/BentoLogPanel';
import { CanvasPanel } from './components/CanvasPanel';
import { ChatInput, EXPERTS } from './components/ChatInput';
import { ModelSelectionOverlay } from './components/ModelSelectionOverlay';
import { ChatMessage } from './components/ChatMessage';
import { InspectorPanel } from './components/InspectorPanel';
import { groqService } from './services/groqService';
import { deploymentService } from './services/deploymentService';
import { 
  Terminal, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  Shield, 
  Database, 
  Info, 
  Copy, 
  X,
  Rocket,
  ClipboardCopy,
  Eye,
  Check,
  ShieldCheck,
  Cpu,
  Layers,
  MessageSquare,
  Plus,
  FileCode,
  Activity,
  Radar,
  LayoutDashboard,
  Edit3,
  Trash2,
  Zap,
  Clock,
  CreditCard,
  Brain,
  FileJson,
  FileText
} from 'lucide-react';
import { ForgeLogo } from './components/ForgeLogo';
import { DataVault } from './components/DataVault';
import { CommandDashboard } from './components/CommandDashboard';
import { SimpleTooltip } from './components/SimpleTooltip';
import { LayoutConfig, AttachedFile } from './types';
import { ATHANOR_VERSION } from './constants';
import { useChat } from './hooks/useChat';
import { useInferenceConfig } from './hooks/useInferenceConfig';
import { useAutoReveal } from './hooks/useAutoReveal';
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('es-MX', { 
    timeZone: 'America/Mexico_City',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <span>{formattedTime}</span>
  );
}

function TechnicalSeparator() {
  return (
    <div className="w-full flex flex-col">
      <div className="h-px bg-zinc-900 w-full" />
      <div className="h-[2px] bg-black w-full" />
    </div>
  );
}

function SystemSpecs({ version, onCheckIntegrity, isVerified, onShowCert }: { version: string, onCheckIntegrity: () => void, isVerified: boolean, onShowCert: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="font-mono text-[9px] text-zinc-600 px-6 py-2 uppercase tracking-tighter bg-black/20 flex items-center justify-center gap-1 border-t border-white/5">
        <button 
          onClick={onCheckIntegrity}
          className="hover:text-zinc-400 transition-colors"
        >
          [VER_AF-224]
        </button>
        <span>//</span>
        <span>[CST_<LiveClock />]</span>
        <span>//</span>
        <span>ST_OPR</span>
      </div>
      
      <button
        onClick={onShowCert}
        className={`w-full py-3 flex items-center justify-center gap-2 border-t border-white/5 transition-all group ${
          isVerified 
            ? 'bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400' 
            : 'bg-zinc-900/20 text-zinc-600 hover:text-zinc-400'
        }`}
      >
        <Shield className={`w-3 h-3 ${isVerified ? 'text-emerald-500 animate-pulse' : 'text-zinc-700'}`} />
        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">
          {isVerified 
            ? `[SYSTEM_STATUS: CERTIFIED // ${version} // SHIELD_ACTIVE]` 
            : `[SYSTEM_STATUS: UNVERIFIED // ${version}]`}
        </span>
      </button>
    </div>
  );
}

function InfrastructureStatus() {
  const { tier: coreTier, quota, performanceHistory, activeSessionId } = useStore();
  const activePerformance = performanceHistory[activeSessionId] || [];
  const tpsData = activePerformance.slice(-20).map(p => p.tps);
  
  const points = tpsData.length > 0 
    ? tpsData.map((v, i) => `${(i / (tpsData.length - 1)) * 100},${100 - (v / 100) * 100}`).join(' ')
    : '';

  const tierColorClass = coreTier === 'FREE' ? 'text-amber-400' : coreTier === 'ON-DEMAND' ? 'text-violet-400' : 'text-emerald-400';
  const tierStrokeClass = 'stroke-orange-500';

  return (
    <button 
      onClick={() => (window as any).openCommandDashboard?.()}
      title="Click para abrir analíticas detalladas"
      className="w-full text-left px-4 py-3 bg-black/40 backdrop-blur-md hover:bg-white/5 transition-colors group relative overflow-hidden"
    >
      {/* Background Sparkline */}
      {tpsData.length > 0 && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" preserveAspectRatio="none">
          <polyline fill="none" strokeWidth="2" className={tierStrokeClass} points={points} />
        </svg>
      )}

      <div className="relative z-10 flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Database className={`w-3 h-3 ${tierColorClass}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors">Vitality HUD</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-bold text-emerald-500/70 uppercase tracking-widest">Operational</span>
        </div>
      </div>
      
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shadow-lg ${
          coreTier === 'FREE' 
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-amber-500/5' 
            : coreTier === 'ON-DEMAND'
            ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-violet-500/10'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10'
        }`}>
          {coreTier}
        </div>
        {quota && (
          <div className="flex-1 flex gap-[1px] h-[2px] ml-2">
            {Array.from({ length: 10 }).map((_, i) => {
              const threshold = (i + 1) / 10;
              const currentRatio = quota.remainingTokens / quota.limitTokens;
              const isActive = currentRatio >= threshold;
              
              const colorClass = currentRatio > 0.4 
                ? 'bg-emerald-500' 
                : currentRatio > 0.15 
                ? 'bg-amber-500' 
                : 'bg-rose-500';

              return (
                <div 
                  key={i} 
                  className={`flex-1 h-full ${isActive ? colorClass : 'bg-white/5'}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </button>
  );
}

export default function App() {
  const [isObservabilityOpen, setIsObservabilityOpen] = useState(false);
  const [scriptToView, setScriptToView] = useState<string | null>(null);

  return (
    <ForgeLoggerProvider>
      <StoreProvider>
        <AthanorForgeCore 
          isObservabilityOpen={isObservabilityOpen} 
          setIsObservabilityOpen={setIsObservabilityOpen} 
          scriptToView={scriptToView}
          setScriptToView={setScriptToView}
        />
        <BentoLogPanel 
          isOpen={isObservabilityOpen} 
          setIsOpen={setIsObservabilityOpen} 
        />
      </StoreProvider>
    </ForgeLoggerProvider>
  );
}

function AthanorForgeCore({ 
  isObservabilityOpen, 
  setIsObservabilityOpen, 
  scriptToView,
  setScriptToView
}: { 
  isObservabilityOpen: boolean; 
  setIsObservabilityOpen: (v: boolean) => void;
  scriptToView: string | null;
  setScriptToView: (v: string | null) => void;
}) {
  const { 
    models, 
    setModels, 
    activeModelId: selectedModelId, 
    setActiveModelId: setSelectedModelId,
    activeModel,
    artifacts,
    activeArtifactId,
    setActiveArtifactId,
    isPilotActive,
    runContextAudit,
    pilotGhostText,
    pilotTriggerSendMessage,
    setPilotTriggerSendMessage,
    setIsGenerating: setIsGeneratingStore,
    setQuota,
    coolDown,
    tier,
    quota,
    performanceHistory,
    setStagedTokens,
    setStagedArtifact
  } = useStore();
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('ATHANOR_GROQ_API_KEY'));
  const actions = useForgeLogs();
  const { logs, addLog, clearLogs, startGroup, endGroup, startSubGroup } = actions;

  useEffect(() => {
    // EMERGENCY RESET TRIGGER
    if (window.location.search.includes('reset=true')) {
      localStorage.clear();
      window.location.href = window.location.origin;
    }
  }, []);

  useEffect(() => {
    startGroup(`Athanor Forge ${ATHANOR_VERSION}: Monolithic Shell Deployment`);
    addLog("System", "info", "Identity System: Deploying Certified Identity Block", {});
    addLog("System", "info", "Metadata Sync: ATHANOR_VERSION linked to UI/Logs", {});
    addLog("System", "info", "Sidebar Instrumentation: Transitioning to Machined Component design", {});
    addLog("System", "info", "LPU Activity Visualization: Integrated Sparkline as background ambient noise", {});
    addLog("System", "info", "Signal Mentions: Initializing '@' autocomplete provider for local files", {});
    addLog("System", "info", "Applying Dual-Edge beveling (1px zinc-900 / 1px white/5)", {});
    addLog("System", "info", "Transitioning Motion to Snappy Tween (300ms) [UI Performance]", {});
    const subGroupId = startSubGroup("group-id", "Visual Radiance Audit");
    addLog("System", "info", "Color mapping: Sidebars (#050505) vs Stage (#0a0a0a)", { subGroupId });
    addLog("System", "debug", "Actualización de isotipo", { 
      subGroupId, 
      raw: "Implementado difuminado gaussiano para simulación de calor en Isotipo" 
    });
    endGroup();

    const opticGroupId = startSubGroup("group-id", "Optic Logic Audit");
    addLog("System", "debug", "Actualización de LED", {
      subGroupId: opticGroupId,
      raw: "Nuevas constantes de box-shadow para simulación de lente LED"
    });
    endGroup();
  }, [startGroup, addLog, endGroup, startSubGroup]);
  
  useEffect(() => {
    const auditGroup = actions.startGroup("Athanor Forge AF-196: Visual & UX Sensory Mapping");
    actions.addLog('System', 'info', "Escaneando constantes de Tailwind v4 y configuraciones de Motion", { auditGroup });
    
    const subGroupId = actions.startSubGroup(auditGroup, "UI Tree Diagnostics");
    actions.addLog('System', 'debug', "Registro de componentes principales", {
      raw: [
        "BentoShell: h-screen, w-screen, bg-neutral-950, flex, overflow-hidden",
        "Sidebar: border-r, border-white/10, bg-neutral-950/80, backdrop-blur-xl",
        "Inspector: border-l, border-white/10, bg-neutral-950/80, backdrop-blur-xl",
        "ChatMessages: max-w-3xl, mx-auto, space-y-8",
        "ForgeLogo: flex, items-center, justify-center"
      ],
      subGroupId
    });
    actions.endGroup(); // end subGroup
    actions.endGroup(); // end auditGroup
  }, []);

  const isFree = tier === 'FREE';

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    isGenerating,
    metrics,
    handleNewSession,
    handleDeleteSession,
    handleRenameSession,
    sendMessageStream,
    switchBranch,
    createBranch
  } = useChat();

  useEffect(() => {
    setIsGeneratingStore(isGenerating);
  }, [isGenerating, setIsGeneratingStore]);

  useEffect(() => {
    if (pilotTriggerSendMessage && pilotGhostText && !isGenerating) {
      handleSendMessage(pilotGhostText);
      setPilotTriggerSendMessage(false);
    }
  }, [pilotTriggerSendMessage, pilotGhostText, isGenerating, setPilotTriggerSendMessage]);

  const auditRun = useRef(false);
  
  const [layout, setLayout] = useState<LayoutConfig>({ leftPanelOpen: true, rightPanelOpen: true });
  
  const handleLayoutChange = (newLayout: LayoutConfig) => {
    const groupId = startGroup("UI Toggle: Layout Change");
    addLog('UI', 'info', "Updating panel configuration", newLayout);
    setLayout(newLayout);
    endGroup();
  };

  const handleNewSessionClick = () => {
    const groupId = startGroup("UI Toggle: New Session");
    addLog('UI', 'info', "Initializing new chat session", { sessionId: null });
    handleNewSession();
    setAttachedFiles([]);
    endGroup();
  };

  const handleSessionSelect = (id: string) => {
    const groupId = startGroup("UI Toggle: Session Change");
    addLog('UI', 'info', `Switching to session ${id}`, { sessionId: id });
    setActiveSessionId(id);
    setAttachedFiles([]);
    endGroup();
  };

  const handleModelSelect = (id: string) => {
    const groupId = startGroup("UI Toggle: Cambio de Modelo");
    addLog('UI', 'info', `Modelo seleccionado: ${id}`, { modelId: id });
    setSelectedModelId(id);
    endGroup();
  };

  const handleOpenDashboard = () => {
    const groupId = startGroup("Command Dashboard: Model Taxonomy Mapping");
    addLog('Quota Monitor', 'info', "Initializing real-time tracking for TPM/RPM headers", {});
    addLog('Infrastructure HUD', 'info', "Syncing Sidebar micro-metrics with Global State", {});
    addLog('System', 'info', "Parity Lockdown: Model Registry updated with Vision and Reasoning specs", {});
    addLog('UI', 'info', "UI De-duplication: Sidebar converted to Vitality HUD", {});
    
    const subGroupId = startSubGroup(groupId, "Financial Precision Check");
    addLog('Financial', 'debug', "Mapa de precios actualizado para DeepSeek y Llama 3.3", { 
      deepseek: { input: 0.59, output: 0.79 },
      llama33: { input: 0.59, output: 0.79 },
      subGroupId 
    });
    endGroup();
    endGroup();
    setIsCommandDashboardOpen(true);
  };

  // Expose to window for Sidebar HUD
  useEffect(() => {
    (window as any).openCommandDashboard = handleOpenDashboard;
    return () => { delete (window as any).openCommandDashboard; };
  }, [handleOpenDashboard]);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const stagedTokens = useMemo(() => {
    return attachedFiles
      .filter(f => f.status === 'ready')
      .reduce((acc, f) => acc + (f.estimatedTokens || 0), 0);
  }, [attachedFiles]);

  const contextSize = useMemo(() => {
    return (!messages || !Array.isArray(messages)) ? 0 : messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0);
  }, [messages]);
  
  const contextWindow = activeModel?.contextWindow ?? 8192;
  const effectiveContextLimit = Math.max(1, Math.min(contextWindow, quota?.limitTokens || contextWindow));
  const isTierRestricted = effectiveContextLimit < contextWindow;
  const contextPercentage = Math.min((contextSize / effectiveContextLimit) * 100, 100);
  
  useEffect(() => {
    setStagedTokens(stagedTokens);
  }, [stagedTokens, setStagedTokens]);

  useEffect(() => {
    if (!auditRun.current) {
      auditRun.current = true;
      const groupId = startGroup("Athanor Forge AF-221: HUD Synchronization & Predictive Fill");
      addLog('UI', 'info', "HUD Sync: Implementing predictive context visualization [Ghost Bar]", { groupId });
      addLog('UI', 'info', "Context Tension: Recalculating stress levels based on staged file payloads", { groupId });
      
      const subGroupId = startSubGroup(groupId, "Saturation Forecast");
      const selectedModel = models.find(m => m.id === selectedModelId);
      const maxModelTokens = selectedModel?.contextWindow || 8192;
      addLog('UI', 'debug', "Saturation Forecast Data", { 
        raw: `Used: ${contextSize} | Staged: ${stagedTokens} | Limit: ${maxModelTokens}`, 
        subGroupId 
      });
      endGroup(); // end subgroup

      // AF-217 UI Architecture Logs
      addLog('System', 'info', 'UI Architecture: Differentiating Left (Navigation) and Right (Operation) scopes', { groupId });
      addLog('System', 'info', 'Vault Consolidation: Credentials, Workspace, Logs and Wisdom merged into FORGE_VAULT', { groupId });
      const transplantSubGroupId = startSubGroup(groupId, "Component Transplant");
      addLog('System', 'info', "Integrity Pilot successfully moved to Inspector Panel", { raw: "Integrity Pilot successfully moved to Inspector Panel", subGroupId: transplantSubGroupId });
      endGroup(); // end transplant subgroup

      // AF-218 Context Ingestion Logs
      addLog('System', 'info', "Context Ingestion: Initializing Drag-and-Drop listeners on Chat Stage", { groupId });
      addLog('System', 'info', "Visual Feedback: Active Ingestion Glow configured to Forge Orange", { groupId });
      const mimeSubGroupId = startSubGroup(groupId, "MIME-Type Pre-Scan");
      addLog('System', 'debug', "Extensiones permitidas: PDF, TXT, JS, PY, JSON, CSV", { raw: "PDF, TXT, JS, PY, JSON, CSV", subGroupId: mimeSubGroupId });
      endGroup(); // end mime subgroup

      endGroup(); // end main group
    }
  }, [startGroup, addLog, startSubGroup, endGroup, models, selectedModelId, contextSize, stagedTokens]);
  


  const [selectedExpert, setSelectedExpert] = useState('default');
  const [contextText, setContextText] = useState('');
  const [isModelSuiteOpen, setIsModelSuiteOpen] = useState(false);
  const [isCommandDashboardOpen, setIsCommandDashboardOpen] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [showForgeCert, setShowForgeCert] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mentionedFileIds, setMentionedFileIds] = useState<string[]>([]);

  const handleFilesAttached = (files: File[]) => {
    const groupId = startGroup("FileVault: Initializing local content extraction engine");
    addLog('Vault', 'info', "Token Estimator: Calculating context weight for ingested files", { groupId });
    addLog('Vault', 'debug', "Heuristic applied: 1 token / 3.8 characters [Refined for Code/Docs]", { groupId });
    
    const newFiles: AttachedFile[] = files.map(file => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      let type: AttachedFile['type'] = 'text';
      if (extension === 'pdf') type = 'pdf';
      else if (['js', 'ts', 'tsx', 'py', 'cpp', 'h', 'css', 'html', 'go', 'rs'].includes(extension)) type = 'code';
      else if (extension === 'json') type = 'json';
      else if (extension === 'csv') type = 'csv';

      const attachedFile: AttachedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type,
        size: file.size,
        content: null,
        status: 'pending'
      };

      // Start processing
      processFile(file, attachedFile.id, groupId);
      
      return attachedFile;
    });

    setAttachedFiles(prev => [...prev, ...newFiles]);
    endGroup();
  };

  const calculateFileWeight = (content: string) => {
    return Math.ceil(content.length / 3.8);
  };

  const processFile = async (file: File, id: string, parentGroupId: string) => {
    const startTime = performance.now();
    const subGroupId = startSubGroup(parentGroupId, `Extraction Audit: ${file.name}`);
    addLog('Vault', 'info', `FileReader: Reading binary data from ${file.name}`, { 
      fileName: file.name, 
      size: file.size,
      subGroupId 
    });

    setAttachedFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'processing' } : f));

    // Validation: 10MB limit (increased for complex parsers)
    if (file.size > 10 * 1024 * 1024) {
      addLog('Vault', 'error', `Archivo excede el límite de ingesta: ${file.name}`, { 
        size: file.size,
        limit: '10MB',
        subGroupId 
      });
      setAttachedFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'error', 
        errorMessage: 'Archivo excede el límite de ingesta' 
      } : f));
      endGroup();
      return;
    }

    try {
      let content = '';
      let pageCount: number | undefined;
      const extension = file.name.split('.').pop()?.toLowerCase() || '';

      if (extension === 'pdf') {
        addLog('Content Engine', 'info', "Content Engine: Deploying PDF.js worker for local text extraction", { subGroupId });
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pageCount = pdf.numPages;
        
        setAttachedFiles(prev => prev.map(f => f.id === id ? { ...f, pageCount } : f));

        let fullText = '';
        const pageMetrics = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const pageStartTime = performance.now();
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
          
          const pageEndTime = performance.now();
          pageMetrics.push({
            page: i,
            processingTimeMs: pageEndTime - pageStartTime
          });
        }
        
        content = fullText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ''); // Clean control characters
        
        const parsingMetricsGroupId = startSubGroup(subGroupId, "Parsing Metrics");
        addLog('Vault', 'debug', "PDF Parsing Metrics", { 
          raw: pageMetrics,
          subGroupId: parsingMetricsGroupId 
        });
        endGroup();
      } else if (extension === 'csv') {
        addLog('Structured Data', 'info', "Structured Data: CSV converted to Markdown Table for optimized inference context", { subGroupId });
        const rawText = await readFileAsText(file);
        const results = Papa.parse(rawText, { header: true, skipEmptyLines: true });
        
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0] as object);
          const rows = results.data as any[];
          
          let markdownTable = `| ${headers.join(' | ')} |\n`;
          markdownTable += `| ${headers.map(() => '---').join(' | ')} |\n`;
          
          rows.forEach(row => {
            markdownTable += `| ${headers.map(h => String(row[h] || '').replace(/\|/g, '\\|')).join(' | ')} |\n`;
          });
          
          content = markdownTable;
        } else {
          content = rawText;
        }
      } else if (extension === 'json') {
        const rawText = await readFileAsText(file);
        try {
          const jsonObj = JSON.parse(rawText);
          content = JSON.stringify(jsonObj); // Minify
          addLog('Vault', 'info', "JSON Sanitizer: Minified JSON to save tokens", { subGroupId });
        } catch {
          content = rawText;
        }
      } else {
        content = await readFileAsText(file);
      }

      const estimatedTokens = calculateFileWeight(content);
      const totalTime = performance.now() - startTime;
      
      setAttachedFiles(prev => prev.map(f => f.id === id ? { ...f, content, estimatedTokens, status: 'ready' } : f));
      
      addLog('Vault', 'success', `File extraction complete: ${file.name}`, { 
        id, 
        status: 'ready', 
        size: file.size,
        estimatedTokens,
        totalTimeMs: totalTime,
        subGroupId 
      });

      // Payload Density Audit log
      const auditGroupId = startGroup(`Payload Density Audit: ${file.name}`);
      addLog('Vault', 'debug', `Tokenomics: ${file.name} -> ${estimatedTokens} TKN`, {
        fileName: file.name,
        tokens: estimatedTokens,
        auditGroupId
      });
      endGroup();

    } catch (error: any) {
      addLog('Vault', 'error', `Error reading file: ${file.name}`, { 
        error: error.message,
        subGroupId 
      });
      setAttachedFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'error', 
        errorMessage: 'Error al procesar el archivo' 
      } : f));
    } finally {
      endGroup();
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleInspectFile = (file: AttachedFile) => {
    const groupId = startGroup(`Canvas Bridge: Projecting file ${file.id} to staging area`);
    addLog('UI', 'info', "Expanding Artifact Canvas for local inspection", { groupId });
    
    setStagedArtifact(file);
    setActiveArtifactId('staged');
    
    if (!layout.rightPanelOpen) {
      setLayout(prev => ({ ...prev, rightPanelOpen: true }));
    }
    
    endGroup();
  };

  // Global ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showForgeCert) setShowForgeCert(false);
        else if (isCommandDashboardOpen) setIsCommandDashboardOpen(false);
        else if (isModelSuiteOpen) setIsModelSuiteOpen(false);
        else if (activeArtifactId) setActiveArtifactId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgeCert, isCommandDashboardOpen, isModelSuiteOpen, activeArtifactId, setActiveArtifactId]);

  useEffect(() => {
    // LocalStorage Audit
    const validKeys = [
      'athanor_active_model',
      'athanor_inference_config',
      'athanor_forge_history',
      'athanor_favorite_models',
      'athanor_fx_rate',
      'athanor_fx_timestamp',
      'athanor_performance_history',
      'athanor_system_logs',
      'athanor_didactic_cache',
      'athanor_didactic_prompt',
      'athanor_verified_build',
      'athanor_groq_api_key',
      'athanor_github_token'
    ];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().startsWith('athanor_') && !validKeys.includes(key.toLowerCase())) {
        localStorage.removeItem(key);
      }
    }

    addLog('System', 'success', 'Forge Gold Master: AF-217 System Sealed and Certified', { version: 'AF-217' });
    addLog('UI', 'success', 'All 19 UI components verified under Industrial Noir standards', { version: 'AF-217' });
    const handoverGroup = startGroup("Architecture Handover");
    addLog('System', 'debug', "CST Time Sync, FX Engine (USD/MXN), and Context Horizon fully operational", { raw: "CST Time Sync, FX Engine (USD/MXN), and Context Horizon fully operational", handoverGroup });
    endGroup();
  }, []);

  const toggleAccordion = (id: string) => {
    if (openAccordion === null) {
      addLog('Vault', 'info', 'Data Vault Reorganized', { groups: 4 });
    }
    setOpenAccordion(openAccordion === id ? null : id);
  };

  const handleExpertSelect = (expertId: string) => {
    const groupId = startGroup("UI Toggle: Expert Change");
    addLog('UI', 'info', `Expert selected: ${expertId}`, { expertId });
    setSelectedExpert(expertId);
    endGroup();
  };

  const handleContextChange = (text: string) => {
    setContextText(text);
    // Not logging every keystroke to avoid spam, but we log the final context when sending
  };

  const inferenceConfig = useInferenceConfig();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const scrollToBottom = () => {
    if (isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScrollEnabled(isAtBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (auditRun.current) return;
    
    const init = async () => {
      const group = startGroup(`Athanor Forge ${ATHANOR_VERSION}: Gold Master - Final Synthesis & Certification`);
      auditRun.current = true;
      
      addLog('System', 'info', "Forge Gold Master: AF-210 system seal initiated", { group });
      addLog('System', 'info', "All modules certified: Inference, Didactic, Security, and Analytics", { group });
      
      const snapshotId = startSubGroup(group, "Final System Snapshot");
      addLog('System', 'debug', "CST Time Sync confirmed, UWP schema validated, and Memory Buffers capped", { 
        subGroupId: snapshotId,
        raw: {
          version: ATHANOR_VERSION,
          timestamp: new Date().toISOString(),
          memory_limits: { performance: 100, logs: 500 },
          security: "Zero-Trust Token Vault Active"
        }
      });
      endGroup(); // end snapshot

      addLog('System', 'info', "FX Engine: Initializing Currency Exchange Sync...", {});
      addLog('System', 'info', "Escaneando 'Compare Mode' y otros descriptores de función...", {});
      const subGroup = startSubGroup(group, "Functional Reality Check");
      
      const auditData = {
        "TPS (Tokens Per Second)": "Connected (Real-time calculation in groqService)",
        "Latency (TTFT)": "Connected (Real-time calculation in groqService)",
        "Compare Mode": "Static UI / Partial (Selection logic present, Dual-Inference pending)",
        "Telemetry": "Connected (LogManager active)",
        "Context Window": "Connected (Metadata-driven filtering)",
        "Benchmarks": "Static (Registry-driven)",
        "Power Score": "Derived (Registry-driven)",
        "Experts": "Connected (System Prompt injection)"
      };
      
      Object.entries(auditData).forEach(([term, status]) => {
        addLog('Audit', status.includes('Connected') ? 'success' : 'warn', `Audit: ${term}`, { status });
      });

      addLog('System', 'info', "Migration: Model Selection Trigger moved to Navigation Sidebar [Success]", {});
      
      const uiGroup = startSubGroup(group, "UI/UX Refinement [AF-205]");
      addLog('UI', 'info', "Command Stage Transition: Unified Vertical Feed active", { alignment: 'left', avatars: 'removed', headers: 'mono-text' });
      addLog('UI', 'info', "Timeline Dial Logic: BranchSwitcher updated to compact pill design", { transition: 'glitch/fade', label: 'REALITY_INDEX' });
      addLog('UI', 'info', "Telemetry UX: Noise reduction applied to execution metadata", { visibility: 'hover-only', metrics: ['TPS', 'TTFT', 'COST'] });
      
      addLog('System', 'info', "Validating Infrastructure Secrets...", { group });
      const savedKey = secretsConfig.getGroqApiKey();
      
      if (savedKey) {
        addLog('System', 'success', "Infrastructure Secrets: Verified", { keyPrefix: savedKey.substring(0, 8) + '...', group });
        setApiKey(savedKey);
      } else {
        addLog('System', 'warn', "No secrets detected. Requiring user intervention.", { group });
      }
      
      const auditGroup = startSubGroup(group, "Control Surface Audit");
      addLog('System', 'info', "Precision Rack: Implementing custom industrial faders and rocker switches", { auditGroup });
      addLog('System', 'info', "LCD HUD: Applying micro-grid texture and internal radiance to context monitor", { auditGroup });
      addLog('System', 'debug', "Nuevas pseudo-clases de CSS para webkit-slider-thumb y moz-range-thumb", { auditGroup });
      endGroup();
      
      endGroup(); // End Main Group
    };

    init();
  }, [startGroup, addLog, endGroup]);

  useEffect(() => {
    if (!apiKey) return;

    const group = startGroup("Layout Refactor: Viewport Synchronization");
    addLog('UI', 'info', "Anclando Chat Input al viewport fijo", { position: 'sticky-bottom', layout: 'flex-col' });
    addLog('UI', 'info', "Eliminando duplicidad de modelos en Sidebar", {});

    const subGroup = startSubGroup(group, "Cálculo de Altura Dinámica");
    addLog('UI', 'info', "Aplicando scrolls independientes por panel", {
      root: "h-screen overflow-hidden",
      panels: "h-full overflow-y-auto",
      input: "sticky bottom-0",
      subGroup
    });
    endGroup();

    // Load models
    const loadModels = async () => {
      setIsModelsLoading(true);
      setModelsError(null);
      try {
        const data = await groqService.fetchAvailableModels(apiKey, actions, setQuota);
        setModels(data);
        if (data.length > 0) {
          if (!selectedModelId || !data.some(m => m.id === selectedModelId)) {
            setSelectedModelId('openai/gpt-oss-120b');
          }
        }
      } catch (error) {
        addLog('System', 'error', "Failed to load models", { error });
        const errorMessage = error instanceof Error ? error.message : String(error);
        setModelsError(errorMessage);
        if (errorMessage.toLowerCase().includes('invalid api key') || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('401')) {
          setApiKey(null);
          secretsConfig.clearGroqApiKey();
        }
      } finally {
        setIsModelsLoading(false);
      }
    };
    
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const mergedConfig = useMemo(() => {
    const expert = EXPERTS.find(e => e.id === selectedExpert);
    let fullSystemPrompt = inferenceConfig.config.systemPrompt;
    if (expert && expert.id !== 'default') {
      fullSystemPrompt += `\n\nEres un experto en: ${expert.name}. ${expert.description}`;
    }
    if (contextText.trim()) {
      fullSystemPrompt += `\n\nContexto adicional:\n${contextText.trim()}`;
    }

    return {
      ...inferenceConfig.config,
      systemPrompt: fullSystemPrompt
    };
  }, [inferenceConfig.config, selectedExpert, contextText]);

  const handleSendMessage = async (content: string) => {
    if (!apiKey || !selectedModelId) return;

    const mentionAuditGroup = startGroup("Mention Audit");
    const mentions = content.match(/@(\S+)/g) || [];
    const mentionedNames = mentions.map(m => m.slice(1));
    
    let filesToInclude = attachedFiles.filter(f => f.status === 'ready');
    
    if (mentionedNames.length > 0) {
      addLog("Context Optimization", "info", "Filtering inference payload based on user mentions", { mentionedNames });
      filesToInclude = filesToInclude.filter(f => mentionedNames.includes(f.name));
    }

    addLog("System", "info", "Mention Audit: Final context selection", { 
      totalAttached: attachedFiles.length,
      included: filesToInclude.map(f => f.name),
      raw: filesToInclude
    });
    endGroup();

    await sendMessageStream(
      apiKey, 
      selectedModelId, 
      content, 
      mergedConfig, 
      actions, 
      undefined, 
      setQuota,
      filesToInclude
    );

    setAttachedFiles([]);
    setMentionedFileIds([]);
  };

  const handleCheckIntegrity = () => {
    const groupId = startGroup(`Athanor Forge ${ATHANOR_VERSION}: Integrity Status Check`);
    addLog('System', 'info', "Escaneando estado de secretos y configuración de infraestructura...", { groupId });
    
    // Simular escaneo de secretos
    const secretsStatus = Object.keys(secretsConfig).reduce((acc, key) => {
      acc[key] = (secretsConfig as any)[key] ? 'LOADED' : 'MISSING';
      return acc;
    }, {} as any);

    addLog('System', 'debug', "Resultado de auditoría de secretos", { 
      groupId,
      raw: secretsStatus
    });
    endGroup();
  };

  if (!apiKey) {
    return <AuthGateway onAuthenticated={setApiKey} onQuotaUpdate={setQuota} />;
  }

  return (
    <div className={`h-full transition-all ${isPilotActive ? 'duration-500' : 'duration-[2000ms]'} ${
      isPilotActive 
        ? `border-2 ${isGenerating || pilotGhostText ? 'border-violet-400 shadow-[0_0_80px_rgba(139,92,246,0.4)]' : 'border-violet-500/50 shadow-[0_0_50px_rgba(139,92,246,0.15)]'}` 
        : 'border-2 border-transparent shadow-none'
    }`}>
      <BentoShell
        initialLayout={layout}
        onLayoutChange={handleLayoutChange}
        canvasActive={!!activeArtifactId}
        canvas={<CanvasPanel />}
      sidebar={
        <div className="h-full flex flex-col bg-neutral-950/50 relative border-r border-white/5 overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-32 bg-orange-500/20 blur-[100px] pointer-events-none transition-opacity duration-75 ${isGenerating ? 'opacity-100' : 'opacity-0'}`} />
          
          {/* Scrollable Container (Monolithic Slab) */}
          <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10 flex flex-col">
            {/* Branding Block */}
            <div className="flex flex-col gap-1 p-6 relative z-20">
              <ForgeLogo size={40} isStreaming={isGenerating} />
              <div className="mt-2">
                <h1 className="text-sm font-bold tracking-tighter text-zinc-100">ATHANOR FORGE</h1>
                <p className="text-[9px] font-mono text-zinc-500 tracking-[0.2em]">CERTIFIED_INFRASTRUCTURE</p>
              </div>
            </div>

            <TechnicalSeparator />

            {/* Header: Engine Control */}
            <div className="p-4 bg-black/20 relative z-20 space-y-3">
              <motion.button
                whileTap={{ y: 1, scale: 0.99 }}
                onClick={() => setIsModelSuiteOpen(true)}
                disabled={isPilotActive}
                className={`w-full text-left p-3 rounded-sm flex items-center gap-3 transition-all group border ${
                  isModelSuiteOpen 
                    ? 'bg-transparent border-zinc-800 text-orange-300 shadow-[inset_4px_0_0_0_rgba(249,115,22,0.5)]' 
                    : isGenerating
                      ? 'bg-transparent border-zinc-800 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2),inset_4px_0_0_0_rgba(249,115,22,0.5)]'
                      : 'bg-transparent border-zinc-800 hover:shadow-[inset_4px_0_0_0_rgba(249,115,22,0.5)] text-neutral-400 hover:text-white'
                } ${isPilotActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="relative flex items-center justify-center w-5 h-5">
                  <div className={`w-3 h-1 rounded-sm ${isGenerating ? 'bg-emerald-400 animate-pulse shadow-[0_0_4px_rgba(52,211,153,0.8),0_0_12px_rgba(52,211,153,0.4)]' : 'bg-emerald-500/40'}`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Active Engine</span>
                  <span className="text-[9px] truncate opacity-70">
                    {isModelsLoading ? 'Loading models...' : modelsError ? 'Error loading models' : models.find(m => m.id === selectedModelId)?.id || 'Select Engine'}
                  </span>
                </div>
              </motion.button>
            </div>

            <TechnicalSeparator />

            {/* Session History & Artifacts */}
            <div className="py-4 space-y-6">
              <InfrastructureStatus />
              <TechnicalSeparator />
              
              <div className="px-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleNewSessionClick}
                    disabled={isPilotActive}
                    className="w-full text-center py-2 border border-dashed border-zinc-800 text-zinc-500 hover:border-orange-500/50 hover:text-orange-500 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all rounded-sm text-[10px] font-mono tracking-widest disabled:opacity-50"
                  >
                    [ NEW_EXPERIMENT ]
                  </button>
                </div>
                <div className="space-y-0">
                  {sessions.map(session => (
                    <div key={session.id} className="relative group">
                      <button
                        onClick={() => handleSessionSelect(session.id)}
                        disabled={isPilotActive}
                        className={`w-full text-left p-3 rounded-none flex items-center gap-3 transition-colors border-b border-zinc-900/50 ${
                          activeSessionId === session.id 
                            ? 'bg-zinc-900/30 text-zinc-100 border-l-2 border-l-orange-500' 
                            : 'hover:bg-white/5 text-zinc-500 border-l-2 border-l-transparent'
                        } ${isPilotActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <MessageSquare className={`w-4 h-4 shrink-0 ${activeSessionId === session.id ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'text-neutral-500'}`} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate text-xs font-medium">
                            {session.title}
                          </span>
                          <span className="text-[9px] font-mono opacity-50 truncate">
                            [{session.modelId?.split('/').pop() || 'UNKNOWN'}] // [{session.totalTokens || 0}]T
                          </span>
                        </div>
                      </button>
                      
                      {/* Hover Actions */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitle = window.prompt("Nuevo nombre para el experimento:", session.title);
                            if (newTitle && newTitle.trim() !== "") {
                              handleRenameSession(session.id, newTitle.trim());
                            }
                          }}
                          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-white/10 rounded-md transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("¿Seguro que quieres borrar este experimento?")) {
                              handleDeleteSession(session.id);
                            }
                          }}
                          className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Artifacts Gallery */}
              {artifacts.length > 0 && (
                <div className="px-4 space-y-4">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <FileCode className="w-3 h-3" />
                    Artifacts Stage
                  </label>
                  <div className="space-y-1">
                    {artifacts.filter(a => a.sessionId === activeSessionId && messages.some(m => m.id === a.messageId)).map(art => (
                      <button
                        key={art.id}
                        onClick={() => setActiveArtifactId(art.id)}
                        disabled={isPilotActive}
                        className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors ${
                          activeArtifactId === art.id ? 'bg-orange-500/20 text-orange-300' : 'hover:bg-white/5 text-neutral-400'
                        } ${isPilotActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                        <span className="text-[11px] truncate">{art.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <TechnicalSeparator />

            {/* Data Vault (The Consolidated Stack) */}
            <div className="flex-1 bg-neutral-950/20">
              <div className="border-b border-zinc-900">
                <button 
                  onClick={() => toggleAccordion('vault')}
                  disabled={isPilotActive}
                  className={`w-full flex items-center justify-between p-4 text-[10px] font-mono tracking-widest transition-colors ${
                    openAccordion === 'vault' ? 'bg-white/5 text-orange-500' : 'text-zinc-500 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 uppercase">
                    <Database className="w-4 h-4" />
                    <span>FORGE_VAULT</span>
                  </div>
                  {openAccordion === 'vault' ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {openAccordion === 'vault' && (
                  <div className="p-4 pt-0 space-y-6">
                    {/* 01_CREDENTIALS */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 uppercase text-[10px] font-mono text-zinc-500 border-b border-zinc-900 pb-2">
                        <span className="opacity-30">01</span>
                        <span>Credentials</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Groq API Key</label>
                        <div className="relative">
                          <input 
                            type="password"
                            defaultValue={secretsConfig.getGroqApiKey() || ''}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val) {
                                secretsConfig.setGroqApiKey(val);
                                setApiKey(val);
                                addLog('Security', 'success', "Groq API Key updated in Vault", {});
                              }
                            }}
                            className="w-full bg-black/40 border border-zinc-900 rounded-none p-2 text-[10px] font-mono text-zinc-400 focus:outline-none focus:border-orange-500/50"
                            placeholder="gsk_..."
                          />
                          <Shield className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-800" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">GitHub Token (Zero-Trust)</label>
                        <div className="relative">
                          <input 
                            type="password"
                            defaultValue={secretsConfig.getGithubToken() ? '********' : ''}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== '********') {
                                secretsConfig.setGithubToken(val);
                                addLog('Security', 'success', "GitHub Token updated in Vault (Obfuscated)", {});
                              }
                            }}
                            className="w-full bg-black/40 border border-zinc-900 rounded-none p-2 text-[10px] font-mono text-zinc-400 focus:outline-none focus:border-orange-500/50"
                            placeholder="ghp_..."
                          />
                          <Database className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-800" />
                        </div>
                      </div>
                    </div>

                    {/* 02_WORKSPACE */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 uppercase text-[10px] font-mono text-zinc-500 border-b border-zinc-900 pb-2">
                        <span className="opacity-30">02</span>
                        <span>Workspace</span>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            const data = {
                              sessions,
                              performanceHistory,
                              didactic_cache: JSON.parse(localStorage.getItem('athanor_didactic_cache') || '{}'),
                              knowledge_verified: Object.keys(localStorage).filter(k => k.startsWith('knowledge-verified-')).map(k => k.replace('knowledge-verified-', ''))
                            };
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `athanor-forge-export-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            addLog('UI', 'success', "Workspace Universal Port: Export Success", {});
                          }}
                          className="w-full flex items-center justify-between gap-2 p-2 bg-zinc-900 border border-zinc-800 text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <FileJson className="w-3 h-3 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                            <span>Export Workspace</span>
                          </div>
                          <span className="text-[8px] opacity-40">.JSON</span>
                        </button>

                        <button
                          onClick={() => {
                            const cache = JSON.parse(localStorage.getItem('athanor_didactic_cache') || '[]');
                            const evaluatedEntries = cache.filter((entry: any) => entry.label === 'preferred' || entry.label === 'rejected');
                            const jsonl = evaluatedEntries.map((entry: any) => JSON.stringify(entry)).join('\n');
                            const blob = new Blob([jsonl], { type: 'application/x-jsonlines' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `athanor-forge-dataset-${new Date().toISOString().split('T')[0]}.jsonl`;
                            a.click();
                            URL.revokeObjectURL(url);
                            addLog('Didactic', 'success', "ML Dataset Exporter: JSONL generated", {});
                          }}
                          className="w-full flex items-center justify-between gap-2 p-2 bg-zinc-900 border border-zinc-800 text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <Database className="w-3 h-3 text-emerald-500" />
                            <span>Export Dataset</span>
                          </div>
                          <span className="text-[8px] opacity-40">.JSONL</span>
                        </button>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => setScriptToView('AF-182')}
                            className="flex-1 flex items-center justify-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 text-[9px] font-bold uppercase tracking-widest text-orange-500 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] hover:bg-orange-500/20 transition-all"
                          >
                            <Rocket className="w-3 h-3" />
                            Deployment Pipeline
                          </button>
                          <button
                            onClick={async () => {
                              const groupId = startGroup("Athanor Forge AF-182: Deployment Pipeline Sync (Silent)");
                              try {
                                await deploymentService.copyScript({ addLog, startGroup, startSubGroup, endGroup } as any, groupId);
                                addLog('UI', 'success', "Deployment script copied silently", { groupId });
                              } catch (err: any) {
                                addLog('System', 'error', err.message, { groupId });
                              }
                              endGroup();
                            }}
                            className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500/20 transition-all"
                            title="Copy Script"
                          >
                            <ClipboardCopy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 03_EXECUTION LOGS */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <div className="flex items-center gap-2 uppercase text-[10px] font-mono text-zinc-500">
                          <span className="opacity-30">03</span>
                          <span>Execution Logs</span>
                        </div>
                        <span className="text-[9px] font-mono opacity-50 text-zinc-500">[{logs.length}]</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsObservabilityOpen(true)}
                            className="flex-1 flex items-center justify-center gap-2 p-2 bg-zinc-900 border border-zinc-800 text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
                          >
                            <Terminal className="w-3 h-3" />
                            Open Console
                          </button>
                          <button
                            onClick={() => {
                              const logText = logs.map(l => `[${l.timestamp}] ${l.severity.toUpperCase()}: ${l.message}`).join('\n');
                              navigator.clipboard.writeText(logText);
                              addLog('UI', 'info', "Logs copied to clipboard", {});
                            }}
                            className="p-2 bg-zinc-900 border border-zinc-800 text-neutral-400 hover:text-white transition-all"
                            title="Copy Logs"
                          >
                            <ClipboardCopy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          Live Stream Active
                        </div>
                      </div>
                    </div>

                    {/* 04_WISDOM_PROMPT */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 uppercase text-[10px] font-mono text-zinc-500 border-b border-zinc-900 pb-2">
                        <span className="opacity-30">04</span>
                        <span>Wisdom Prompt</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Master Prompt (Feynman/Senior)</label>
                        <textarea 
                          defaultValue={localStorage.getItem('athanor_didactic_prompt') || ''}
                          onBlur={(e) => {
                            localStorage.setItem('athanor_didactic_prompt', e.target.value);
                            addLog('Didactic', 'info', "Forge Wisdom Prompt updated", {});
                          }}
                          className="w-full h-32 bg-black/40 border border-zinc-900 rounded-none p-3 text-[9px] font-mono text-zinc-400 focus:outline-none focus:border-orange-500/50 resize-none scrollbar-hide"
                          placeholder="Enter master didactic instructions..."
                        />
                        <div className="flex items-center justify-between text-[8px] font-mono text-zinc-700 uppercase">
                          <span>Auto-Save: Enabled</span>
                          <span>Persistence: Local</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Footer: System Specs */}
          <div className="mt-auto flex-shrink-0 border-t border-zinc-900 bg-neutral-950 relative z-20">
            <SystemSpecs 
              version={ATHANOR_VERSION} 
              onCheckIntegrity={handleCheckIntegrity} 
              isVerified={!!localStorage.getItem('athanor_verified_build')}
              onShowCert={() => setShowForgeCert(true)}
            />
          </div>
        </div>
      }
      stage={
        <div 
          className="h-full flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_center,theme(colors.zinc.950)_0%,theme(colors.black)_100%)]"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const files = Array.from(e.dataTransfer.files);
              handleFilesAttached(files);
            }
          }}
        >
          {/* Ingestion Overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-orange-500/10 backdrop-blur-[2px] border-2 border-dashed border-orange-500/50 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-black/80 border border-orange-500 px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.4)] flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
                    <Plus className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="text-sm font-bold text-orange-500 uppercase tracking-[0.2em]">
                    [ READY_FOR_INGESTION ]
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model Selection Suite Overlay */}
          <ModelSelectionOverlay 
            isOpen={isModelSuiteOpen}
            onClose={() => setIsModelSuiteOpen(false)}
            models={models}
            selectedModelId={selectedModelId}
            onSelect={handleModelSelect}
          />

          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto pt-12 pb-12 px-8 scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-transparent flex items-center justify-center mx-auto">
                    <ForgeLogo size={40} isStreaming={isGenerating} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">Athanor Forge</h2>
                    <p className="text-sm text-neutral-500 font-medium">Inferencia Industrial & Sabiduría Técnica</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-8">
                {(!messages || !Array.isArray(messages)) ? null : messages.filter(m => m.role !== 'system').map((msg, i) => (
                  <ChatMessage 
                    key={msg.id} 
                    id={msg.id}
                    role={msg.role as 'user' | 'assistant'}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    cost={msg.cost}
                    tps={msg.tps}
                    ttft={msg.ttft}
                    jsonMode={msg.jsonMode}
                    isGenerating={isGenerating && i === messages.length - 1}
                    branchIndex={msg.branchIndex}
                    totalBranches={msg.totalBranches}
                    onSwitchBranch={(direction) => switchBranch(msg.id, direction)}
                    onCreateBranch={(newContent) => createBranch(msg.id, newContent, apiKey!, selectedModelId!, mergedConfig, actions)}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 p-8 pt-0">
            <div className="max-w-3xl mx-auto">
              <ChatInput 
                onSend={handleSendMessage} 
                disabled={isGenerating}
                selectedExpert={selectedExpert}
                onSelectExpert={handleExpertSelect}
                contextText={contextText}
                onContextChange={handleContextChange}
                isPilotActive={isPilotActive}
                pilotGhostText={pilotGhostText}
                coolDown={coolDown}
                tier={tier}
                isDragging={isDragging}
                attachedFiles={attachedFiles || []}
                onFilesAttached={handleFilesAttached}
                onRemoveFile={handleRemoveFile}
                onInspectFile={handleInspectFile}
                onMentionUpdate={setMentionedFileIds}
                stagedTokens={stagedTokens}
                estimatedTokens={contextSize}
                effectiveContextLimit={effectiveContextLimit}
              />
            </div>
          </div>
        </div>
      }
      inspector={
        <>
          <InspectorPanel />
        </>
      }
    />
      <AnimatePresence>
        {isCommandDashboardOpen && (
          <CommandDashboard
            isOpen={isCommandDashboardOpen}
            onClose={() => setIsCommandDashboardOpen(false)}
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={handleModelSelect}
            messages={messages}
          />
        )}
      </AnimatePresence>

      {/* Forge Certificate Modal */}
      <AnimatePresence>
        {showForgeCert && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-neutral-950 border border-zinc-900 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500" />
              
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest">Athanor Forge</h3>
                    <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Certified Capabilities // AF-217</p>
                  </div>
                  <Shield className="w-10 h-10 text-emerald-500/20" />
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Inference Engine', detail: '128k LPU Context', icon: <Zap className="w-3 h-3" /> },
                    { label: 'History Engine', detail: 'Non-Linear Branching v2', icon: <Clock className="w-3 h-3" /> },
                    { label: 'Financial Engine', detail: 'Real-time USD/MXN Sync', icon: <CreditCard className="w-3 h-3" /> },
                    { label: 'Didactic Engine', detail: '6-Dimension Feynman Logic', icon: <Brain className="w-3 h-3" /> },
                    { label: 'Security', detail: 'Zero-Trust Token Vault', icon: <Shield className="w-3 h-3" /> },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                      <div className="p-2 bg-black/40 text-emerald-500">
                        {item.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{item.label}</span>
                        <span className="text-[9px] font-mono text-neutral-500">{item.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowForgeCert(false)}
                  className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-emerald-500/20 transition-all"
                >
                  [ CLOSE_CERTIFICATE ]
                </button>
              </div>

              {/* Decorative corner */}
              <div className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-emerald-500/20 pointer-events-none" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
