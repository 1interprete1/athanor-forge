import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { ModelDefinition, InferenceConfig, ArtifactInstance } from '../types';
import { Message, ChatSession } from '../hooks/useChat';
import { useObservability } from '../services/observabilityService';

const DEFAULT_CONFIG: InferenceConfig = {
  systemPrompt: '',
  temperature: 0.7,
  topP: 1.0,
  maxTokens: 4096,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
};

interface StoreState {
  models: ModelDefinition[];
  activeModelId: string | null;
  activeModel: ModelDefinition | null;
  config: InferenceConfig;
  sessions: ChatSession[];
  activeSessionId: string;
  isGenerating: boolean;
  metrics: { tps: number; ttft: number; totalTokens: number };
  artifacts: ArtifactInstance[];
  activeArtifactId: string | null;
  lastModelsUpdate: number | null;
}

interface StoreActions {
  setModels: (models: ModelDefinition[]) => void;
  setActiveModelId: (id: string | null) => void;
  setActiveModel: (model: ModelDefinition | null) => void;
  setConfig: (config: InferenceConfig | ((prev: InferenceConfig) => InferenceConfig)) => void;
  updateConfig: <K extends keyof InferenceConfig>(key: K, value: InferenceConfig[K]) => void;
  resetConfig: () => void;
  setSessions: (sessions: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => void;
  setActiveSessionId: (id: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setMetrics: (metrics: { tps: number; ttft: number; totalTokens: number } | ((prev: { tps: number; ttft: number; totalTokens: number }) => { tps: number; ttft: number; totalTokens: number })) => void;
  setArtifacts: (artifacts: ArtifactInstance[] | ((prev: ArtifactInstance[]) => ArtifactInstance[])) => void;
  setActiveArtifactId: (id: string | null) => void;
  setLastModelsUpdate: (timestamp: number | null) => void;
}

type StoreContextType = StoreState & StoreActions;

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { startGroup, addLog, startSubGroup, endGroup } = useObservability();

  const [models, setModels] = useState<ModelDefinition[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(() => localStorage.getItem('athanor_active_model') || 'openai/gpt-oss-120b');
  const [activeModel, setActiveModel] = useState<ModelDefinition | null>(null);
  
  const [config, setConfig] = useState<InferenceConfig>(() => {
    const saved = localStorage.getItem('athanor_inference_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Current Session', date: new Date().toISOString(), messages: [] }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [metrics, setMetrics] = useState({ tps: 0, ttft: 0, totalTokens: 0 });
  const [artifacts, setArtifacts] = useState<ArtifactInstance[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [lastModelsUpdate, setLastModelsUpdate] = useState<number | null>(null);

  const updateConfig = useCallback(<K extends keyof InferenceConfig>(key: K, value: InferenceConfig[K]) => {
    const next = { ...config, [key]: value };

    const groupId = startGroup("Configuración de Inferencia Actualizada");
    addLog(`Parámetro modificado: ${key}`, { from: config[key], to: value }, 'info', groupId);
    
    const subGroupId = startSubGroup(groupId, "Nuevo Snapshot del Contexto del Sistema");
    addLog("Configuración completa", next, 'debug', subGroupId);
    endGroup(); // end subgroup
    
    addLog("Persistencia confirmada", null, 'success', groupId);
    endGroup(); // end group

    localStorage.setItem('athanor_inference_config', JSON.stringify(next));
    setConfig(next);
  }, [config, startGroup, addLog, startSubGroup, endGroup]);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem('athanor_inference_config', JSON.stringify(DEFAULT_CONFIG));
    
    const groupId = startGroup("Configuración de Inferencia Restablecida");
    addLog("Valores por defecto restaurados", DEFAULT_CONFIG, 'info', groupId);
    endGroup();
  }, [startGroup, addLog, endGroup]);

  const value = useMemo(() => ({
    models, setModels,
    activeModelId, setActiveModelId,
    activeModel, setActiveModel,
    config, setConfig, updateConfig, resetConfig,
    sessions, setSessions,
    activeSessionId, setActiveSessionId,
    isGenerating, setIsGenerating,
    metrics, setMetrics,
    artifacts, setArtifacts,
    activeArtifactId, setActiveArtifactId,
    lastModelsUpdate, setLastModelsUpdate
  }), [
    models, activeModelId, activeModel, config, sessions, activeSessionId, isGenerating, metrics, artifacts, activeArtifactId, lastModelsUpdate,
    updateConfig, resetConfig
  ]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
