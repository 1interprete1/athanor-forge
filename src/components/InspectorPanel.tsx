import { Settings2, Terminal, Zap, RotateCcw, Shield, Radar } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../contexts/StoreContext';
import { InfoIcon } from './AthanorTooltip';
import { useForgeLogs } from '../contexts/ForgeLogger';
import { useEffect } from 'react';

const TEMPLATES = [
  { label: 'Analista de Logs', prompt: 'Eres un analista de logs experto. Tu tarea es identificar anomalías, errores y patrones en los logs proporcionados, explicando la causa raíz de forma concisa.' },
  { label: 'Experto en Rust', prompt: 'Eres un desarrollador Senior de Rust. Escribes código idiomático, seguro y de alto rendimiento. Explica los conceptos de ownership y lifetimes cuando sea relevante.' },
  { label: 'Generador JSON', prompt: 'Eres una API que solo responde con JSON válido. No incluyas texto explicativo antes ni después del JSON. Asegúrate de que las claves estén en camelCase.' }
];

export function InspectorPanel() {
  const { config, updateConfig, resetConfig, activeModelId, models, metrics, estimatedTokens, stagedTokens, isPilotActive, quota, isGenerating, runContextAudit } = useStore();
  const { addLog } = useForgeLogs();
  const selectedModel = models.find(m => m.id === activeModelId);
  const maxModelTokens = selectedModel?.contextWindow || 8192;
  const effectiveMaxTokens = Math.min(maxModelTokens, quota?.remainingTokens || maxModelTokens);
  const abyssLimit = quota?.tier === 'FREE' ? 8000 : maxModelTokens;

  const totalTension = estimatedTokens + stagedTokens;
  const stressPercentage = (estimatedTokens / maxModelTokens) * 100;
  const stagedPercentage = (stagedTokens / maxModelTokens) * 100;
  const totalPercentage = (totalTension / maxModelTokens) * 100;
  const isOverloaded = totalTension > maxModelTokens;
  const isTense = totalPercentage > 85;

  useEffect(() => {
    addLog('UI', 'info', "Inspector Panel: Precision Rack AF-221 initialized", {});
  }, []);

  const formatK = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return num.toString();
  };
  
  const getBarColor = () => {
    if (stressPercentage <= 50) return 'bg-cyan-500';
    if (stressPercentage <= 85) return 'bg-gradient-to-r from-cyan-500 to-amber-500';
    return 'bg-gradient-to-r from-amber-500 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]';
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto scrollbar-hide p-6 space-y-8 bg-neutral-950 text-neutral-200">
      {/* System Prompt Section */}
      <div className={`space-y-4 transition-opacity duration-300 ${isPilotActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-400">
            <Terminal className="w-4 h-4" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">System Prompt</h3>
          </div>
          <div className="relative group">
            <button className="text-[10px] bg-neutral-900 hover:bg-neutral-800 text-neutral-400 px-2 py-1 rounded border border-white/5 transition-colors">
              Templates
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-neutral-900 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {TEMPLATES.map((t, i) => (
                <button 
                  key={i}
                  onClick={() => updateConfig('systemPrompt', t.prompt)}
                  className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white first:rounded-t-lg last:rounded-b-lg"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="relative group/editor">
          <textarea
            value={config.systemPrompt}
            onChange={(e) => updateConfig('systemPrompt', e.target.value)}
            disabled={isPilotActive}
            placeholder="Define el comportamiento del modelo..."
            className="w-full h-32 bg-zinc-900/50 border border-zinc-800 border-l-2 border-l-zinc-700 rounded-xl p-3 text-xs font-mono text-cyan-50 focus:outline-none focus:border-zinc-800 focus:border-l-orange-500 transition-colors resize-y"
          />
          <div className="absolute bottom-2 right-3 text-[8px] font-mono text-zinc-500 pointer-events-none">
            {config.systemPrompt.length} CHARS
          </div>
        </div>
      </div>

      {/* Inference Parameters */}
      <div className={`space-y-4 transition-opacity duration-300 ${isPilotActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-400">
            <Settings2 className="w-4 h-4" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Parameters</h3>
          </div>
          <button 
            onClick={resetConfig}
            disabled={isPilotActive}
            className="text-neutral-500 hover:text-white transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Temperature */}
          <div className="space-y-2 group/slider">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Temperature
                <InfoIcon term="Temperature" />
              </label>
              <span className="text-xs font-mono text-cyan-400 opacity-70 group-has-[:active]/slider:opacity-100 group-has-[:active]/slider:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] transition-all">
                {config.temperature.toFixed(2)}
              </span>
            </div>
            <input 
              type="range" min="0" max="2" step="0.01" 
              value={config.temperature}
              disabled={isPilotActive}
              onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
              className="industrial-fader"
            />
          </div>

          {/* Top P */}
          <div className="space-y-2 group/slider">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Top P
                <InfoIcon term="Top P" />
              </label>
              <span className="text-xs font-mono text-cyan-400 opacity-70 group-has-[:active]/slider:opacity-100 group-has-[:active]/slider:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] transition-all">
                {config.topP.toFixed(2)}
              </span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={config.topP}
              disabled={isPilotActive}
              onChange={(e) => updateConfig('topP', parseFloat(e.target.value))}
              className="industrial-fader"
            />
          </div>

          {/* Max Tokens */}
          <div className="space-y-2 group/slider">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Max Tokens
                <InfoIcon term="Max Tokens" />
              </label>
              <span className="text-xs font-mono text-cyan-400 opacity-70 group-has-[:active]/slider:opacity-100 group-has-[:active]/slider:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] transition-all">
                {config.maxTokens}
              </span>
            </div>
            <input 
              type="range" min="1" max={effectiveMaxTokens} step="1" 
              value={Math.min(config.maxTokens, effectiveMaxTokens)}
              disabled={isPilotActive}
              onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
              className="industrial-fader"
            />
            {quota && quota.remainingTokens < maxModelTokens && (
              <p className="text-[9px] text-amber-500 mt-1">Limitado por cuota de suscripción</p>
            )}
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-2 group/slider">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Freq Penalty
                <InfoIcon term="Freq Penalty" />
              </label>
              <span className="text-xs font-mono text-cyan-400 opacity-70 group-has-[:active]/slider:opacity-100 group-has-[:active]/slider:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] transition-all">
                {config.frequencyPenalty.toFixed(2)}
              </span>
            </div>
            <input 
              type="range" min="-2" max="2" step="0.01" 
              value={config.frequencyPenalty}
              disabled={isPilotActive}
              onChange={(e) => updateConfig('frequencyPenalty', parseFloat(e.target.value))}
              className="industrial-fader"
            />
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2 group/slider">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Pres Penalty
                <InfoIcon term="Pres Penalty" />
              </label>
              <span className="text-xs font-mono text-cyan-400 opacity-70 group-has-[:active]/slider:opacity-100 group-has-[:active]/slider:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] transition-all">
                {config.presencePenalty.toFixed(2)}
              </span>
            </div>
            <input 
              type="range" min="-2" max="2" step="0.01" 
              value={config.presencePenalty}
              disabled={isPilotActive}
              onChange={(e) => updateConfig('presencePenalty', parseFloat(e.target.value))}
              className="industrial-fader"
            />
          </div>
        </div>
      </div>

      {/* Advanced Capabilities */}
      <div className={`space-y-4 pt-4 border-t border-white/5 transition-opacity duration-300 ${isPilotActive ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 text-neutral-400">
          <Zap className="w-4 h-4" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Advanced Capabilities</h3>
        </div>
        
        <div className="space-y-4 bg-neutral-900 p-4 rounded-xl border border-white/5">
          {/* JSON Mode */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs uppercase font-bold tracking-wider ${!selectedModel?.capabilities?.jsonMode ? 'text-neutral-700' : 'text-neutral-500'}`}>
                  JSON Mode
                </span>
                <InfoIcon term="JSON Mode" />
              </div>
              <div className="relative group/json">
                <button
                  onClick={() => selectedModel?.capabilities?.jsonMode && updateConfig('jsonMode', !config.jsonMode)}
                  disabled={isPilotActive || !selectedModel?.capabilities?.jsonMode}
                  className={`w-10 h-5 rounded-sm transition-colors relative flex items-center justify-center ${
                    config.jsonMode && selectedModel?.capabilities?.jsonMode 
                      ? 'bg-zinc-900 border border-emerald-500/50 shadow-[0_2px_4px_rgba(0,0,0,0.4)] drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
                  } ${!selectedModel?.capabilities?.jsonMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {config.jsonMode && selectedModel?.capabilities?.jsonMode ? (
                    <motion.span 
                      initial={{ y: 0 }}
                      animate={{ y: [0, -1, 0] }}
                      transition={{ duration: 0.2 }}
                      className="text-[8px] font-mono font-bold text-emerald-500 uppercase tracking-widest"
                    >
                      ON
                    </motion.span>
                  ) : (
                    <motion.span 
                      initial={{ y: 0 }}
                      animate={{ y: [0, 1, 0] }}
                      transition={{ duration: 0.2 }}
                      className="text-[8px] font-mono font-bold uppercase tracking-widest"
                    >
                      OFF
                    </motion.span>
                  )}
                </button>
                {!selectedModel?.capabilities?.jsonMode && (
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-rose-500 text-[8px] font-bold text-white uppercase tracking-widest rounded opacity-0 invisible group-hover/json:opacity-100 group-hover/json:visible transition-all whitespace-nowrap z-50">
                    Modelo incompatible con JSON Mode
                  </div>
                )}
              </div>
            </div>
            {config.jsonMode && selectedModel?.capabilities?.jsonMode && (
              <div className="text-[9px] font-mono text-rose-500 text-right mt-1 animate-pulse">
                WARNING: Strict Schema Enforced
              </div>
            )}
          </div>

          {/* Tool Use (Auditor only for now) */}
          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Tool Use</span>
              <InfoIcon term="Tool Use" />
            </div>
            <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Dashboard Only</span>
          </div>

          {/* Stop Sequences */}
          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Stop Sequences</span>
              <InfoIcon term="Stop Sequences" />
            </div>
            <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Coming Soon</span>
          </div>
        </div>
      </div>

      {/* Session Metrics */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-neutral-400">
          <Zap className="w-4 h-4" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Session Metrics</h3>
        </div>
        <div className="space-y-3 bg-neutral-900 p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Tokens/Sec
              <InfoIcon term="Tokens/Sec" />
            </span>
            <span className="text-xs font-mono text-cyan-400">{metrics.tps > 0 ? metrics.tps.toFixed(1) : '--.-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              TTFT
              <InfoIcon term="TTFT" />
            </span>
            <span className="text-xs font-mono text-cyan-400">{metrics.ttft > 0 ? `${metrics.ttft.toFixed(0)}ms` : '0ms'}</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Context Size
                <InfoIcon term="Context Size" />
              </span>
              <span className={`text-xs font-mono transition-colors duration-300 ${isOverloaded ? 'text-red-500' : isTense ? 'text-amber-500' : 'text-cyan-400'}`}>
                {formatK(estimatedTokens)}
                {stagedTokens > 0 && (
                  <span className="opacity-50 ml-1">
                    + {formatK(stagedTokens)}
                  </span>
                )}
                <span className="mx-1 text-neutral-700">/</span>
                {formatK(abyssLimit)}
              </span>
            </div>
            
            {/* Context Horizon HUD */}
            <motion.div 
              className={`relative h-4 bg-zinc-950 rounded-sm overflow-hidden border border-white/5 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] transition-all duration-500 ${isTense ? 'ring-1 ring-red-500/20' : ''}`}
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)'
              }}
              animate={isGenerating || isTense ? { 
                opacity: [1, 0.98, 1],
                boxShadow: isTense ? [
                  'inset 0 0 10px rgba(0,0,0,0.5), 0 0 5px rgba(239,68,68,0.1)',
                  'inset 0 0 10px rgba(0,0,0,0.5), 0 0 15px rgba(239,68,68,0.3)',
                  'inset 0 0 10px rgba(0,0,0,0.5), 0 0 5px rgba(239,68,68,0.1)'
                ] : 'inset 0 0 10px rgba(0,0,0,0.5)'
              } : { opacity: 1 }}
              transition={{ repeat: Infinity, duration: isTense ? 1.5 : 0.1, ease: "linear" }}
            >
              {/* Glass Effect Layer */}
              <div className="absolute inset-0 z-40 pointer-events-none bg-gradient-to-br from-white/5 to-transparent" />
              
              {/* Milestones (Notches) */}
              <div className="absolute top-0 bottom-0 w-px bg-zinc-700/50 z-10" style={{ left: '3.125%' }} title="4k" />
              <div className="absolute top-0 bottom-0 w-px bg-zinc-700/50 z-10" style={{ left: '25%' }} title="32k" />
              <div className="absolute top-0 bottom-0 w-px bg-zinc-700/50 z-10" style={{ left: '50%' }} title="64k" />
              
              {/* Tension Line (Used Tokens) */}
              <motion.div 
                className={`absolute inset-y-0 left-0 transition-colors duration-500 z-20 ${getBarColor()}`}
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min((estimatedTokens / 131072) * 100, 100)}%`,
                  opacity: stressPercentage > 85 ? [1, 0.8, 1] : 1
                }}
                transition={{ 
                  width: { type: "spring", bounce: 0.2, duration: 0.8 },
                  opacity: { repeat: Infinity, duration: 1, ease: "easeInOut" }
                }}
              />

              {/* Staged Bar (The Ghost) */}
              {stagedTokens > 0 && (
                <motion.div 
                  className="absolute inset-y-0 z-15 opacity-40 bg-cyan-400"
                  style={{
                    left: `${Math.min((estimatedTokens / 131072) * 100, 100)}%`,
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                  }}
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min((stagedTokens / 131072) * 100, 100)}%`,
                    opacity: [0.3, 0.5, 0.3]
                  }}
                  transition={{ 
                    width: { type: "spring", bounce: 0.1, duration: 1 },
                    opacity: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                  }}
                />
              )}
              
              {/* The Abyss (Hardware Limit) - Carbon Abyss Style */}
              <div 
                className="absolute inset-y-0 right-0 z-30 pointer-events-none bg-black border-l border-orange-500"
                style={{ 
                  width: abyssLimit >= maxModelTokens ? '0%' : `${100 - Math.min((abyssLimit / 131072) * 100, 100)}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(63,63,70,0.5) 2px, rgba(63,63,70,0.5) 4px)'
                }}
              />
            </motion.div>
            <div className="relative h-4 text-[7px] font-mono text-zinc-600 uppercase tracking-tighter mt-1">
              <div className="absolute left-0 flex flex-col items-start">
                <div className="w-px h-[3px] bg-zinc-700/50 mb-[1px]" />
                <span>0</span>
              </div>
              <div className="absolute flex flex-col items-center" style={{ left: '3.125%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-[3px] bg-zinc-700/50 mb-[1px]" />
                <span>4k</span>
              </div>
              <div className="absolute flex flex-col items-center" style={{ left: '25%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-[3px] bg-zinc-700/50 mb-[1px]" />
                <span>32k</span>
              </div>
              <div className="absolute flex flex-col items-center" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-[3px] bg-zinc-700/50 mb-[1px]" />
                <span>64k</span>
              </div>
              <div className="absolute right-0 flex flex-col items-end">
                <div className="w-px h-[3px] bg-zinc-700/50 mb-[1px]" />
                <span>128k</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Control Section */}
      <div className="space-y-4">
        <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-3 h-3" />
          System Control
        </label>
        <div className="space-y-1">
          <button
            onClick={runContextAudit}
            disabled={isPilotActive}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all border ${
              isPilotActive 
                ? 'bg-violet-500/20 border-violet-500/30 text-violet-300 animate-pulse' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            <Radar className={`w-4 h-4 ${isPilotActive ? 'text-violet-400' : 'text-neutral-500'}`} />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest">Integrity Pilot</span>
              <span className="text-[9px] truncate opacity-70">
                {isPilotActive ? 'Running Audit...' : 'Start Context Calibration'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
