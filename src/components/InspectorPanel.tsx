import { Settings2, Terminal, Zap, RotateCcw } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { InfoIcon } from './AthanorTooltip';

const TEMPLATES = [
  { label: 'Analista de Logs', prompt: 'Eres un analista de logs experto. Tu tarea es identificar anomalías, errores y patrones en los logs proporcionados, explicando la causa raíz de forma concisa.' },
  { label: 'Experto en Rust', prompt: 'Eres un desarrollador Senior de Rust. Escribes código idiomático, seguro y de alto rendimiento. Explica los conceptos de ownership y lifetimes cuando sea relevante.' },
  { label: 'Generador JSON', prompt: 'Eres una API que solo responde con JSON válido. No incluyas texto explicativo antes ni después del JSON. Asegúrate de que las claves estén en camelCase.' }
];

export function InspectorPanel() {
  const { config, updateConfig, resetConfig, activeModelId, models, metrics } = useStore();
  const selectedModel = models.find(m => m.id === activeModelId);
  const maxModelTokens = selectedModel?.contextWindow || 8192;

  return (
    <div className="h-full flex flex-col overflow-y-auto scrollbar-hide p-6 space-y-8 bg-neutral-950 text-neutral-200">
      {/* System Prompt Section */}
      <div className="space-y-4">
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
        <textarea
          value={config.systemPrompt}
          onChange={(e) => updateConfig('systemPrompt', e.target.value)}
          placeholder="Define el comportamiento del modelo..."
          className="w-full h-32 bg-neutral-900 border border-white/5 rounded-xl p-3 text-xs font-mono text-cyan-50 focus:outline-none focus:border-cyan-500/50 resize-y transition-colors"
        />
      </div>

      {/* Inference Parameters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-400">
            <Settings2 className="w-4 h-4" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Parameters</h3>
          </div>
          <button 
            onClick={resetConfig}
            className="text-neutral-500 hover:text-white transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Temperature
                <InfoIcon term="Temperature" />
              </label>
              <span className="text-xs font-mono text-cyan-400">{config.temperature.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="2" step="0.01" 
              value={config.temperature}
              onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Top P
                <InfoIcon term="Top P" />
              </label>
              <span className="text-xs font-mono text-cyan-400">{config.topP.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={config.topP}
              onChange={(e) => updateConfig('topP', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Max Tokens
                <InfoIcon term="Max Tokens" />
              </label>
              <span className="text-xs font-mono text-cyan-400">{config.maxTokens}</span>
            </div>
            <input 
              type="range" min="1" max={maxModelTokens} step="1" 
              value={Math.min(config.maxTokens, maxModelTokens)}
              onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Freq Penalty
                <InfoIcon term="Freq Penalty" />
              </label>
              <span className="text-xs font-mono text-cyan-400">{config.frequencyPenalty.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="-2" max="2" step="0.01" 
              value={config.frequencyPenalty}
              onChange={(e) => updateConfig('frequencyPenalty', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                Pres Penalty
                <InfoIcon term="Pres Penalty" />
              </label>
              <span className="text-xs font-mono text-cyan-400">{config.presencePenalty.toFixed(2)}</span>
            </div>
            <input 
              type="range" min="-2" max="2" step="0.01" 
              value={config.presencePenalty}
              onChange={(e) => updateConfig('presencePenalty', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Context Size
              <InfoIcon term="Context Size" />
            </span>
            <span className="text-xs font-mono text-cyan-400">{selectedModel ? `${metrics.totalTokens} / ${(selectedModel.contextWindow / 1000).toFixed(0)}k` : '0 / 0k'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
