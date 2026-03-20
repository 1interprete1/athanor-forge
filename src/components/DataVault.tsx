import React, { useState } from 'react';
import { Download, Upload, Shield, Key, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useObservability } from '../services/observabilityService';

export const DataVault: React.FC = () => {
  const { startGroup, addLog, startSubGroup, endGroup } = useObservability();
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('ATHANOR_GITHUB_TOKEN') || '');
  const [vaultFeedback, setVaultFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSaveToken = () => {
    const cleanToken = githubToken.trim().replace(/['"]/g, '');
    
    // Validation: GitHub tokens are usually > 10 chars and start with ghp_ or github_pat_
    const isValid = cleanToken.length > 10 && (cleanToken.startsWith('ghp_') || cleanToken.startsWith('github_pat_'));

    if (isValid) {
      localStorage.setItem('ATHANOR_GITHUB_TOKEN', cleanToken);
      setVaultFeedback({ message: 'Token asegurado en la bóveda local.', type: 'success' });
      
      const groupId = startGroup("Security Vault AF-132: Token Updated");
      addLog("GitHub Token validado y guardado", { prefix: cleanToken.substring(0, 8) + '...' }, 'success', groupId);
      endGroup();
    } else {
      setVaultFeedback({ message: 'Error: Formato de token inválido.', type: 'error' });
      
      const groupId = startGroup("Security Vault AF-132: Error");
      const subId = startSubGroup(groupId, "Token Validation Failure");
      addLog("Intento de guardado con token corrupto o vacío", { length: cleanToken.length }, 'error', subId);
      endGroup();
      
      // Auto-reveal observability panel on error after a short delay
      setTimeout(() => {
        const panelToggle = document.querySelector('[aria-label="Toggle Observability Panel"]') as HTMLButtonElement;
        if (panelToggle) panelToggle.click();
      }, 2000);
    }

    // Clear feedback after 5 seconds
    setTimeout(() => setVaultFeedback(null), 5000);
  };

  const exportData = () => {
    const groupId = startGroup("Data Engine: Export/Import Operation");
    const vault: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) vault[key] = localStorage.getItem(key) || '';
    }
    const data = JSON.stringify(vault, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'athanor_vault_snapshot.json';
    a.click();
    addLog("Snapshot de LocalStorage generado... [Format: JSON]", { size: data.length, keys: Object.keys(vault).length }, 'success', groupId);
    endGroup();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
        addLog("Importación de datos completada. Reiniciando...", null, 'success');
        window.location.reload();
      } catch (err) {
        console.error("Failed to import data", err);
      }
    };
    reader.readAsText(file);
  };

  const handlePromptBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    const oldPrompt = localStorage.getItem('athanor_didactic_prompt');
    if (newPrompt !== oldPrompt) {
      localStorage.setItem('athanor_didactic_prompt', newPrompt);
      localStorage.removeItem('athanor_didactic_cache');
      addLog("Didactic Engine Prompt actualizado. Caché purgada.", null, 'info');
    }
  };

  return (
    <div className="p-4 border-t border-zinc-800 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-400">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Security Vault</span>
          </div>
          <a 
            href="https://github.com/settings/tokens" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            Generar Token <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600" />
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 pl-8 pr-2 text-[10px] font-mono text-indigo-300 focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-neutral-700"
              />
            </div>
            <button
              onClick={handleSaveToken}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95"
            >
              Guardar
            </button>
          </div>

          <AnimatePresence>
            {vaultFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-[9px] font-medium px-2 py-1 rounded border ${
                  vaultFeedback.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {vaultFeedback.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Didactic Engine Prompt</h3>
        <textarea 
          defaultValue={localStorage.getItem('athanor_didactic_prompt') || ''}
          onBlur={handlePromptBlur}
          className="w-full h-24 bg-black/40 border border-white/5 rounded-lg p-2 text-[10px] font-mono text-neutral-400 focus:outline-none focus:border-indigo-500/50 resize-none transition-colors"
          placeholder="System prompt for the didactic engine..."
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Configuración/Sistema</h3>
        <div className="flex gap-2">
          <button onClick={exportData} className="flex-1 flex items-center justify-center gap-2 p-2 bg-zinc-900 rounded-lg text-xs hover:bg-zinc-800">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 p-2 bg-zinc-900 rounded-lg text-xs hover:bg-zinc-800 cursor-pointer">
            <Upload className="w-4 h-4" /> Importar
            <input type="file" onChange={importData} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
