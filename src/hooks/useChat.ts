import { useCallback, useMemo } from 'react';
import { groqService } from '../services/groqService';
import { InferenceConfig, ArtifactInstance, Message, ChatSession, PerformanceEntry } from '../types';
import { useStore } from '../contexts/StoreContext';
import { ForgeLoggerContextType } from '../contexts/ForgeLogger';
import { ArtifactDetector } from '../services/artifactDetector';

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
    activeArtifactId,
    setCoolDown,
    addPerformanceEntry
  } = useStore();

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  
  // Reconstruct the active timeline based on branch selections
  const messages = useMemo(() => {
    if (!activeSession) return [];
    const allMessages = activeSession.messages;
    const branchSelections = activeSession.activeBranchIndices || {};
    
    const timeline: Message[] = [];
    let currentParentId: string | null = null;
    
    // Start from root and follow the active branches
    while (true) {
      const children = allMessages.filter(m => m.parentId === currentParentId);
      if (children.length === 0) break;
      
      // Sort by branchIndex just in case
      children.sort((a, b) => a.branchIndex - b.branchIndex);
      
      const selectedIndex = branchSelections[currentParentId || 'root'] || 0;
      const selectedMessage = children[selectedIndex] || children[0];
      
      timeline.push(selectedMessage);
      currentParentId = selectedMessage.id;
    }
    
    return timeline;
  }, [activeSession]);

  const updateSessionMessages = useCallback((sessionId: string, newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const updatedMessages = typeof newMessages === 'function' ? newMessages(s.messages) : newMessages;
        let newTitle = s.title;
        // Only update title if it's the first message in the root branch
        if (s.messages.length === 0 && updatedMessages.length > 0) {
          const firstUserMsg = updatedMessages.find(m => m.role === 'user' && m.parentId === null);
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        return { ...s, messages: updatedMessages, title: newTitle };
      }
      return s;
    }));
  }, [setSessions]);

  const updateBranchSelection = useCallback((sessionId: string, parentId: string | null, index: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          activeBranchIndices: {
            ...(s.activeBranchIndices || {}),
            [parentId || 'root']: index
          }
        };
      }
      return s;
    }));
  }, [setSessions]);

  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString('es-MX', { hour12: false });
  };

  const generateResponse = useCallback(async (
    apiKey: string,
    modelId: string,
    config: InferenceConfig,
    observability: ForgeLoggerContextType,
    assistantMessageId: string,
    onMetrics?: (metrics: { tps: number; ttft: number; totalTokens: number }) => void,
    onQuotaUpdate?: (quota: any) => void,
    files?: any[]
  ) => {
    setIsGenerating(true);
    setMetrics({ tps: 0, ttft: 0, totalTokens: 0 });

    const detector = new ArtifactDetector(activeSessionId, assistantMessageId, artifacts);
    let currentArtifact: ArtifactInstance | null = null;

    const contextAtStart = [...messages];

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
        observability.addLog('Inference', 'info', "Inyectando artefacto activo en el contexto de Groq", {
          id: activeArtifact.id,
          version: activeArtifact.version,
          title: activeArtifact.title,
          contentPreview: activeArtifact.content.substring(0, 100) + '...',
          subGroupId: subGroup
        });
        observability.endGroup();

        apiMessages.push({ 
          role: 'system', 
          content: `CONTEXTO DEL ARTEFACTO ACTUAL (${activeArtifact.title} v${activeArtifact.version}):\n\`\`\`${activeArtifact.language}\n${activeArtifact.content}\n\`\`\`\nEl usuario se refiere a este artefacto. Si pide cambios, genera una nueva versión completa del código.` 
        });
      }
      
      apiMessages.push(...contextAtStart.map(m => ({ role: m.role, content: m.content })));
      
      const stream = groqService.streamChatCompletion(
        apiKey,
        modelId,
        apiMessages,
        config,
        observability,
        (newMetrics) => {
          setMetrics(newMetrics);
          if (onMetrics) onMetrics(newMetrics);
          
          const contextUsage = messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0) / 4;
          addPerformanceEntry(activeSessionId, {
            timestamp: Date.now(),
            tps: newMetrics.tps,
            contextUsage: contextUsage,
            ttft: newMetrics.ttft
          });

          // Update session metadata and message metrics
          setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                modelId: modelId,
                totalTokens: (s.totalTokens || 0) + newMetrics.totalTokens
              };
            }
            return s;
          }));

          updateSessionMessages(activeSessionId, prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, tps: newMetrics.tps, ttft: newMetrics.ttft } : m
          ));
        },
        onQuotaUpdate,
        files
      );

      for await (const chunk of stream) {
        if (chunk.cost !== undefined) {
          updateSessionMessages(activeSessionId, prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, cost: chunk.cost } : m
          ));
        }

        if (chunk.content) {
          updateSessionMessages(activeSessionId, prev => prev.map(m => 
            m.id === assistantMessageId ? { 
              ...m, 
              content: m.content + chunk.content,
              logprobs: [...(m.logprobs || []), ...(chunk.logprobs?.content || [])]
            } : m
          ));
        }

        // Detect artifacts
        const detected = detector.processChunk(chunk.content);
        if (detected) {
          if (!currentArtifact) {
            // First time detecting this artifact
            const groupId = observability.startGroup("Canvas Orchestrator: Fase de Detección e Intercepción");
            observability.addLog('UI', 'info', `Trigger detectado: Bloque de código ${detected.language}`, {
              type: detected.type,
              language: detected.language,
              id: detected.id,
              groupId
            });

            const layoutSubGroup = observability.startSubGroup(groupId, "Reconfiguración de Layout Dinámico");
            observability.addLog('UI', 'info', "Calculando nuevas propiedades del grid", {
              prevWidth: '100%',
              newWidth: 'calc(100% - 600px)',
              canvasWidth: '600px',
              layoutSubGroup
            });

            observability.addLog('UI', 'success', "Vinculación de Stream al Canvas: Buffer de tokens dirigido al store de artefactos", { groupId });
            observability.endGroup(); // end layoutSubGroup
            observability.endGroup(); // end groupId
            
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
        observability.addLog('UI', 'success', `Artefacto ${currentArtifact.title} completado`, {
          size: currentArtifact.content.length,
          type: currentArtifact.type,
          groupId
        });
        observability.endGroup();
      }

    } catch (error) {
      observability.addLog('Inference', 'error', "Error generating response", { error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      let displayError = "\n\n**[Error de Conexión]** No se pudo completar la respuesta.";
      
      // Handle specific Groq error: Terms Acceptance
      if (errorMessage.includes("requires terms acceptance")) {
        const urlMatch = errorMessage.match(/https:\/\/console\.groq\.com\/[^\s]+/);
        const url = urlMatch ? urlMatch[0] : "https://console.groq.com/playground";
        
        displayError = `\n\n> ⚠️ **Acción Requerida: Aceptación de Términos**\n> \n> El modelo seleccionado requiere que aceptes sus términos en la consola de Groq antes de ser utilizado.\n> \n> [Aceptar términos en Groq Console](${url})`;
      } else if (errorMessage.startsWith('RATE_LIMIT_EXCEEDED:')) {
        const resetTimeStr = errorMessage.split(':')[1].replace('s', '');
        const resetTime = parseInt(resetTimeStr) || 30;
        setCoolDown(resetTime);
        
        // Start countdown
        let remaining = resetTime;
        const interval = setInterval(() => {
          remaining--;
          setCoolDown(remaining);
          if (remaining <= 0) {
            clearInterval(interval);
            setCoolDown(null);
          }
        }, 1000);
        
        displayError = `\n\n> ⚠️ **LPU Saturada**\n> Enfriamiento en curso: ${resetTime}s`;
      } else {
        displayError = `\n\n**[Error]**: ${errorMessage}`;
      }

      updateSessionMessages(activeSessionId, prev => prev.map(m => 
        m.id === assistantMessageId ? { ...m, content: m.content + displayError } : m
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [activeSessionId, messages, updateSessionMessages, setIsGenerating, setMetrics, setArtifacts, setActiveArtifactId, activeArtifactId, artifacts, setCoolDown]);

  const switchBranch = useCallback((messageId: string, direction: 'prev' | 'next') => {
    const msg = activeSession.messages.find(m => m.id === messageId);
    if (!msg) return;
    
    const parentId = msg.parentId;
    const currentIndex = msg.branchIndex;
    const total = msg.totalBranches;
    
    let nextIndex = currentIndex;
    if (direction === 'prev') {
      nextIndex = (currentIndex - 1 + total) % total;
    } else {
      nextIndex = (currentIndex + 1) % total;
    }
    
    updateBranchSelection(activeSessionId, parentId, nextIndex);

    // AF-191: Temporal Synchronization - Find the most recent artifact in the new timeline
    const branchSelections = {
      ...(activeSession.activeBranchIndices || {}),
      [parentId || 'root']: nextIndex
    };

    const timeline: Message[] = [];
    let currParentId: string | null = null;
    const allMessages = activeSession.messages;

    while (true) {
      const children = allMessages.filter(m => m.parentId === currParentId);
      if (children.length === 0) break;
      children.sort((a, b) => a.branchIndex - b.branchIndex);
      const selIndex = branchSelections[currParentId || 'root'] || 0;
      const selectedMessage = children[selIndex] || children[0];
      timeline.push(selectedMessage);
      currParentId = selectedMessage.id;
    }

    const timelineIds = timeline.map(m => m.id);
    const timelineArtifacts = artifacts.filter(a => timelineIds.includes(a.messageId));
    
    if (timelineArtifacts.length > 0) {
      const latestArtifact = timelineArtifacts[timelineArtifacts.length - 1];
      setActiveArtifactId(latestArtifact.id);
    } else {
      setActiveArtifactId(null);
    }
  }, [activeSession, activeSessionId, updateBranchSelection, artifacts, setActiveArtifactId]);

  const createBranch = useCallback(async (
    messageId: string, 
    newContent: string,
    apiKey: string,
    modelId: string,
    config: InferenceConfig,
    observability: ForgeLoggerContextType
  ) => {
    const originalMsg = activeSession.messages.find(m => m.id === messageId);
    if (!originalMsg) return;

    const parentId = originalMsg.parentId;
    const siblings = activeSession.messages.filter(m => m.parentId === parentId);
    const newBranchIndex = siblings.length;
    const newTotalBranches = newBranchIndex + 1;

    // Update siblings totalBranches
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const updatedMessages = s.messages.map(m => 
          m.parentId === parentId ? { ...m, totalBranches: newTotalBranches } : m
        );
        return { ...s, messages: updatedMessages };
      }
      return s;
    }));

    const newMessageId = Date.now().toString();
    const newMessage: Message = {
      id: newMessageId,
      parentId,
      branchIndex: newBranchIndex,
      totalBranches: newTotalBranches,
      role: originalMsg.role,
      content: newContent,
      timestamp: getTimestamp()
    };

    const branchGroup = observability.startGroup("Branching Engine: Refactorización de Historial");
    observability.addLog('System', 'info', "Creando nueva bifurcación de conversación", {
      parentId,
      newBranchIndex,
      totalBranches: newTotalBranches,
      groupId: branchGroup
    });
    observability.endGroup();

    // Add new message and select it
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, newMessage],
          activeBranchIndices: {
            ...(s.activeBranchIndices || {}),
            [parentId || 'root']: newBranchIndex
          }
        };
      }
      return s;
    }));

    // If it was a user message, trigger a new response
    if (originalMsg.role === 'user') {
      const assistantMessageId = (Date.now() + 1).toString();
      updateSessionMessages(activeSessionId, prev => [...prev, { 
        id: assistantMessageId, 
        parentId: newMessageId,
        branchIndex: 0,
        totalBranches: 1,
        role: 'assistant', 
        content: '',
        timestamp: getTimestamp(),
        jsonMode: config.jsonMode
      }]);

      await generateResponse(apiKey, modelId, config, observability, assistantMessageId);
    }
  }, [activeSession, activeSessionId, setSessions, updateSessionMessages, generateResponse]);

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

  const handleDeleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) {
        return [{
          id: Date.now().toString(),
          title: 'New Session',
          date: new Date().toISOString(),
          messages: []
        }];
      }
      return next;
    });
    if (activeSessionId === id) {
      setActiveSessionId(sessions.find(s => s.id !== id)?.id || sessions[0].id);
    }
  }, [activeSessionId, sessions, setSessions, setActiveSessionId]);

  const handleRenameSession = useCallback((id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
  }, [setSessions]);

  const sendMessageStream = useCallback(async (
    apiKey: string,
    modelId: string,
    content: string,
    config: InferenceConfig,
    observability: ForgeLoggerContextType,
    onMetrics?: (metrics: { tps: number; ttft: number; totalTokens: number }) => void,
    onQuotaUpdate?: (quota: any) => void,
    files?: any[]
  ) => {
    if (!apiKey || !modelId) return;

    const lastMsg = messages[messages.length - 1];
    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      parentId: lastMsg ? lastMsg.id : null,
      branchIndex: 0,
      totalBranches: 1,
      role: 'user', 
      content,
      timestamp: getTimestamp()
    };
    updateSessionMessages(activeSessionId, prev => [...prev, newUserMessage]);
    
    const assistantMessageId = (Date.now() + 1).toString();
    updateSessionMessages(activeSessionId, prev => [...prev, { 
      id: assistantMessageId, 
      parentId: newUserMessage.id,
      branchIndex: 0,
      totalBranches: 1,
      role: 'assistant', 
      content: '',
      timestamp: getTimestamp(),
      jsonMode: config.jsonMode
    }]);

    await generateResponse(apiKey, modelId, config, observability, assistantMessageId, onMetrics, onQuotaUpdate, files);
  }, [activeSessionId, messages, updateSessionMessages, generateResponse]);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    messages,
    isGenerating,
    metrics,
    handleNewSession,
    handleDeleteSession,
    handleRenameSession,
    sendMessageStream,
    createBranch,
    switchBranch
  };
}
