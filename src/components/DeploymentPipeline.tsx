import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, X, Copy, Check } from 'lucide-react';
import { MASTER_SCRIPT_AF182 } from '../constants';
import { deploymentService } from '../services/deploymentService';
import { useForgeLogs } from '../contexts/ForgeLogger';
import { secretsConfig } from '../services/secretsConfig';

interface DeploymentPipelineProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeploymentPipeline({ isOpen, onClose }: DeploymentPipelineProps) {
  const [copied, setCopied] = useState(false);
  const [tokenPrefix, setTokenPrefix] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const observability = useForgeLogs();
  const { addLog, startGroup, startSubGroup, endGroup } = observability;

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setError(null);
    const groupId = startGroup("Athanor Forge AF-182: Deployment Pipeline Sync");
    
    try {
      await deploymentService.copyScript(observability, groupId);
      setCopied(true);
      const token = secretsConfig.getGithubToken() || '';
      setTokenPrefix(token.substring(0, 8));
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      setError(err.message);
      addLog('System', 'error', err.message, { groupId });
    }
    
    endGroup();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-medium text-white">GitHub Pipeline Automation (AF-182)</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-neutral-950">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-400 font-mono">deploy.ps1</span>
                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors text-xs font-medium"
                >
                  <div className="flex items-center gap-1.5">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '¡Copiado!' : 'Copy Script'}
                  </div>
                  {tokenPrefix && <span className="text-[10px] opacity-70">Token: {tokenPrefix}...</span>}
                </button>
              </div>
              {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
              <pre className="p-4 rounded-xl bg-black/50 border border-white/5 overflow-x-auto text-xs font-mono text-neutral-300 leading-relaxed">
                <code>{MASTER_SCRIPT_AF182}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
