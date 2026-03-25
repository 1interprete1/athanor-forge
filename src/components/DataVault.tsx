import React, { useState } from 'react';
import { Download, Upload, Shield, Key, ExternalLink, RotateCcw, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForgeLogs } from '../contexts/ForgeLogger';
import { secretsConfig } from '../services/secretsConfig';
import { deploymentService } from '../services/deploymentService';

export const DataVault: React.FC = () => {
  const observability = useForgeLogs();
  const { startGroup, addLog, startSubGroup, endGroup } = observability;
  const [githubToken, setGithubToken] = useState(() => secretsConfig.getGithubToken() || '');
  const [groqApiKey, setGroqApiKey] = useState(() => secretsConfig.getGroqApiKey() || '');
  const [vaultFeedback, setVaultFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showScriptArea, setShowScriptArea] = useState(false);

  const handleSilentCopy = async () => {
    try {
      await deploymentService.copyScript(observability);
      setVaultFeedback({ message: 'Script AF-191 copiado silenciosamente.', type: 'success' });
    } catch (err: any) {
      setVaultFeedback({ message: err.message, type: 'error' });
    }
  };

  const generateScript = () => {
    const token = secretsConfig.getGithubToken();
    if (!token) {
      setVaultFeedback({ message: "CRÍTICO: No hay Token de GitHub en la bóveda.", type: 'error' });
      return;
    }
    
    setShowScriptArea(true);
    const groupId = startGroup("Athanor Forge AF-191: Headless Pipeline Override");
    addLog('System', 'info', "Inyectadas variables de entorno GCM_INTERACTIVE y GIT_TERMINAL_PROMPT en script", { groupId });
    addLog('System', 'info', "Restaurada autenticación URL-Embedded para evadir manejadores gráficos locales", { groupId });
    endGroup();
  };

  const manualCopy = () => {
    const el = document.getElementById('deployment-script-textarea') as HTMLTextAreaElement;
    if (el) {
      el.select();
      document.execCommand('copy');
      setVaultFeedback({ message: 'Script copiado al portapapeles.', type: 'success' });
    }
  };

  const getHydratedScript = () => {
    const token = secretsConfig.getGithubToken() || '%%%SECRET_GITHUB_TOKEN%%%';
    const cleanToken = token.trim().replace(/['"]/g, '');
    return `& {
    $GITHUB_USERNAME = "1interprete1"
    $REPO_NAME       = "athanor-forge"
    $GITHUB_TOKEN    = "${cleanToken}"
    # ... (Resto del script AF-191)
}`;
  };

  const exportWorkspace = () => {
    const groupId = startGroup("Athanor Forge AF-193: Universal Workspace Port (UWP) Deployment");
    addLog('System', 'info', "Empaquetando ramas de conversación, artefactos y caché didáctica en esquema monolítico", { groupId });

    const workspace = {
      metadata: { version: "AF-193", timestamp: new Date().toISOString() },
      auth: {
        groq_key: secretsConfig.getGroqApiKey() || '',
        github_token: secretsConfig.getGithubToken() || ''
      },
      settings: {
        didactic_prompt: localStorage.getItem('athanor_didactic_prompt') || '',
        inference_config: JSON.parse(localStorage.getItem('athanor_inference_config') || '{}')
      },
      state: {
        sessions: JSON.parse(localStorage.getItem('athanor_sessions') || '[]'),
        active_branch_indices: JSON.parse(localStorage.getItem('athanor_active_branch_indices') || '{}'),
        favorites: JSON.parse(localStorage.getItem('athanor_favorite_models') || '[]')
      },
      knowledge: {
        didactic_cache: localStorage.getItem('athanor_didactic_cache') || '',
        learning_progress: localStorage.getItem('athanor_learning_progress') || ''
      }
    };

    const data = JSON.stringify(workspace, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'athanor_forge_workspace.json';
    a.click();
    
    addLog('System', 'success', "Workspace exportado exitosamente", { groupId });
    endGroup();
  };

  const importWorkspace = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workspace = JSON.parse(e.target?.result as string);
        
        // Validación básica
        if (!workspace.metadata || workspace.metadata.version !== "AF-193") {
          throw new Error("Esquema de workspace inválido o versión no compatible.");
        }

        // Validación de integridad
        if (typeof workspace.knowledge.didactic_cache !== 'string') {
          throw new Error("Integridad de caché didáctica comprometida.");
        }
        if (!Array.isArray(workspace.state.favorites)) {
          throw new Error("Integridad de favoritos comprometida.");
        }

        if (confirm("Atención: Esto sobreescribirá tu sesión actual. ¿Deseas inyectar este Workspace?")) {
          const groupId = startGroup("Athanor Forge AF-193: Universal Workspace Port (UWP) Deployment");
          addLog('System', 'info', "Implementada guardia de validación para importación de datos externos", { groupId });

          // Hidratación
          secretsConfig.setGroqApiKey(workspace.auth.groq_key);
          secretsConfig.setGithubToken(workspace.auth.github_token);
          localStorage.setItem('athanor_didactic_prompt', workspace.settings.didactic_prompt);
          localStorage.setItem('athanor_inference_config', JSON.stringify(workspace.settings.inference_config));
          localStorage.setItem('athanor_sessions', JSON.stringify(workspace.state.sessions));
          localStorage.setItem('athanor_active_branch_indices', JSON.stringify(workspace.state.active_branch_indices));
          localStorage.setItem('athanor_favorite_models', JSON.stringify(workspace.state.favorites));
          localStorage.setItem('athanor_didactic_cache', workspace.knowledge.didactic_cache);
          localStorage.setItem('athanor_learning_progress', workspace.knowledge.learning_progress);

          addLog('System', 'success', "Workspace inyectado. Reiniciando...", { groupId });
          endGroup();
          window.location.reload();
        }
      } catch (err: any) {
        setVaultFeedback({ message: `Error al importar: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handlePromptBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    const oldPrompt = localStorage.getItem('athanor_didactic_prompt') || "Define el término de IA en JSON estricto con estas 6 llaves: 'overview' (resumen sobrio), 'scientific' (base matemática), 'professional' (uso industrial), 'intuition' (analogía física), 'heuristic' (regla de oro), 'pitfall' (error común). NADA de texto fuera del JSON.";
    if (newPrompt !== oldPrompt) {
      localStorage.setItem('athanor_didactic_prompt', newPrompt);
      localStorage.removeItem('athanor_didactic_cache');
      addLog('Didactic', 'info', "Didactic Engine Prompt actualizado. Caché purgada.", {});
    }
  };

  const resetDidacticKnowledge = () => {
    localStorage.removeItem('athanor_didactic_cache');
    const groupId = startGroup("Didactic Engine: Knowledge Reset");
    addLog('Didactic', 'warn', "Caché de conocimiento purgada manualmente", { groupId });
    endGroup();
    setVaultFeedback({ message: 'Conocimiento restablecido correctamente.', type: 'success' });
    setTimeout(() => setVaultFeedback(null), 3000);
  };

  const exportTrainingDataset = () => {
    const groupId = startGroup("Athanor Forge AF-194: ML Dataset Export");
    const cache = JSON.parse(localStorage.getItem('athanor_didactic_cache') || '{}');
    const terms = Object.entries(cache).filter(([_, data]: [string, any]) => data.user_evaluation);
    
    const subGroupId = startSubGroup(groupId, "ML Data Sanitization");
    addLog('System', 'info', "Conteo de términos calificados listos para exportación", { count: terms.length, subGroupId });
    endGroup();

    const jsonl = terms.map(([term, data]: [string, any]) => JSON.stringify({
      prompt: `Define the AI term: ${term}`,
      completion: JSON.stringify(data.matrix),
      user_rating: data.user_evaluation
    })).join('\n');

    const blob = new Blob([jsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'athanor_didactic_dataset.jsonl';
    a.click();
    
    addLog('System', 'success', "Dataset JSONL generado", { groupId });
    endGroup();
  };

  const handleSaveCredentials = () => {
    const cleanGithub = githubToken.trim().replace(/['"]/g, '');
    const cleanGroq = groqApiKey.trim().replace(/['"]/g, '');
    
    secretsConfig.setGithubToken(cleanGithub);
    secretsConfig.setGroqApiKey(cleanGroq);
    
    setVaultFeedback({ message: 'Credenciales aseguradas en la bóveda.', type: 'success' });
    setTimeout(() => setVaultFeedback(null), 3000);
  };

  return (
    <div className="p-4 border-t border-zinc-800 space-y-6">
      {/* [01] Credentials */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
          <span className="text-zinc-500">[01]</span> Credentials
        </h3>
        <div className="space-y-2">
          <div className="relative">
            <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600" />
            <input
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="Groq API Key"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-1.5 pl-8 pr-2 text-[10px] font-mono text-indigo-300 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-700"
            />
          </div>
          <div className="relative">
            <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600" />
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="GitHub Token"
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-1.5 pl-8 pr-2 text-[10px] font-mono text-indigo-300 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-700"
            />
          </div>
          <button
            onClick={handleSaveCredentials}
            className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95"
          >
            Guardar Credenciales
          </button>
        </div>
      </div>

      {/* [02] Workspace */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
          <span className="text-zinc-500">[02]</span> Workspace
        </h3>
        <div className="flex gap-2">
          <button onClick={exportWorkspace} className="flex-1 flex items-center justify-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-zinc-800 transition-all">
            <Download className="w-3 h-3" /> Export
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer">
            <Upload className="w-3 h-3" /> Import
            <input type="file" onChange={importWorkspace} className="hidden" />
          </label>
        </div>
      </div>

      {/* [03] Machine Learning */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
          <span className="text-zinc-500">[03]</span> Machine Learning
        </h3>
        <button onClick={exportTrainingDataset} className="w-full flex items-center justify-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400 hover:bg-zinc-800 transition-all">
          <Terminal className="w-3 h-3" /> Export Dataset (.jsonl)
        </button>
      </div>

      {/* [04] Development */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
          <span className="text-zinc-500">[04]</span> Development
        </h3>
        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-3 h-3 text-indigo-400" />
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Pipeline Script</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={generateScript}
              className="py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md flex justify-center items-center gap-2 text-white text-[9px] font-bold uppercase tracking-widest transition-all active:scale-[0.98]"
            >
              <Terminal className="w-3 h-3" /> View
            </button>
            <button
              onClick={handleSilentCopy}
              className="py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md flex justify-center items-center gap-2 text-white text-[9px] font-bold uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
            >
              <Shield className="w-3 h-3" /> Copy
            </button>
          </div>

          {showScriptArea && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <textarea
                id="deployment-script-textarea"
                readOnly
                value={getHydratedScript()}
                className="w-full h-32 bg-black border border-white/10 rounded p-2 text-[9px] font-mono text-neutral-300 focus:outline-none resize-none"
              />
              <button
                onClick={manualCopy}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-white text-[9px] font-bold uppercase tracking-widest transition-colors"
              >
                Copy to Clipboard
              </button>
            </motion.div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Prompt Didáctico</h4>
            <button 
              onClick={resetDidacticKnowledge}
              className="text-[9px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Reset
            </button>
          </div>
          <textarea 
            defaultValue={localStorage.getItem('athanor_didactic_prompt') || ''}
            onBlur={handlePromptBlur}
            className="w-full h-20 bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-[10px] font-mono text-neutral-400 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-700"
            placeholder="System prompt..."
          />
        </div>
      </div>
    </div>
  );
};
