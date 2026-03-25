/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ShieldCheck, ArrowRight } from 'lucide-react';
import { secretsConfig } from '../services/secretsConfig';
import { QuotaInfo, InfrastructureTier } from '../types';
import { ForgeLogo } from './ForgeLogo';

interface AuthGatewayProps {
  onAuthenticated: (key: string) => void;
  onQuotaUpdate?: (quota: QuotaInfo) => void;
}

const extractQuotaInfo = (headers: Headers): QuotaInfo | null => {
  const limitTokensRaw = headers.get('x-ratelimit-limit-tokens');
  const limitTokens = parseInt(limitTokensRaw || '0', 10);
  const remainingTokens = parseInt(headers.get('x-ratelimit-remaining-tokens') || '0', 10);
  const resetTokens = headers.get('x-ratelimit-reset-tokens') || '0s';

  const limitRequests = parseInt(headers.get('x-ratelimit-limit-requests') || '0', 10);
  const remainingRequests = parseInt(headers.get('x-ratelimit-remaining-requests') || '0', 10);
  const resetRequests = headers.get('x-ratelimit-reset-requests') || '0s';

  let tier: InfrastructureTier = 'UNKNOWN';
  if (!limitTokensRaw || limitTokens > 100000) {
    tier = 'ON-DEMAND';
  } else if (limitTokens <= 8000) {
    tier = 'FREE';
  } else {
    tier = 'DEVELOPER';
  }

  return {
    limitTokens: tier === 'ON-DEMAND' ? 1000000 : limitTokens,
    remainingTokens: tier === 'ON-DEMAND' ? 1000000 : remainingTokens,
    resetTokens,
    limitRequests: tier === 'ON-DEMAND' ? 1000 : limitRequests,
    remainingRequests: tier === 'ON-DEMAND' ? 1000 : remainingRequests,
    resetRequests,
    tier
  };
};

export function AuthGateway({ onAuthenticated, onQuotaUpdate }: AuthGatewayProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (key.startsWith('gsk_') && key.length > 20) {
      setIsValidating(true);
      setError('');
      try {
        const BASE_URL = import.meta.env.PROD 
          ? 'https://api.groq.com/openai/v1/models' 
          : '/api/proxy/models';

        const response = await fetch(BASE_URL, {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          let errorMessage = 'Invalid API Key';
          try {
            const data = await response.json();
            errorMessage = typeof data.error === 'string' ? data.error : (data.error?.message || errorMessage);
          } catch (parseError) {
            // If it's not JSON (e.g. Netlify error page), use status text
            errorMessage = `Auth Error (${response.status}): ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        // Extract Quota Info
        const quota = extractQuotaInfo(response.headers);
        if (quota && onQuotaUpdate) {
          onQuotaUpdate(quota);
        }
        
        secretsConfig.setGroqApiKey(key);
        onAuthenticated(key);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid API Key');
      } finally {
        setIsValidating(false);
      }
    } else {
      setError('Invalid Groq API Key format. Should start with gsk_');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md p-8 border border-zinc-900 bg-[#050505] rounded-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <motion.div 
              className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
            <ForgeLogo size={64} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">Athanor Forge</h1>
            <p className="text-[10px] text-neutral-500 tracking-[0.2em] uppercase mt-1">Initializing Infrastructure</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-neutral-500 ml-1">
              Groq API Key
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="password"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError('');
                }}
                placeholder="gsk_..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-none py-3 pl-12 pr-4 text-white placeholder:text-neutral-700 focus:outline-none focus:border-orange-500/50 transition-colors font-mono text-sm"
                autoFocus
              />
            </div>
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-red-400 ml-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="submit"
            disabled={isValidating}
            whileTap={error ? { x: [-2, 2, -2, 2, 0] } : { scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full group flex items-center justify-center gap-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 font-mono text-xs tracking-widest py-3 rounded-none transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
          >
            {isValidating ? '[ ESTABLISHING_SECURE_LINK... ]' : 'INITIALIZE_FORGE_SESSION'}
          </motion.button>
        </form>

        <p className="mt-8 text-center text-[8px] font-mono text-zinc-600 tracking-[0.3em] uppercase leading-relaxed">
          STORAGE_PROTOCOL: LOCAL_BROWSER<br />
          SHARING: ZERO_EXTERNAL
        </p>
      </motion.div>
    </div>
  );
}
