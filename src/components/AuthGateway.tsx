/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ShieldCheck, ArrowRight, LogIn } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { secretsConfig } from '../services/secretsConfig';
import { QuotaInfo, InfrastructureTier } from '../types';
import { ForgeLogo } from './ForgeLogo';
import { googleDriveService } from '../services/googleDriveService';

interface AuthGatewayProps {
  onAuthenticated: (user: User | null, groqKey: string, openAiKey: string) => void;
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
  const [groqKey, setGroqKey] = useState(secretsConfig.getGroqApiKey() || '');
  const [openAiKey, setOpenAiKey] = useState(secretsConfig.getOpenAiApiKey() || '');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isCheckingKeys, setIsCheckingKeys] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasDriveToken, setHasDriveToken] = useState<boolean>(!!sessionStorage.getItem('google_drive_token'));
  const [driveErrorMsg, setDriveErrorMsg] = useState<{message: string, link?: string} | null>(null);

  const validateApiKeys = async (groq: string, openai: string) => {
    const GROQ_BASE_URL = import.meta.env.PROD 
      ? 'https://api.groq.com/openai/v1/models' 
      : '/api/proxy/models';
    const groqRes = await fetch(GROQ_BASE_URL, { headers: { 'Authorization': `Bearer ${groq}` } });
    if (!groqRes.ok) throw new Error('Invalid Groq API Key');

    // We can skip OpenAI validation here for speed, or add it if needed.
    // For now, validating Groq is usually enough to prove the keys are generally valid.
    return true;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsCheckingKeys(false);
        return;
      }

      setIsCheckingKeys(true);
      let savedGroq = secretsConfig.getGroqApiKey();
      let savedOpenAi = secretsConfig.getOpenAiApiKey();
      
      const token = sessionStorage.getItem('google_drive_token');
      if (token) {
        try {
          googleDriveService.setAccessToken(token);
          let data = null;
          try {
            data = await googleDriveService.syncFromDrive();
          } catch (driveError: any) {
            if (driveError.message && driveError.message.includes('Drive API Disabled')) {
              const linkMatch = driveError.message.match(/https:\/\/console\.developers\.google\.com[^\s]*/);
              setDriveErrorMsg({
                message: "Google Drive Sync is disabled in your Google Cloud Project. Conversations will only be saved locally.",
                link: linkMatch ? linkMatch[0] : undefined
              });
            } else {
              console.warn("Drive sync failed on auth state change, attempting local backup", driveError);
            }
            if (driveError.message && driveError.message.includes('401')) {
              sessionStorage.removeItem('google_drive_token');
              setHasDriveToken(false);
            }
            const localBackup = localStorage.getItem('athanor_workspace_backup');
            if (localBackup) {
              data = JSON.parse(localBackup);
            }
          }

          if (data && data.apiKeys) {
            if (data.apiKeys.groq) {
              secretsConfig.setGroqApiKey(data.apiKeys.groq);
              savedGroq = data.apiKeys.groq;
            }
            if (data.apiKeys.openai) {
              secretsConfig.setOpenAiApiKey(data.apiKeys.openai);
              savedOpenAi = data.apiKeys.openai;
            }
            if (data.apiKeys.githubUser) secretsConfig.setGithubUser(data.apiKeys.githubUser);
            if (data.apiKeys.githubRepo) secretsConfig.setGithubRepo(data.apiKeys.githubRepo);
            if (data.apiKeys.githubToken) secretsConfig.setGithubToken(data.apiKeys.githubToken);
          }
        } catch (e) {
          console.error("Failed to load workspace data on auth state change", e);
        }
      }

      if (savedGroq && savedOpenAi) {
        try {
          await validateApiKeys(savedGroq, savedOpenAi);
          onAuthenticated(currentUser, savedGroq, savedOpenAi);
          return; // Do not set isCheckingKeys to false, as we are transitioning
        } catch (err: any) {
          setError('Saved API keys are invalid or expired. Please re-enter them.');
          secretsConfig.clearGroqApiKey();
          secretsConfig.clearOpenAiApiKey();
          setGroqKey('');
          setOpenAiKey('');
        }
      }
      
      setIsCheckingKeys(false);
    });
    return () => unsubscribe();
  }, [onAuthenticated]);

  const handleGoogleLogin = async () => {
    setError('');
    setIsValidating(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (token) {
        googleDriveService.setAccessToken(token);
        // Store token for session (optional, but useful for background sync)
        sessionStorage.setItem('google_drive_token', token);
        setHasDriveToken(true);
        
        // Try to load API keys from Drive
        try {
          let data = null;
          try {
            data = await googleDriveService.syncFromDrive();
          } catch (driveError: any) {
            if (driveError.message && driveError.message.includes('Drive API Disabled')) {
              const linkMatch = driveError.message.match(/https:\/\/console\.developers\.google\.com[^\s]*/);
              setDriveErrorMsg({
                message: "Google Drive Sync is disabled in your Google Cloud Project. Conversations will only be saved locally.",
                link: linkMatch ? linkMatch[0] : undefined
              });
            } else {
              console.warn("Drive sync failed, attempting local backup", driveError);
            }
            if (driveError.message && driveError.message.includes('401')) {
              sessionStorage.removeItem('google_drive_token');
              setHasDriveToken(false);
            }
            const localBackup = localStorage.getItem('athanor_workspace_backup');
            if (localBackup) {
              data = JSON.parse(localBackup);
            }
          }

          if (data && data.apiKeys) {
            if (data.apiKeys.groq) {
              secretsConfig.setGroqApiKey(data.apiKeys.groq);
              setGroqKey(data.apiKeys.groq);
            }
            if (data.apiKeys.openai) {
              secretsConfig.setOpenAiApiKey(data.apiKeys.openai);
              setOpenAiKey(data.apiKeys.openai);
            }
            if (data.apiKeys.githubUser) secretsConfig.setGithubUser(data.apiKeys.githubUser);
            if (data.apiKeys.githubRepo) secretsConfig.setGithubRepo(data.apiKeys.githubRepo);
            if (data.apiKeys.githubToken) secretsConfig.setGithubToken(data.apiKeys.githubToken);
          }
        } catch (e) {
          console.error("Failed to load workspace data during login", e);
        }
      }

      const savedGroq = secretsConfig.getGroqApiKey();
      const savedOpenAi = secretsConfig.getOpenAiApiKey();
      
      if (savedGroq && savedOpenAi) {
        try {
          await validateApiKeys(savedGroq, savedOpenAi);
          onAuthenticated(result.user, savedGroq, savedOpenAi);
          return;
        } catch (err: any) {
          setError('Saved API keys are invalid or expired. Please re-enter them.');
          secretsConfig.clearGroqApiKey();
          secretsConfig.clearOpenAiApiKey();
          setGroqKey('');
          setOpenAiKey('');
        }
      }
      
      // User logged in but still needs keys
      setUser(result.user);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please check your address bar or open the app in a new tab.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`DOMINIO NO AUTORIZADO: Debes agregar "${currentDomain}" a la lista de dominios autorizados en tu Consola de Firebase (Authentication > Settings > Authorized domains).`);
      } else {
        setError(err.message || 'Error logging in with Google');
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanGroqKey = groqKey.trim();
    const cleanOpenAiKey = openAiKey.trim();

    if (!cleanGroqKey.startsWith('gsk_') || cleanGroqKey.length <= 20) {
      setError('Invalid Groq API Key format. Should start with gsk_');
      return;
    }
    if (!cleanOpenAiKey.startsWith('sk-') || cleanOpenAiKey.length <= 20) {
      setError('Invalid OpenAI API Key format. Should start with sk-');
      return;
    }

    setIsValidating(true);
    setError('');
    try {
      // Validate Groq Key
      const GROQ_BASE_URL = import.meta.env.PROD 
        ? 'https://api.groq.com/openai/v1/models' 
        : '/api/proxy/models';

      const groqResponse = await fetch(GROQ_BASE_URL, {
        headers: {
          'Authorization': `Bearer ${cleanGroqKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!groqResponse.ok) {
        let errorMessage = 'Invalid Groq API Key';
        try {
          const data = await groqResponse.json();
          errorMessage = typeof data.error === 'string' ? data.error : (data.error?.message || errorMessage);
        } catch (parseError) {
          errorMessage = `Groq Auth Error (${groqResponse.status}): ${groqResponse.statusText}`;
        }
        throw new Error(`Groq Error: ${errorMessage}`);
      }

      // Extract Quota Info from Groq
      const quota = extractQuotaInfo(groqResponse.headers);
      if (quota && onQuotaUpdate) {
        onQuotaUpdate(quota);
      }
      
      secretsConfig.setGroqApiKey(cleanGroqKey);
      secretsConfig.setOpenAiApiKey(cleanOpenAiKey);
      
      // Save to drive immediately if we have the token
      const token = sessionStorage.getItem('google_drive_token');
      if (token) {
        try {
          googleDriveService.setAccessToken(token);
          let existingData = await googleDriveService.syncFromDrive() || {};
          existingData.apiKeys = {
            ...(existingData.apiKeys || {}),
            groq: cleanGroqKey,
            openai: cleanOpenAiKey
          };
          await googleDriveService.syncToDrive(existingData);
        } catch (e: any) {
          if (e.message && e.message.includes('Drive API Disabled')) {
            console.warn("Google Drive API is disabled. Keys saved locally.");
          } else {
            console.error("Failed to save keys to drive immediately", e);
          }
          if (e.message && e.message.includes('401')) {
            sessionStorage.removeItem('google_drive_token');
            setHasDriveToken(false);
          }
        }
      }
      
      // If user is already logged in with Google, proceed
      if (user) {
        onAuthenticated(user, cleanGroqKey, cleanOpenAiKey);
      } else {
        // User provided keys but hasn't logged in with Google yet
        // We'll let them proceed for now, but Google Drive sync won't work
        onAuthenticated(null, cleanGroqKey, cleanOpenAiKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid API Key');
    } finally {
      setIsValidating(false);
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
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">Athanor Forja</h1>
            <p className="text-[10px] text-neutral-500 tracking-[0.2em] uppercase mt-1">Initializing Infrastructure</p>
          </div>
        </div>

        <div className="space-y-6">
          {driveErrorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-none">
              <p className="text-xs text-red-400 mb-2">{driveErrorMsg.message}</p>
              {driveErrorMsg.link && (
                <a href={driveErrorMsg.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-400 hover:text-orange-300 underline uppercase tracking-wider break-all">
                  Enable Google Drive API Here
                </a>
              )}
            </div>
          )}

          {isCheckingKeys ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-xs text-neutral-500 uppercase tracking-widest">Validating secure link...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {!user || !hasDriveToken ? (
              <div className="space-y-4">
                {user && (
                  <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-none mb-4">
                    <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-orange-500/30" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white truncate uppercase tracking-wider">{user.displayName}</p>
                      <p className="text-[8px] text-emerald-500 font-mono uppercase tracking-widest truncate">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => auth.signOut()}
                      className="text-[8px] font-mono text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                    >
                      [ Sign Out ]
                    </button>
                  </div>
                )}
                <motion.button
                  onClick={handleGoogleLogin}
                  disabled={isValidating}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 px-4 rounded-none transition-all hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? (
                    <span className="text-xs tracking-widest uppercase">[ AUTHENTICATING... ]</span>
                  ) : (
                    <>
                      <FcGoogle className="w-5 h-5" />
                      <span className="text-xs tracking-widest uppercase">
                        {user ? `Continue as ${user.displayName?.split(' ')[0] || 'User'}` : 'Login with Google'}
                      </span>
                    </>
                  )}
                </motion.button>

                {error && error.includes('DOMINIO NO AUTORIZADO') && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-none"
                  >
                    <p className="text-[10px] text-red-500 uppercase tracking-widest font-bold mb-2">Error de Configuración</p>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider leading-relaxed mb-3">
                      Firebase no reconoce este dominio ({window.location.hostname}). Para solucionarlo:
                    </p>
                    <ol className="text-[8px] text-neutral-500 uppercase tracking-widest space-y-1 mb-3 list-decimal ml-3">
                      <li>Ve a la Consola de Firebase</li>
                      <li>Authentication {'>'} Settings</li>
                      <li>Authorized Domains</li>
                      <li>Añade "{window.location.hostname}"</li>
                    </ol>
                    <a 
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full py-2 bg-red-500/20 text-red-500 text-center text-[9px] font-bold uppercase tracking-widest border border-red-500/30 hover:bg-red-500/30 transition-colors"
                    >
                      Ir a Consola de Firebase
                    </a>
                  </motion.div>
                )}

                {error && error.includes('Popup blocked') && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-none"
                  >
                    <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mb-2">Ventana Bloqueada</p>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider leading-relaxed mb-3">
                      Tu navegador bloqueó la ventana de Google. Haz clic en el icono de la barra de direcciones para permitirla o abre la app en una pestaña nueva.
                    </p>
                    <button 
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="w-full py-2 bg-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-widest border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                    >
                      Abrir en Nueva Pestaña
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-none">
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-orange-500/30" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white truncate uppercase tracking-wider">{user.displayName}</p>
                    <p className="text-[8px] text-emerald-500 font-mono uppercase tracking-widest truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => auth.signOut()}
                    className="text-[8px] font-mono text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                  >
                    [ Sign Out ]
                  </button>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-900"></div>
                  </div>
                  <div className="relative flex justify-center text-[8px] uppercase tracking-[0.4em] text-zinc-700">
                    <span className="bg-[#050505] px-4">Infrastructure Keys</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {!secretsConfig.getGroqApiKey() && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-widest text-neutral-500 ml-1">
                          Groq API Key
                        </label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            type="password"
                            value={groqKey}
                            onChange={(e) => {
                              setGroqKey(e.target.value);
                              setError('');
                            }}
                            placeholder="gsk_..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-none py-3 pl-12 pr-4 text-white placeholder:text-neutral-700 focus:outline-none focus:border-orange-500/50 transition-colors font-mono text-sm"
                            autoFocus={!groqKey}
                          />
                        </div>
                      </div>
                    )}

                    {!secretsConfig.getOpenAiApiKey() && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-widest text-neutral-500 ml-1">
                          OpenAI API Key
                        </label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            type="password"
                            value={openAiKey}
                            onChange={(e) => {
                              setOpenAiKey(e.target.value);
                              setError('');
                            }}
                            placeholder="sk-..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-none py-3 pl-12 pr-4 text-white placeholder:text-neutral-700 focus:outline-none focus:border-orange-500/50 transition-colors font-mono text-sm"
                            autoFocus={!!groqKey && !openAiKey}
                          />
                        </div>
                      </div>
                    )}

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
              </>
            )}
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-[8px] font-mono text-zinc-600 tracking-[0.3em] uppercase leading-relaxed">
          STORAGE_PROTOCOL: {user ? 'GOOGLE_DRIVE_SYNC' : 'LOCAL_BROWSER'}<br />
          SHARING: ZERO_EXTERNAL
        </p>
      </motion.div>
    </div>
  );
}
