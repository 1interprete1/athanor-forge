/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ShieldCheck, ArrowRight } from 'lucide-react';
import { secretsConfig } from '../services/secretsConfig';

interface AuthGatewayProps {
  onAuthenticated: (key: string) => void;
}

export function AuthGateway({ onAuthenticated }: AuthGatewayProps) {
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
        className="w-full max-w-md p-8 border border-white/10 bg-neutral-950 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Athanor Forge</h1>
            <p className="text-sm text-neutral-400">Initializing Forge Session</p>
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
                className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500/50 transition-colors"
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

          <button
            type="submit"
            disabled={isValidating}
            className="w-full group flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Validating...' : 'Initialize Forge Session'}
            {!isValidating && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] text-neutral-600 uppercase tracking-widest leading-relaxed">
          Your key is stored locally in your browser.<br />
          Never shared with any server other than Groq.
        </p>
      </motion.div>
    </div>
  );
}
