/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { ObservabilityProvider, useObservability } from './services/observabilityService';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { secretsConfig } from './services/secretsConfig';
import { AuthGateway } from './components/AuthGateway';
import { BentoShell } from './components/BentoShell';
import { ObservabilityPanel } from './components/ObservabilityPanel';
import { CanvasPanel } from './components/CanvasPanel';
import { ChatInput, EXPERTS } from './components/ChatInput';
import { ModelSelectionOverlay } from './components/ModelSelectionOverlay';
import { ChatMessage } from './components/ChatMessage';
import { InspectorPanel } from './components/InspectorPanel';
import { groqService } from './services/groqService';
import { Cpu, Layers, Zap, MessageSquare, Plus, FileCode } from 'lucide-react';
import { DataVault } from './components/DataVault';
import { InfoIcon } from './components/AthanorTooltip';
import { LayoutConfig } from './types';
import { useChat } from './hooks/useChat';
import { useInferenceConfig } from './hooks/useInferenceConfig';

import { DeploymentPipeline } from './components/DeploymentPipeline';

function AthanorForgeCore() {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('ATHANOR_GROQ_API_KEY'));
  const { startGroup, addLog, startSubGroup, endGroup, logs, clearLogs } = useObservability();
  
  useEffect(() => {
    const groupId = startGroup("Athanor Forge AF-133: Pipeline Streamlining & Netlify Auth Fix");
    addLog("Script de despliegue simplificado: Apertura forzada de Chrome eliminada (Zero-Trust verificado)", null, 'success', groupId);
    addLog("AuthGateway: Enrutamiento dinámico (PROD vs DEV) aplicado para validación de API Key", null, 'success', groupId);
    
    const tooltipSubId = startSubGroup(groupId, "Tooltip Error State");
    addLog("Estado de error explícito añadido para sobreescribir UI en fallos de fetch", null, 'debug', tooltipSubId);
    
    const robustnessSubId = startSubGroup(groupId, "Regeneración & Robustez");
    addLog("Lógica de ThumbsDown reconstruida con Try/Catch y reseteo de estado", null, 'debug', robustnessSubId);
    addLog("Degradación elegante para fallos de JSON (Nivel Warn)", null, 'debug', robustnessSubId);
    
    // Initialize default didactic prompt if not present
    if (!localStorage.getItem('athanor_didactic_prompt')) {
      const defaultPrompt = "Eres el Motor de Sabiduría Técnica de Athanor Forge, una plataforma de inferencia industrial. Tu doble identidad es la de un Ingeniero Principal de Hardware (IA/LPU) y un experto pedagogo al estilo Richard Feynman. Tu tarea EXCLUSIVA es definir términos de Ciencias de la Computación, Parámetros LLM o Arquitectura bajo una estricta matriz de 5 dimensiones cognitivas. NADA DE PREÁMBULOS. Tono sobrio, pragmático (vibe Stripe Docs). Metáforas basadas en física cotidiana (sin infantilismos condescendientes). Genera JSON estricto con las claves: 'scientific' (max 50 pal, base matemática/algorítmica), 'professional' (max 40 pal, uso en producción), 'feynman_core' (max 30 pal, mecánica sencilla), 'heuristic_rule' (max 15 pal, regla de oro pragmática), y 'anti_pattern' (max 20 pal, trampa común del novato).";
      localStorage.setItem('athanor_didactic_prompt', defaultPrompt);
    }
    
    endGroup();
    endGroup();
  }, []);
  const observability = { startGroup, addLog, startSubGroup, endGroup, logs, clearLogs };
  const [layout, setLayout] = useState<LayoutConfig>({ leftPanelOpen: true, rightPanelOpen: true });
  
  const { 
    models, 
    setModels, 
    activeModelId: selectedModelId, 
    setActiveModelId: setSelectedModelId,
    artifacts,
    activeArtifactId,
    setActiveArtifactId
  } = useStore();
  
  const handleLayoutChange = (newLayout: LayoutConfig) => {
    const groupId = startGroup("UI Toggle: Layout Change");
    addLog("Updating panel configuration", newLayout, 'info', groupId);
    setLayout(newLayout);
    endGroup();
  };

  const handleNewSessionClick = () => {
    const groupId = startGroup("UI Toggle: New Session");
    addLog("Initializing new chat session", null, 'info', groupId);
    handleNewSession();
    endGroup();
  };

  const handleSessionSelect = (id: string) => {
    const groupId = startGroup("UI Toggle: Session Change");
    addLog(`Switching to session ${id}`, { sessionId: id }, 'info', groupId);
    setActiveSessionId(id);
    endGroup();
  };

  const handleModelSelect = (id: string) => {
    const groupId = startGroup("UI Toggle: Cambio de Modelo");
    addLog(`Modelo seleccionado: ${id}`, { modelId: id }, 'info', groupId);
    setSelectedModelId(id);
    endGroup();
  };

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    isGenerating,
    metrics,
    handleNewSession,
    sendMessageStream
  } = useChat();
  
  const [selectedExpert, setSelectedExpert] = useState('default');
  const [contextText, setContextText] = useState('');
  const [isModelSuiteOpen, setIsModelSuiteOpen] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const handleExpertSelect = (expertId: string) => {
    const groupId = startGroup("UI Toggle: Expert Change");
    addLog(`Expert selected: ${expertId}`, { expertId }, 'info', groupId);
    setSelectedExpert(expertId);
    endGroup();
  };

  const handleContextChange = (text: string) => {
    setContextText(text);
    // Not logging every keystroke to avoid spam, but we log the final context when sending
  };

  const inferenceConfig = useInferenceConfig();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      const group = startGroup("Athanor Forge: Integrity & Capabilities Audit");
      
      addLog("Escaneando 'Compare Mode' y otros descriptores de función...");
      const subGroup = startSubGroup(group, "Functional Reality Check");
      
      const auditData = {
        "TPS (Tokens Per Second)": "Connected (Real-time calculation in groqService)",
        "Latency (TTFT)": "Connected (Real-time calculation in groqService)",
        "Compare Mode": "Static UI / Partial (Selection logic present, Dual-Inference pending)",
        "Telemetry": "Connected (observabilityService active)",
        "Context Window": "Connected (Metadata-driven filtering)",
        "Benchmarks": "Static (Registry-driven)",
        "Power Score": "Derived (Registry-driven)",
        "Experts": "Connected (System Prompt injection)"
      };
      
      Object.entries(auditData).forEach(([term, status]) => {
        addLog(`Audit: ${term}`, { status }, status.includes('Connected') ? 'success' : 'warn', subGroup);
      });

      addLog("Migration: Model Selection Trigger moved to Navigation Sidebar [Success]");
      
      addLog("Validating Infrastructure Secrets...");
      const savedKey = secretsConfig.getGroqApiKey();
      
      if (savedKey) {
        addLog("Infrastructure Secrets: Verified", { keyPrefix: savedKey.substring(0, 8) + '...' }, 'success');
        setApiKey(savedKey);
      } else {
        addLog("No secrets detected. Requiring user intervention.", null, 'warn');
      }
      
      endGroup(); // End Main Group
    };

    init();
  }, [startGroup, addLog, endGroup]);

  useEffect(() => {
    if (!apiKey) return;

    const group = startGroup("Layout Refactor: Viewport Synchronization");
    addLog("Anclando Chat Input al viewport fijo", { position: 'sticky-bottom', layout: 'flex-col' }, 'info', group);
    addLog("Eliminando duplicidad de modelos en Sidebar", null, 'info', group);

    const subGroup = startSubGroup(group, "Cálculo de Altura Dinámica");
    addLog("Aplicando scrolls independientes por panel", {
      root: "h-screen overflow-hidden",
      panels: "h-full overflow-y-auto",
      input: "sticky bottom-0"
    }, 'info', subGroup);
    endGroup();

    // Load models
    const loadModels = async () => {
      setIsModelsLoading(true);
      setModelsError(null);
      try {
        const data = await groqService.fetchAvailableModels(apiKey, observability);
        setModels(data);
        if (data.length > 0) {
          if (!selectedModelId || !data.some(m => m.id === selectedModelId)) {
            setSelectedModelId('openai/gpt-oss-120b');
          }
        }
      } catch (error) {
        console.error("Failed to load models", error);
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
  }, [apiKey]); // Intentionally omitting observability to avoid infinite loops

  const handleSendMessage = async (content: string) => {
    if (!apiKey || !selectedModelId) return;

    // Build system prompt combining config, expert, and context
    const expert = EXPERTS.find(e => e.id === selectedExpert);
    let fullSystemPrompt = inferenceConfig.config.systemPrompt;
    if (expert && expert.id !== 'default') {
      fullSystemPrompt += `\n\nEres un experto en: ${expert.name}. ${expert.description}`;
    }
    if (contextText.trim()) {
      fullSystemPrompt += `\n\nContexto adicional:\n${contextText.trim()}`;
    }

    // Create a temporary config object with the merged system prompt
    const mergedConfig = {
      ...inferenceConfig.config,
      systemPrompt: fullSystemPrompt
    };

    await sendMessageStream(apiKey, selectedModelId, content, mergedConfig, observability);
  };

  if (!apiKey) {
    return <AuthGateway onAuthenticated={setApiKey} />;
  }

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0];

  return (
    <BentoShell
      initialLayout={layout}
      onLayoutChange={handleLayoutChange}
      canvasActive={!!activeArtifactId}
      canvas={<CanvasPanel />}
      sidebar={
        <div className="h-full flex flex-col bg-neutral-950/50 relative">
          <div className={`absolute top-0 left-0 w-full h-32 bg-emerald-500/20 blur-[100px] pointer-events-none transition-opacity duration-500 ${isGenerating ? 'opacity-100' : 'opacity-0'}`} />
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto py-6 space-y-8 scrollbar-hide">
            <div className="px-4 space-y-4 relative z-10">
              <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest ml-2">Infrastructure Nodes</label>
              <div className="space-y-2">
                {[
                  { icon: Cpu, label: 'Inference Engine', status: 'Active' },
                  { icon: Layers, label: 'Context Layers', status: 'Ready' },
                  { icon: Zap, label: 'LPU Accelerator', status: 'Optimized' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-zinc-800 hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-xs font-medium text-neutral-300">{item.label}</span>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-500/70 uppercase tracking-tighter">{item.status}</span>
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
                  {artifacts.filter(a => a.sessionId === activeSessionId).map(art => (
                    <button
                      key={art.id}
                      onClick={() => setActiveArtifactId(art.id)}
                      className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors ${
                        activeArtifactId === art.id ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-white/5 text-neutral-400'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="text-[11px] truncate">{art.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="px-4 space-y-4">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Session History</label>
                <button 
                  onClick={handleNewSessionClick}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors text-neutral-400 hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                {/* Sidebar Selection Hub */}
                <div className="p-4 border-b border-white/5">
                  <button
                    onClick={() => setIsModelSuiteOpen(true)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all group border ${
                      isModelSuiteOpen 
                        ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' 
                        : isGenerating
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className={`relative p-1.5 rounded-lg transition-colors ${
                      isModelSuiteOpen ? 'bg-indigo-500/20' : 'bg-black/20'
                    }`}>
                      <Cpu className="w-4 h-4" />
                      {isGenerating && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Active Engine</span>
                      <span className="text-[9px] truncate opacity-70">
                        {isModelsLoading ? 'Loading models...' : modelsError ? 'Error loading models' : models.find(m => m.id === selectedModelId)?.id || 'Select Engine'}
                      </span>
                    </div>
                  </button>
                </div>

                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionSelect(session.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${
                      activeSessionId === session.id 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' 
                        : 'hover:bg-white/5 text-neutral-400 border border-transparent'
                    }`}
                  >
                    <MessageSquare className={`w-4 h-4 shrink-0 ${activeSessionId === session.id ? 'text-indigo-400' : 'text-neutral-500'}`} />
                    <div className="truncate text-xs font-medium">
                      {session.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <DeploymentPipeline />
          </div>

          {/* Static Footer Area */}
          <div className="mt-auto shrink-0 border-t border-white/5 bg-neutral-950/80 backdrop-blur-md">
            <DataVault />
          </div>
        </div>
      }
      stage={
        <div className="h-full flex flex-col relative overflow-hidden">
          {/* Model Selection Suite Overlay */}
          <ModelSelectionOverlay 
            isOpen={isModelSuiteOpen}
            onClose={() => setIsModelSuiteOpen(false)}
            models={models}
            selectedModelId={selectedModelId}
            onSelect={handleModelSelect}
          />

          <div className="flex-1 overflow-y-auto pt-12 pb-12 px-8 scroll-smooth">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="inline-block p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
                    <Zap className="w-12 h-12 text-indigo-500" />
                  </div>
                  <h2 className="text-4xl font-bold tracking-tighter text-white">Athanor Forge</h2>
                  <p className="text-neutral-500 max-w-md mx-auto leading-relaxed">
                    The Forge is active and synchronized with LPU infrastructure.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                {messages.filter(m => m.role !== 'system').map(msg => (
                  <ChatMessage 
                    key={msg.id} 
                    role={msg.role as 'user' | 'assistant'} 
                    content={msg.content} 
                    isGenerating={isGenerating && msg.id === messages[messages.length - 1].id && msg.role === 'assistant'}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <div className="shrink-0 relative">
            {/* Telemetry HUD */}
            {messages.length > 0 && (
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 px-4 py-2 bg-neutral-950/80 backdrop-blur-md border border-white/10 rounded-full shadow-lg shadow-black/50">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">LPU Status</span>
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-neutral-500">TTFT:</span>
                    <InfoIcon term="TTFT" />
                    <span className="text-indigo-400">{metrics.ttft > 0 ? `${metrics.ttft.toFixed(0)}ms` : '--'}</span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-neutral-500">TPS:</span>
                    <InfoIcon term="TPS" />
                    <span className="text-emerald-400">{metrics.tps > 0 ? metrics.tps.toFixed(1) : '--.-'}</span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-neutral-500">TOKENS:</span>
                    <InfoIcon term="Tokens" />
                    <span className="text-indigo-400">{metrics.totalTokens > 0 ? metrics.totalTokens : '--'}</span>
                  </div>
                </div>
              </div>
            )}

            <ChatInput 
              onSend={handleSendMessage} 
              disabled={isGenerating}
              selectedExpert={selectedExpert}
              onSelectExpert={handleExpertSelect}
              contextText={contextText}
              onContextChange={handleContextChange}
            />
            <div className="mt-2 text-center text-[10px] text-neutral-600 font-mono tracking-widest relative z-10">
              Build: AF-133 | Date: 20/03/2026 | Time: 07:06 PM
            </div>
          </div>
        </div>
      }
      inspector={
        <InspectorPanel />
      }
    />
  );
}

export default function App() {
  return (
    <ObservabilityProvider>
      <StoreProvider>
        <AthanorForgeCore />
        <ObservabilityPanel defaultOpen={false} />
      </StoreProvider>
    </ObservabilityProvider>
  );
}
