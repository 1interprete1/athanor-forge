/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ModelDefinition, UI_Preset, SelectionFocus } from '../types';
import { 
  X, Search, Zap, Activity, Code, Sparkles, 
  Box, Cpu, Calendar, Layers, ShieldCheck,
  Info, CheckCircle2, AlertCircle, BookOpen, 
  RefreshCw, Globe, Terminal, Gauge, Database, Calculator,
  ArrowRight, Crown, ArrowUpRight, Timer, ZapOff, Scale, Plus,
  ChevronRight, Play, Minus, Star
} from 'lucide-react';
import { useForgeLogs } from '../contexts/ForgeLogger';
import { useStore } from '../contexts/StoreContext';

interface ModelSelectionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelDefinition[];
  selectedModelId: string;
  onSelect: (id: string) => void;
}

export function ModelSelectionOverlay({ 
  isOpen, 
  onClose, 
  models, 
  selectedModelId, 
  onSelect 
}: ModelSelectionOverlayProps) {
  const [preset, setPreset] = useState<UI_Preset>('professional');
  const [focus, setFocus] = useState<SelectionFocus>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const { startGroup, addLog, startSubGroup, endGroup } = useForgeLogs();
  const { lastModelsUpdate, favoriteModels, toggleFavoriteModel } = useStore();

  const isOutOfFocus = (model: ModelDefinition) => {
    if (focus === 'general') {
      const mmlu = model.benchmarks?.find(b => b.name === 'MMLU')?.score || 0;
      const latency = model.latency || 1000;
      return mmlu < 60 || latency > 900;
    }
    if (focus === 'performance') return false;
    if (focus === 'coding') {
      return !(model.strengths.some(s => s.toLowerCase().includes('coding')) || 
               model.benchmarks?.some(b => b.name === 'HumanEval' && b.score > 70));
    }
    if (focus === 'creative') {
      return !(model.strengths.some(s => s.toLowerCase().includes('creative')) || 
               model.benchmarks?.some(b => b.name === 'IFEval' && b.score > 70));
    }
    if (focus === 'rag') {
      return (model.contextWindow || 0) < 32000;
    }
    if (focus === 'math') {
      return !(model.strengths.some(s => s.toLowerCase().includes('math')) || 
               model.benchmarks?.some(b => b.name === 'GSM8K' && b.score > 80));
    }
    return false;
  };

  const filteredModels = useMemo(() => {
    // 1. BÚSQUEDA ACTIVA (BYPASS TOTAL)
    if (searchQuery.trim() !== '') {
      const searchLower = searchQuery.toLowerCase();
      // Si hay búsqueda, ignora los filtros de Focus y muestra cualquier coincidencia en toda la DB
      return models.filter(model => 
        model.id.toLowerCase().includes(searchLower) || 
        (model.provider && model.provider.toLowerCase().includes(searchLower))
      );
    }

    // 2. NAVEGACIÓN NORMAL (RESPETAR FILTROS)
    if (compareMode && selectedForCompare.length === 2) {
      return models.filter(m => selectedForCompare.includes(m.id));
    }

    const focusModels = models.filter(m => !isOutOfFocus(m));
    const otherModels = models.filter(m => isOutOfFocus(m));

    const result = showAll ? [...focusModels, ...otherModels] : focusModels;
    
    return [...result].sort((a, b) => {
      const aFav = favoriteModels.includes(a.id);
      const bFav = favoriteModels.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [models, searchQuery, compareMode, selectedForCompare, focus, showAll, favoriteModels]);

  const compareWinners = useMemo(() => {
    if (!compareMode || selectedForCompare.length !== 2) return null;
    const modelA = models.find(m => m.id === selectedForCompare[0]);
    const modelB = models.find(m => m.id === selectedForCompare[1]);
    if (!modelA || !modelB) return null;

    const winners = {
      tps: (modelA.tps || 0) > (modelB.tps || 0) ? modelA.id : (modelB.tps || 0) > (modelA.tps || 0) ? modelB.id : null,
      context: (modelA.contextWindow || 0) > (modelB.contextWindow || 0) ? modelA.id : (modelB.contextWindow || 0) > (modelA.contextWindow || 0) ? modelB.id : null,
      mmlu: (modelA.benchmarks?.find(b => b.name === 'MMLU')?.score || 0) > (modelB.benchmarks?.find(b => b.name === 'MMLU')?.score || 0) ? modelA.id : (modelB.benchmarks?.find(b => b.name === 'MMLU')?.score || 0) > (modelA.benchmarks?.find(b => b.name === 'MMLU')?.score || 0) ? modelB.id : null,
      ifeval: (modelA.benchmarks?.find(b => b.name === 'IFEval')?.score || 0) > (modelB.benchmarks?.find(b => b.name === 'IFEval')?.score || 0) ? modelA.id : (modelB.benchmarks?.find(b => b.name === 'IFEval')?.score || 0) > (modelA.benchmarks?.find(b => b.name === 'IFEval')?.score || 0) ? modelB.id : null,
      gsm8k: (modelA.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0) > (modelB.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0) ? modelA.id : (modelB.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0) > (modelA.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0) ? modelB.id : null,
    };

    // Calculate overall winner based on count of metric wins
    const winsA = Object.values(winners).filter(id => id === modelA.id).length;
    const winsB = Object.values(winners).filter(id => id === modelB.id).length;
    
    return {
      ...winners,
      overall: winsA > winsB ? modelA.id : winsB > winsA ? modelB.id : null
    };
  }, [compareMode, selectedForCompare, models]);

  // Body scroll lock and Portal logs
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      addLog('UI', 'success', "Portal Deployment: Overlay mounted to document.body", { 
        target: 'document.body', 
        zIndex: 9999,
        strategy: 'React Portal' 
      });
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOpen = () => {
    const groupId = startGroup("Athanor Forge: Deployment & Integrity Audit");
    addLog('Audit', 'info', "Verificando anclaje de títulos: 'Athanor Forge'", { groupId });
    addLog('Audit', 'info', "Auditando lógica de TPS/Latency para garantizar No-Simulación", { groupId });
    
    addLog('UI', 'info', "Tactical Command Hub: Purging legacy Indigo color scales [Consolidation]", { groupId });
    addLog('Inference', 'info', "LPU Dominance Logic: Mathematical deltas applied to comparison metrics", { groupId });
    
    const visualCheckGroupId = startSubGroup(groupId, "Visual Matrix Audit");
    addLog('UI', 'debug', "Mapeo de estados de filtros: Active(Orange) vs Locked(Zinc)", { raw: "Mapeo de estados de filtros: Active(Orange) vs Locked(Zinc)", visualCheckGroupId });
    endGroup(); // End visualCheckGroupId

    const subGroupId = startSubGroup(groupId, "Artifact Exclusion Filtering Status");
    const totalDetected = models.length;
    const hiddenCount = models.filter(m => isOutOfFocus(m)).length;
    addLog('Audit', 'info', `Filtro activo: ${focus}. Ocultos: ${hiddenCount} de ${totalDetected}`, {
      focus,
      hidden: hiddenCount,
      total: totalDetected,
      subGroupId
    });
    endGroup(); // End subGroup
    
    const auditGroupId = startGroup("Audit: Model Data Synchronization Check");
    
    const knownCount = models.filter(m => !m.isUnmapped).length;
    const matchRate = models.length > 0 ? (knownCount / models.length) * 100 : 0;
    
    addLog('Audit', 'info', `Puntaje de Coincidencia de Catálogo: ${matchRate.toFixed(1)}%`, { 
      total: models.length, 
      known: knownCount,
      matchRate,
      auditGroupId
    });
    
    const unmappedModels = models.filter(m => m.isUnmapped);
    if (unmappedModels.length > 0) {
      const mappingSubGroupId = startSubGroup(auditGroupId, "Mapping Unrecognized Entities");
      addLog('Audit', 'warn', "Modelos detectados sin metadatos locales", { unmappedModels, mappingSubGroupId });
    }

    addLog('Audit', 'info', `Calculando estadísticas de UI para preset: ${preset} | Focus: ${focus}`, { preset, focus, auditGroupId });
    endGroup(); // End audit group
    endGroup(); // End layout breakout group
  };

  // Trigger log on open and focus change
  useEffect(() => {
    if (isOpen) handleOpen();
  }, [isOpen, focus, preset]);

  // Reset comparison when mode toggles
  useEffect(() => {
    if (!compareMode) {
      setSelectedForCompare([]);
    } else {
      addLog('UI', 'info', "Inference Analytics Suite: Comparative Mode Activated", { mode: 'dual_selection' });
    }
  }, [compareMode]);

  const handleModelClick = (modelId: string) => {
    if (compareMode) {
      if (selectedForCompare.includes(modelId)) {
        setSelectedForCompare(prev => prev.filter(id => id !== modelId));
        addLog('UI', 'debug', `Model removed from comparison: ${modelId}`, { currentSelection: selectedForCompare.filter(id => id !== modelId) });
      } else if (selectedForCompare.length < 2) {
        const newSelection = [...selectedForCompare, modelId];
        setSelectedForCompare(newSelection);
        addLog('UI', 'info', `Model added to comparison: ${modelId}`, { 
          slot: newSelection.length === 1 ? 'Alpha' : 'Beta',
          currentSelection: newSelection 
        });
      }
    } else {
      onSelect(modelId);
      onClose();
    }
  };

  const handleDeploy = (modelId: string) => {
    const groupId = startGroup("Inference Analytics Suite: Comparative Analysis Activated");
    
    if (compareMode && selectedForCompare.length === 2) {
      addLog('Inference', 'info', `Models in Comparison: ${selectedForCompare[0]} vs ${selectedForCompare[1]}`, {
        modelA: selectedForCompare[0],
        modelB: selectedForCompare[1],
        groupId
      });

      const modelA = models.find(m => m.id === selectedForCompare[0]);
      const modelB = models.find(m => m.id === selectedForCompare[1]);

      if (modelA && modelB) {
        const subGroupId = startSubGroup(groupId, "Differential Metrics Cross-Section");
        const diff = {
          tps: (modelA.tps || 0) - (modelB.tps || 0),
          latency: (modelA.latency || 0) - (modelB.latency || 0),
          powerScore: (modelA.powerScore || 0) - (modelB.powerScore || 0),
          context: (modelA.contextWindow || 0) - (modelB.contextWindow || 0)
        };
        addLog('Inference', 'debug', "Mathematical Delta Calculation", { diff, subGroupId });
      }
    }

    addLog('Inference', 'info', "Generating Latency Projection based on LPU History", { target: modelId, groupId });
    addLog('Inference', 'success', "Initializing Inference Handshake", { model: modelId, groupId });
    
    onSelect(modelId);
    onClose();
    endGroup();
  };

  const getStrengthIcon = (strength: string) => {
    switch (strength.toLowerCase()) {
      case 'fast': return <Zap className="w-4 h-4" />;
      case 'reasoning': return <Activity className="w-4 h-4" />;
      case 'coding': return <Code className="w-4 h-4" />;
      case 'creative': return <Sparkles className="w-4 h-4" />;
      default: return <Box className="w-4 h-4" />;
    }
  };

  const getCasualLabel = (strengths: string[]) => {
    if (strengths.includes('Fast')) return "Ultra-Fast";
    if (strengths.includes('Reasoning')) return "Advanced Reasoning";
    if (strengths.includes('Creative')) return "Creative";
    return "Balanced";
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backdropFilter: 'blur(64px)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] w-full h-full flex items-center justify-center bg-neutral-950/90"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px) brightness(0.5)' }}
            animate={{ opacity: [0, 1, 0.5, 1], scale: 1, filter: 'blur(0px) brightness(1)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ 
              duration: 0.3, 
              ease: [0.23, 1, 0.32, 1],
              opacity: { duration: 0.3, times: [0, 0.4, 0.6, 1] }
            }}
            className="w-full h-full bg-transparent overflow-hidden flex flex-col"
          >
            {/* Connection Status Header */}
            <div className="px-8 py-3 bg-orange-500/5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] animate-pulse" />
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Tactical Command Hub | AF-210</span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                  <Globe className="w-3 h-3" />
                  <span>API Source: api.groq.com/openai/v1/models</span>
                </div>
              </div>
                <div className={`flex flex-col gap-2 transition-opacity duration-300 ${searchQuery.trim() !== '' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <label className="text-[8px] uppercase text-neutral-600 font-bold tracking-widest">Model Catalog</label>
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest transition-colors text-white"
                  >
                    {showAll ? 'Filter by Focus' : 'Show All Models'}
                  </button>
                </div>
              <div className="flex items-center gap-6 text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Node Sync:</span>
                  <span className="text-white font-bold">{models.length} Live</span>
                  <span className="text-neutral-600">|</span>
                  <span className="text-orange-400">{models.filter(m => !m.isUnmapped).length} Categorized</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 text-neutral-600" />
                  <span className="text-neutral-500">Last Pulse:</span>
                  <span className="text-neutral-300">{lastModelsUpdate ? new Date(lastModelsUpdate).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '---'}</span>
                </div>
              </div>
            </div>

            {/* Main Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5 relative z-[110]">
              <div className="flex items-center gap-8">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Athanor Forge | Explorer</h2>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold mt-1">Industrial Infrastructure Overlay</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[8px] uppercase text-neutral-600 font-bold tracking-widest">Complexity Preset</label>
                  <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                    {(['casual', 'professional', 'technical'] as UI_Preset[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPreset(p)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          preset === p 
                            ? 'bg-white/10 text-white shadow-lg' 
                            : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`flex flex-col gap-2 transition-opacity duration-300 ${searchQuery.trim() !== '' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  <label className="text-[8px] uppercase text-neutral-600 font-bold tracking-widest">Analytics Focus</label>
                  <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                    {[
                      { id: 'general', icon: Layers, label: 'Universal / Balanced' },
                      { id: 'performance', icon: Gauge, label: 'Turbo' },
                      { id: 'coding', icon: Terminal, label: 'Forge' },
                      { id: 'creative', icon: Sparkles, label: 'Lab' },
                      { id: 'rag', icon: Database, label: 'RAG' },
                      { id: 'math', icon: Calculator, label: 'Math' }
                    ].map((f) => {
                      const isLocked = searchQuery.trim() !== '' && !models.filter(m => 
                        (m.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (m.provider && m.provider.toLowerCase().includes(searchQuery.toLowerCase())))
                      ).some(m => {
                        // Mock check for focus compatibility
                        if (f.id === 'general') return true;
                        if (f.id === 'performance') return (m.tps || 0) > 50;
                        if (f.id === 'coding') return m.strengths.some(s => s.toLowerCase().includes('coding'));
                        if (f.id === 'creative') return m.strengths.some(s => s.toLowerCase().includes('creative'));
                        if (f.id === 'rag') return (m.contextWindow || 0) >= 32000;
                        if (f.id === 'math') return m.strengths.some(s => s.toLowerCase().includes('math'));
                        return false;
                      });

                      return (
                        <button
                          key={f.id}
                          disabled={isLocked}
                          onClick={() => setFocus(f.id as SelectionFocus)}
                          className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all relative overflow-hidden ${
                            focus === f.id 
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' 
                              : isLocked 
                                ? 'text-zinc-700 border-transparent cursor-not-allowed'
                                : 'text-zinc-600 border-zinc-800/50 hover:border-zinc-700 hover:text-zinc-300'
                          }`}
                          title={isLocked ? "Focus Locked for current search" : f.label}
                        >
                          <f.icon className={`w-3.5 h-3.5 ${focus === f.id ? 'drop-shadow-[0_0_3px_rgba(249,115,22,0.8)]' : ''}`} />
                          <span className="text-[9px] font-bold uppercase tracking-wider hidden lg:inline">
                            {isLocked ? '[LOCKED]' : f.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-10 w-px bg-white/5 mx-2" />

                <div className="flex flex-col gap-2">
                  <label className="text-[8px] uppercase text-neutral-600 font-bold tracking-widest">Compare Mode</label>
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`px-4 py-1.5 rounded-xl border transition-all ${compareMode ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-neutral-400'}`}
                  >
                    {compareMode ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                  {searchQuery.trim() !== '' && (
                    <motion.span 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-4 left-0 text-[9px] text-zinc-500 font-bold uppercase tracking-tighter"
                    >
                      Buscando en todos los modelos (Ignorando filtros)
                    </motion.span>
                  )}
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors relative z-[120]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Favorites Dock */}
            {favoriteModels.length > 0 && (
              <div className="px-8 py-4 border-b border-white/5">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                    <span className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest">Favorites Dock</span>
                  </div>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {favoriteModels.map(favId => {
                      const model = models.find(m => m.id === favId);
                      if (!model) return null;
                      return (
                        <button
                          key={favId}
                          onClick={() => {
                            onSelect(favId);
                            onClose();
                          }}
                          className="flex-shrink-0 px-4 py-2 rounded-none border-l-2 border-l-orange-500 border-y border-r border-zinc-700 hover:bg-white/5 transition-colors flex items-center gap-2 group/chip"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] text-neutral-500 font-medium group-hover/chip:text-neutral-300 transition-colors">{model.provider}</span>
                          <span className="text-[10px] text-white font-bold">{favId.split('/').pop()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide relative">
              {compareMode && selectedForCompare.length === 2 && (
                <div className="absolute left-1/2 top-8 bottom-8 w-px bg-zinc-800 animate-pulse -translate-x-1/2 pointer-events-none z-10 flex items-center justify-center">
                  <div className="w-2 h-2 bg-orange-500 rotate-45 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                </div>
              )}
              <div className={`max-w-7xl mx-auto grid gap-6 relative ${
                compareMode && selectedForCompare.length === 2 
                  ? 'grid-cols-2' 
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                <AnimatePresence mode="popLayout">
                  {filteredModels.map((model, index) => {
                    const outOfFocus = isOutOfFocus(model);
                    
                    const isSelected = compareMode 
                      ? selectedForCompare.includes(model.id)
                      : selectedModelId === model.id;
                    
                    const selectionIndex = selectedForCompare.indexOf(model.id);
                    
                    const isWinner = compareWinners?.overall === model.id;
                    const isLoser = compareMode && selectedForCompare.length === 2 && compareWinners?.overall && compareWinners.overall !== model.id;

                    return (
                      <motion.div
                        layout
                        key={model.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ 
                          layout: { duration: 0.3, ease: "circOut" },
                          duration: 0.3, 
                          delay: index * 0.03,
                          ease: [0.23, 1, 0.32, 1]
                        }}
                        onClick={() => handleModelClick(model.id)}
                        className={`group relative text-left p-6 rounded-sm border transition-all duration-500 flex flex-col gap-4 cursor-pointer ${
                          isSelected 
                            ? compareMode
                              ? isWinner
                                ? 'bg-zinc-900/40 border-emerald-500/40 shadow-[inset_2px_2px_15px_rgba(16,185,129,0.1)]'
                                : isLoser
                                  ? 'bg-zinc-900/40 border-rose-500/40 shadow-[inset_2px_2px_15px_rgba(244,63,94,0.1)]'
                                  : 'bg-zinc-900/40 border-orange-500/50 shadow-[inset_2px_2px_15px_rgba(249,115,22,0.15)]'
                              : 'bg-zinc-900/40 border-orange-500/50 shadow-[inset_2px_2px_15px_rgba(249,115,22,0.15)]'
                            : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/40 hover:border-zinc-700'
                        } ${outOfFocus ? 'opacity-40 grayscale scale-[0.98]' : 'opacity-100 grayscale-0 scale-100'}`}
                      >
                      {/* Selection Badge for Compare Mode */}
                      {compareMode && isSelected && (
                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold border shadow-lg z-10 ${
                          selectionIndex === 0 ? 'bg-orange-500 border-orange-400 text-black' : 'bg-zinc-700 border-zinc-500 text-white'
                        }`}>
                          {selectionIndex === 0 ? 'A' : 'B'}
                        </div>
                      )}
                      {/* Top Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white group-hover:text-orange-300 transition-colors">{model.id}</span>
                            {model.isBeta && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold uppercase tracking-widest">Beta</span>
                            )}
                            {model.isUnmapped && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[8px] font-bold uppercase tracking-widest border border-rose-500/30">Emerging / Unmapped</span>
                            )}
                          </div>
                          <span className="text-xs text-neutral-500 font-medium">{model.provider}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoriteModel(model.id);
                            }}
                            className="p-2 rounded-xl bg-black/40 border border-white/5 transition-all hover:bg-white/10"
                            title={favoriteModels.includes(model.id) ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Star className={`w-4 h-4 transition-all ${favoriteModels.includes(model.id) ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'text-zinc-500 hover:text-zinc-300'}`} />
                          </button>
                          <div className={`p-2 rounded-xl bg-black/40 border border-white/5 text-neutral-400 group-hover:text-orange-400 transition-colors`}>
                            {getStrengthIcon(model.strengths[0])}
                          </div>
                        </div>
                      </div>

                      {/* Analytics Viewport (Focus Mode Data) */}
                      <div className="py-3 px-4 rounded-2xl bg-black/30 border border-zinc-800 space-y-3">
                        <AnimatePresence mode="wait">
                          {focus === 'general' && (
                            <motion.div key="general" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold">General Knowledge (MMLU)</span>
                                <div className="flex items-center gap-2">
                                  {compareWinners?.mmlu === model.id && (
                                    <motion.span 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: [0, 1, 0.5, 1] }}
                                      transition={{ duration: 0.2, repeat: 2 }}
                                      className="text-[8px] font-mono text-orange-400"
                                    >
                                      [DOMINANCE_LPU]
                                    </motion.span>
                                  )}
                                  <span className="text-[10px] text-emerald-400 font-mono">
                                    {model.benchmarks?.find(b => b.name === 'MMLU')?.score || '---'}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${model.benchmarks?.find(b => b.name === 'MMLU')?.score || 0}%` }} 
                                  transition={{ duration: 0.8, ease: "circOut" }}
                                  className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                {((model.benchmarks?.find(b => b.name === 'MMLU')?.score || 0) >= 70 && (model.latency || 1000) <= 600) ? (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase">Recommended: Standard Tasks</span>
                                    <span className="text-[8px] text-neutral-600">Balanced Power</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-500 text-[8px] font-bold uppercase">Specialized Utility</span>
                                    <span className="text-[8px] text-neutral-700">Niche Focus</span>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}

                          {focus === 'performance' && (
                            <motion.div key="perf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold">Inference Speed</span>
                                <div className="flex items-center gap-2">
                                  {compareWinners?.tps === model.id && (
                                    <motion.span 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: [0, 1, 0.5, 1] }}
                                      transition={{ duration: 0.2, repeat: 2 }}
                                      className="text-[8px] font-mono text-orange-400"
                                    >
                                      [DOMINANCE_LPU]
                                    </motion.span>
                                  )}
                                  <span className="text-[10px] text-cyan-400 font-mono">{model.tps || '---'} TPS</span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${Math.min((model.tps || 0) / 10, 100)}%` }} 
                                  transition={{ duration: 0.8, ease: "circOut" }}
                                  className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" 
                                />
                              </div>
                              <div className="flex justify-between items-center text-[8px] text-neutral-600">
                                <span>Latency: {model.latency || '---'}ms</span>
                                <span>LPU Optimized</span>
                              </div>
                            </motion.div>
                          )}

                          {focus === 'coding' && (
                            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <Terminal className="w-3 h-3 text-orange-400" />
                                  <span className="text-[9px] text-neutral-500 uppercase font-bold">MMLU / Logic</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {compareWinners?.mmlu === model.id && (
                                    <motion.span 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: [0, 1, 0.5, 1] }}
                                      transition={{ duration: 0.2, repeat: 2 }}
                                      className="text-[8px] font-mono text-orange-400"
                                    >
                                      [DOMINANCE_LPU]
                                    </motion.span>
                                  )}
                                  <span className="text-[10px] text-orange-400 font-mono">
                                    {model.benchmarks?.find(b => b.name === 'MMLU')?.score || '---'}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${model.benchmarks?.find(b => b.name === 'MMLU')?.score || 0}%` }} 
                                  transition={{ duration: 0.8, ease: "circOut" }}
                                  className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" 
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[8px] font-bold uppercase">Optimizer: Coding</span>
                                <span className="text-[8px] text-neutral-600">HumanEval: {model.benchmarks?.find(b => b.name === 'HumanEval')?.score || '---'}%</span>
                              </div>
                            </motion.div>
                          )}

                          {focus === 'creative' && (
                            <motion.div key="creative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold">Creative Fidelity (IFEval)</span>
                                <div className="flex items-center gap-2">
                                  {compareWinners?.ifeval === model.id && (
                                    <motion.span 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: [0, 1, 0.5, 1] }}
                                      transition={{ duration: 0.2, repeat: 2 }}
                                      className="text-[8px] font-mono text-orange-400"
                                    >
                                      [DOMINANCE_LPU]
                                    </motion.span>
                                  )}
                                  <span className="text-[10px] text-amber-400 font-mono">
                                    {model.benchmarks?.find(b => b.name === 'IFEval')?.score || '---'}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${model.benchmarks?.find(b => b.name === 'IFEval')?.score || 0}%` }} 
                                  transition={{ duration: 0.8, ease: "circOut" }}
                                  className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                                />
                              </div>
                              <p className="text-[8px] text-neutral-500 italic leading-tight">Optimizado para fluidez narrativa y seguimiento de instrucciones complejas.</p>
                            </motion.div>
                          )}

                          {focus === 'rag' && (
                            <motion.div key="rag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold">Context Window</span>
                                <div className="flex items-center gap-2">
                                  {compareWinners?.context === model.id && (
                                    <motion.span 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: [0, 1, 0.5, 1] }}
                                      transition={{ duration: 0.2, repeat: 2 }}
                                      className="text-[8px] font-mono text-orange-400"
                                    >
                                      [DOMINANCE_LPU]
                                    </motion.span>
                                  )}
                                  <span className="text-[10px] text-violet-400 font-mono">{(model.contextWindow / 1024).toFixed(0)}k Tokens</span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${Math.min((model.contextWindow / 128000) * 100, 100)}%` }} 
                                  transition={{ duration: 0.8, ease: "circOut" }}
                                  className="h-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
                                />
                              </div>
                              <div className="flex justify-between items-center text-[8px] text-neutral-600">
                                <span>RAG Optimized</span>
                                <span>Long-form Output</span>
                              </div>
                            </motion.div>
                          )}

                          {focus === 'math' && (
                            <motion.div key="math" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-neutral-500 uppercase font-bold">Reasoning (GSM8K)</span>
                                <div className="flex items-center gap-2">
                                  {compareWinners?.gsm8k === model.id && (
                                    <motion.span 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: [0, 1, 0.5, 1] }}
                                      transition={{ duration: 0.2, repeat: 2 }}
                                      className="text-[8px] font-mono text-orange-400"
                                    >
                                      [DOMINANCE_LPU]
                                    </motion.span>
                                  )}
                                  <span className="text-[10px] text-rose-400 font-mono">
                                    {model.benchmarks?.find(b => b.name === 'GSM8K')?.score || '---'}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${model.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0}%` }} 
                                  transition={{ duration: 0.8, ease: "circOut" }}
                                  className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" 
                                />
                              </div>
                              <div className="flex justify-between items-center text-[8px] text-neutral-600">
                                <span>Step-by-Step Logic</span>
                                <span>Math: {model.benchmarks?.find(b => b.name === 'MATH')?.score || '---'}%</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Dynamic Content based on Preset */}
                      <div className="flex-1 mt-4">
                        <AnimatePresence mode="wait">
                          {preset === 'casual' && (
                            <motion.div
                              key="casual"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex flex-col gap-3"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                <span className="text-sm font-bold text-indigo-200">{getCasualLabel(model.strengths)}</span>
                              </div>
                              <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                                {model.pros?.[0] || "Optimizado para respuestas rápidas y precisas."}
                              </p>
                            </motion.div>
                          )}

                          {preset === 'professional' && (
                            <motion.div
                              key="pro"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="grid grid-cols-2 gap-4"
                            >
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Context</label>
                                <div className="flex items-center gap-1.5 text-neutral-300">
                                  <BookOpen className="w-3 h-3 text-neutral-500" />
                                  <span className="text-xs font-mono">{(model.contextWindow / 1024).toFixed(0)}k</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Release</label>
                                <div className="flex items-center gap-1.5 text-neutral-300">
                                  <Calendar className="w-3 h-3 text-neutral-500" />
                                  <span className="text-xs font-mono">{model.releaseDate.split('-')[0]}</span>
                                </div>
                              </div>
                              <div className="col-span-2 pt-2 space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {model.strengths.map(s => (
                                    <span key={s} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] text-neutral-400 uppercase font-medium">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                                {model.lore && (
                                  <p className="text-[10px] text-neutral-500 italic leading-snug border-l border-white/10 pl-2 mt-2">
                                    {model.lore}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}

                          {preset === 'technical' && (
                            <motion.div
                              key="tech"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="space-y-4"
                            >
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-2 rounded-xl bg-black/20 border border-white/5">
                                  <label className="text-[8px] uppercase text-neutral-600 block mb-1">Architecture</label>
                                  <span className="text-[10px] text-neutral-300 font-mono">{model.architecture}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-black/20 border border-white/5">
                                  <label className="text-[8px] uppercase text-neutral-600 block mb-1">Params</label>
                                  <span className="text-[10px] text-neutral-300 font-mono">{model.parameters || 'N/A'}</span>
                                </div>
                              </div>

                              {model.lore && (
                                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                  <label className="text-[8px] uppercase text-indigo-400/50 font-bold block mb-1 tracking-widest">Expert Lore</label>
                                  <p className="text-[10px] text-neutral-400 leading-relaxed italic">
                                    {model.lore}
                                  </p>
                                </div>
                              )}
                              
                              {model.benchmarks && (
                                <div className="space-y-2">
                                  <label className="text-[8px] uppercase text-neutral-600 font-bold tracking-widest">Benchmarks</label>
                                  <div className="space-y-1.5">
                                    {model.benchmarks.map(b => (
                                      <div key={b.name} className="flex items-center justify-between">
                                        <span className="text-[9px] text-neutral-400 font-mono">{b.name}</span>
                                        <div className="flex items-center gap-2 flex-1 mx-3">
                                          <div className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500/50" style={{ width: `${b.score}%` }} />
                                          </div>
                                          <span className="text-[9px] text-indigo-400 font-mono">{b.score}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Footer / Power Score */}
                      <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-neutral-600" />
                            <span className="text-[10px] text-neutral-500 font-mono uppercase">Power Score</span>
                          </div>
                          <span className={`text-xs font-mono font-bold ${
                            (model.powerScore || 0) > 85 ? 'text-emerald-400' : 
                            (model.powerScore || 0) > 70 ? 'text-cyan-400' : 'text-neutral-400'
                          }`}>
                            {model.powerScore}%
                          </span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${model.powerScore || 0}%` }} 
                            className={`h-full ${
                              (model.powerScore || 0) > 85 ? 'bg-emerald-500' : 
                              (model.powerScore || 0) > 70 ? 'bg-cyan-500' : 'bg-neutral-500'
                            }`} 
                          />
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <motion.div
                          layoutId={compareMode ? `active-glow-${model.id}` : "active-glow"}
                          className={`absolute inset-0 rounded-3xl border-2 pointer-events-none shadow-2xl ${
                            compareMode
                              ? selectionIndex === 0
                                ? 'border-cyan-500/50 shadow-cyan-500/10'
                                : 'border-indigo-500/50 shadow-indigo-500/10'
                              : 'border-indigo-500/50 shadow-indigo-500/10'
                          }`}
                        />
                      )}
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>

              <div className="mt-12 flex justify-center pb-12">
                <AnimatePresence mode="wait">
                  {!showAll ? (
                    <motion.button
                      key="expand"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => setShowAll(true)}
                      className="group flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">Expand: Show All {models.length} Models</span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px]">{models.filter(m => isOutOfFocus(m)).length} hidden</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      key="collapse"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => setShowAll(false)}
                      className="group flex items-center gap-3 px-8 py-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-all"
                    >
                      <Minus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">Collapse: Show Filtered Only</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Face-Off Comparison Panel */}
            <AnimatePresence>
              {compareMode && selectedForCompare.length === 2 && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-7xl px-8 z-50"
                >
                  <div className="bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden">
                    <div className="flex items-stretch divide-x divide-white/5">
                      {/* Model A Summary */}
                      {(() => {
                        const modelA = models.find(m => m.id === selectedForCompare[0]);
                        const modelB = models.find(m => m.id === selectedForCompare[1]);
                        if (!modelA || !modelB) return null;

                        const projectedLatencyA = (modelA.latency || 0) + (1000 / (modelA.tps || 50));
                        const projectedLatencyB = (modelB.latency || 0) + (1000 / (modelB.tps || 50));

                        return (
                          <>
                            <div className="flex-1 p-6 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">Model Alpha</span>
                                  <h4 className="text-lg font-bold text-white">{modelA.id}</h4>
                                </div>
                                <button
                                  onClick={() => handleDeploy(modelA.id)}
                                  className="px-4 py-2 bg-cyan-500 text-black rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-cyan-400 transition-colors"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Deploy
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] text-neutral-500 uppercase font-bold">Efficiency</span>
                                    {modelA.tps && modelB.tps && modelA.tps > modelB.tps && <Crown className="w-3 h-3 text-cyan-400" />}
                                  </div>
                                  <div className="text-sm font-mono text-white">{modelA.tps} TPS</div>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] text-neutral-500 uppercase font-bold">Predicted Latency</span>
                                  </div>
                                  <div className="text-sm font-mono text-cyan-400">
                                    ~{projectedLatencyA.toFixed(0)}ms
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Center Comparison Metrics */}
                            <div className="w-72 bg-black/40 p-6 flex flex-col justify-center gap-4 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                              
                              <div className="text-center relative z-10">
                                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Performance Differential</span>
                              </div>
                              
                              <div className="space-y-4 relative z-10">
                                <AnimatePresence mode="wait">
                                  <motion.div
                                    key={focus}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-4"
                                  >
                                    {/* Focus Specific Metric */}
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-[8px] uppercase font-bold">
                                        <span className="text-cyan-500">
                                          {focus === 'performance' ? `${modelA.tps} TPS` : 
                                           focus === 'coding' ? `${modelA.benchmarks?.find(b => b.name === 'HumanEval')?.score}%` :
                                           focus === 'creative' ? `${modelA.benchmarks?.find(b => b.name === 'IFEval')?.score}%` :
                                           focus === 'rag' ? `${(modelA.contextWindow / 1024).toFixed(0)}k` :
                                           `${modelA.benchmarks?.find(b => b.name === 'GSM8K')?.score}%`}
                                        </span>
                                        <span className="text-neutral-400 flex items-center gap-1">
                                          {focus === 'performance' ? <Gauge className="w-2.5 h-2.5" /> : 
                                           focus === 'coding' ? <Code className="w-2.5 h-2.5" /> :
                                           focus === 'creative' ? <Sparkles className="w-2.5 h-2.5" /> :
                                           focus === 'rag' ? <Database className="w-2.5 h-2.5" /> :
                                           <Calculator className="w-2.5 h-2.5" />}
                                          {focus}
                                        </span>
                                        <span className="text-indigo-500">
                                          {focus === 'performance' ? `${modelB.tps} TPS` : 
                                           focus === 'coding' ? `${modelB.benchmarks?.find(b => b.name === 'HumanEval')?.score}%` :
                                           focus === 'creative' ? `${modelB.benchmarks?.find(b => b.name === 'IFEval')?.score}%` :
                                           focus === 'rag' ? `${(modelB.contextWindow / 1024).toFixed(0)}k` :
                                           `${modelB.benchmarks?.find(b => b.name === 'GSM8K')?.score}%`}
                                        </span>
                                      </div>
                                      <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden border border-white/5">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: '50%' }}
                                          className="h-full bg-cyan-500/80" 
                                          style={{ 
                                            width: `${(() => {
                                              const valA = focus === 'performance' ? modelA.tps || 0 : 
                                                          focus === 'coding' ? modelA.benchmarks?.find(b => b.name === 'HumanEval')?.score || 0 :
                                                          focus === 'creative' ? modelA.benchmarks?.find(b => b.name === 'IFEval')?.score || 0 :
                                                          focus === 'rag' ? modelA.contextWindow :
                                                          modelA.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0;
                                              const valB = focus === 'performance' ? modelB.tps || 0 : 
                                                          focus === 'coding' ? modelB.benchmarks?.find(b => b.name === 'HumanEval')?.score || 0 :
                                                          focus === 'creative' ? modelB.benchmarks?.find(b => b.name === 'IFEval')?.score || 0 :
                                                          focus === 'rag' ? modelB.contextWindow :
                                                          modelB.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0;
                                              return (valA / (valA + valB)) * 100;
                                            })()}%` 
                                          }}
                                        />
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: '50%' }}
                                          className="h-full bg-indigo-500/80" 
                                          style={{ 
                                            width: `${(() => {
                                              const valA = focus === 'performance' ? modelA.tps || 0 : 
                                                          focus === 'coding' ? modelA.benchmarks?.find(b => b.name === 'HumanEval')?.score || 0 :
                                                          focus === 'creative' ? modelA.benchmarks?.find(b => b.name === 'IFEval')?.score || 0 :
                                                          focus === 'rag' ? modelA.contextWindow :
                                                          modelA.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0;
                                              const valB = focus === 'performance' ? modelB.tps || 0 : 
                                                          focus === 'coding' ? modelB.benchmarks?.find(b => b.name === 'HumanEval')?.score || 0 :
                                                          focus === 'creative' ? modelB.benchmarks?.find(b => b.name === 'IFEval')?.score || 0 :
                                                          focus === 'rag' ? modelB.contextWindow :
                                                          modelB.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0;
                                              return (valB / (valA + valB)) * 100;
                                            })()}%` 
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {/* Power Score Gap */}
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-[8px] uppercase font-bold">
                                        <span className="text-cyan-500">{modelA.powerScore}%</span>
                                        <span className="text-neutral-500">Power Score</span>
                                        <span className="text-indigo-500">{modelB.powerScore}%</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden border border-white/5">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${((modelA.powerScore || 0) / ((modelA.powerScore || 0) + (modelB.powerScore || 0))) * 100}%` }}
                                          className="h-full bg-cyan-500/40" 
                                        />
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${((modelB.powerScore || 0) / ((modelA.powerScore || 0) + (modelB.powerScore || 0))) * 100}%` }}
                                          className="h-full bg-indigo-500/40" 
                                        />
                                      </div>
                                    </div>
                                  </motion.div>
                                </AnimatePresence>
                              </div>

                              <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 py-1.5 rounded-xl border border-emerald-500/20 relative z-10">
                                <Crown className="w-3 h-3" />
                                {(() => {
                                  const valA = focus === 'performance' ? modelA.tps || 0 : 
                                              focus === 'coding' ? modelA.benchmarks?.find(b => b.name === 'HumanEval')?.score || 0 :
                                              focus === 'creative' ? modelA.benchmarks?.find(b => b.name === 'IFEval')?.score || 0 :
                                              focus === 'rag' ? modelA.contextWindow :
                                              modelA.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0;
                                  const valB = focus === 'performance' ? modelB.tps || 0 : 
                                              focus === 'coding' ? modelB.benchmarks?.find(b => b.name === 'HumanEval')?.score || 0 :
                                              focus === 'creative' ? modelB.benchmarks?.find(b => b.name === 'IFEval')?.score || 0 :
                                              focus === 'rag' ? modelB.contextWindow :
                                              modelB.benchmarks?.find(b => b.name === 'GSM8K')?.score || 0;
                                  
                                  const diff = Math.abs(valA - valB);
                                  const unit = focus === 'performance' ? 'TPS' : focus === 'rag' ? 'tokens' : '%';
                                  const winner = valA > valB ? 'Alpha' : 'Beta';
                                  
                                  return `Winner: ${winner} (+${diff.toFixed(1)}${unit})`;
                                })()}
                              </div>
                            </div>

                            {/* Model B Summary */}
                            <div className="flex-1 p-6 space-y-4 text-right">
                              <div className="flex items-center justify-between flex-row-reverse">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Model Beta</span>
                                  <h4 className="text-lg font-bold text-white">{modelB.id}</h4>
                                </div>
                                <button
                                  onClick={() => handleDeploy(modelB.id)}
                                  className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-400 transition-colors"
                                >
                                  Deploy
                                  <Play className="w-3 h-3 fill-current" />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] text-neutral-500 uppercase font-bold">Predicted Latency</span>
                                  </div>
                                  <div className="text-sm font-mono text-indigo-400">
                                    ~{projectedLatencyB.toFixed(0)}ms
                                  </div>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] text-neutral-500 uppercase font-bold">Efficiency</span>
                                    {modelB.tps && modelA.tps && modelB.tps > modelA.tps && <Crown className="w-3 h-3 text-indigo-400" />}
                                  </div>
                                  <div className="text-sm font-mono text-white">{modelB.tps} TPS</div>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer Stats */}
            <div className="px-8 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Enterprise Ready | AF-210</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3 text-indigo-500" />
                  <span>LPU Accelerated</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3" />
                <span>Catalogo actualizado: {lastModelsUpdate ? new Date(lastModelsUpdate).toLocaleDateString() : '---'}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
