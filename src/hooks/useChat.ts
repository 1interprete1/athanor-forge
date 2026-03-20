import { useCallback } from 'react';
import { groqService } from '../services/groqService';
import { InferenceConfig, ArtifactInstance } from '../types';
import { useStore } from '../contexts/StoreContext';
import { ObservabilityContextType } from '../services/observabilityService';
import { ArtifactDetector } from '../services/artifactDetector';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  logprobs?: {
    token: string;
    logprob: number;
    top_logprobs: {
      token: string;
      logprob: number;
    }[];
  }[];
}

export interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

export function useChat() {
  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    isGenerating,
    setIsGenerating,
    metrics,
    setMetrics,
    artifacts,
    setArtifacts,
    setActiveArtifactId,
    activeArtifactId
  } = useStore();

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession.messages;

  const updateSessionMessages = useCallback((sessionId: string, newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const updatedMessages = typeof newMessages === 'function' ? newMessages(s.messages) : newMessages;
        let newTitle = s.title;
        if (s.messages.length === 0 && updatedMessages.length > 0) {
          const firstUserMsg = updatedMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        return { ...s, messages: updatedMessages, title: newTitle };
      }
      return s;
    }));
  }, [setSessions]);

  const handleNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Session',
      date: new Date().toISOString(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, [setSessions, setActiveSessionId]);

  const sendMessageStream = useCallback(async (
    apiKey: string,
    modelId: string,
    content: string,
    config: InferenceConfig,
    observability: ObservabilityContextType
  ) => {
    if (!apiKey || !modelId) return;

    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content };
    updateSessionMessages(activeSessionId, prev => [...prev, newUserMessage]);
    
    setIsGenerating(true);
    setMetrics({ tps: 0, ttft: 0, totalTokens: 0 });

    const assistantMessageId = (Date.now() + 1).toString();
    updateSessionMessages(activeSessionId, prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

    const detector = new ArtifactDetector(activeSessionId, assistantMessageId, artifacts);
    let currentArtifact: ArtifactInstance | null = null;

    try {
      const apiMessages = [];
      if (config.systemPrompt) {
        apiMessages.push({ role: 'system', content: config.systemPrompt });
      }
      
      // Context Injection: If there's an active artifact, inject it into the context
      const activeArtifact = artifacts.find(a => a.id === activeArtifactId);
      if (activeArtifact) {
        const contextGroup = observability.startGroup("Canvas Runtime: Handshake de Preview / Acción");
        const subGroup = observability.startSubGroup(contextGroup, "Referencia de Contexto Bidireccional");
        observability.addLog("Inyectando artefacto activo en el contexto de Groq", {
          id: activeArtifact.id,
          version: activeArtifact.version,
          title: activeArtifact.title,
          contentPreview: activeArtifact.content.substring(0, 100) + '...'
        }, 'info', subGroup);
        observability.endGroup();

        apiMessages.push({ 
          role: 'system', 
          content: `CONTEXTO DEL ARTEFACTO ACTUAL (${activeArtifact.title} v${activeArtifact.version}):\n\`\`\`${activeArtifact.language}\n${activeArtifact.content}\n\`\`\`\nEl usuario se refiere a este artefacto. Si pide cambios, genera una nueva versión completa del código.` 
        });
      }
      
      apiMessages.push(...activeSession.messages.map(m => ({ role: m.role, content: m.content })));
      apiMessages.push({ role: 'user', content });
      
      const stream = groqService.streamChatCompletion(
        apiKey,
        modelId,
        apiMessages,
        config,
        observability,
        (newMetrics) => setMetrics(newMetrics)
      );

      for await (const chunk of stream) {
        updateSessionMessages(activeSessionId, prev => prev.map(m => 
          m.id === assistantMessageId ? { 
            ...m, 
            content: m.content + chunk.content,
            logprobs: [...(m.logprobs || []), ...(chunk.logprobs?.content || [])]
          } : m
        ));

        // Detect artifacts
        const detected = detector.processChunk(chunk.content);
        if (detected) {
          if (!currentArtifact) {
            // First time detecting this artifact
            const groupId = observability.startGroup("Canvas Orchestrator: Fase de Detección e Intercepción");
            observability.addLog(`Trigger detectado: Bloque de código ${detected.language}`, {
              type: detected.type,
              language: detected.language,
              id: detected.id
            }, 'info', groupId);

            const layoutSubGroup = observability.startSubGroup(groupId, "Reconfiguración de Layout Dinámico");
            observability.addLog("Calculando nuevas propiedades del grid", {
              prevWidth: '100%',
              newWidth: 'calc(100% - 600px)',
              canvasWidth: '600px'
            }, 'info', layoutSubGroup);

            observability.addLog("Vinculación de Stream al Canvas: Buffer de tokens dirigido al store de artefactos", null, 'success', groupId);
            observability.endGroup();
            
            setActiveArtifactId(detected.id);
            setArtifacts(prev => [...prev, detected]);
            currentArtifact = detected;
          } else {
            // Update existing artifact
            setArtifacts(prev => prev.map(a => a.id === detected.id ? detected : a));
            currentArtifact = detected;
          }
        }
      }

      if (currentArtifact) {
        const groupId = observability.startGroup("Artefacto Finalizado y Renderizado");
        observability.addLog(`Artefacto ${currentArtifact.title} completado`, {
          size: currentArtifact.content.length,
          type: currentArtifact.type
        }, 'success', groupId);
        observability.endGroup();
      }

    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      let displayError = "\n\n**[Error de Conexión]** No se pudo completar la respuesta.";
      
      // Handle specific Groq error: Terms Acceptance
      if (errorMessage.includes("requires terms acceptance")) {
        const urlMatch = errorMessage.match(/https:\/\/console\.groq\.com\/[^\s]+/);
        const url = urlMatch ? urlMatch[0] : "https://console.groq.com/playground";
        
        displayError = `\n\n> ⚠️ **Acción Requerida: Aceptación de Términos**\n> \n> El modelo seleccionado requiere que aceptes sus términos en la consola de Groq antes de ser utilizado.\n> \n> [Aceptar términos en Groq Console](${url})`;
      } else {
        displayError = `\n\n**[Error]**: ${errorMessage}`;
      }

      updateSessionMessages(activeSessionId, prev => prev.map(m => 
        m.id === assistantMessageId ? { ...m, content: m.content + displayError } : m
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [activeSessionId, activeSession.messages, updateSessionMessages, setIsGenerating, setMetrics, setArtifacts, setActiveArtifactId, activeArtifactId]);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    messages,
    isGenerating,
    metrics,
    handleNewSession,
    sendMessageStream
  };
}
