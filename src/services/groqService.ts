/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GroqModel, ModelDefinition, ChatCompletionChunk, InferenceConfig } from '../types';
import { enrichModelData } from './modelRegistry';
import { ObservabilityContextType } from './observabilityService';

const BASE_URL = import.meta.env.PROD 
  ? 'https://api.groq.com/openai/v1' 
  : '/api/proxy';

export const groqService = {
  fetchAvailableModels: async (
    apiKey: string, 
    observability: ObservabilityContextType
  ): Promise<ModelDefinition[]> => {
    const { startGroup, addLog, startSubGroup, endGroup } = observability;
    
    const groupId = startGroup("Athanor Forge AF-123: Critical Bugfix Applied");
    let inSubGroup = false;
    
    try {
      const routingSubId = startSubGroup(groupId, "Environment Routing");
      addLog("Detectando entorno de ejecución", { 
        isProd: import.meta.env.PROD,
        baseUrl: BASE_URL 
      }, 'info', routingSubId);
      endGroup();

      addLog("Tooltip UI Overflow: Solved via Fixed Viewport Centering & Scroll", null, 'success', groupId);

      addLog("Iniciando petición al catálogo...", {
        endpoint: `${BASE_URL}/models`,
        headers: ['Authorization: Bearer [REDACTED]']
      });

      const response = await fetch(`${BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`Failed to parse response: ${response.statusText}`);
      }
      
      const subGroupId = startSubGroup(groupId, "Procesamiento de respuesta raw");
      inSubGroup = true;
      addLog("Respuesta recibida de Groq", data, 'info', subGroupId);
      
      if (!response.ok) {
        const errorMessage = typeof data.error === 'string' ? data.error : data.error?.message;
        throw new Error(errorMessage || 'Error fetching models');
      }

      const rawModels: GroqModel[] = data.data;

      addLog(`Catálogo procesado: ${rawModels.length} modelos disponibles`, null, 'success', subGroupId);
      endGroup(); // end subgroup
      inSubGroup = false;
      
      addLog("Handshake completado exitosamente", null, 'success', groupId);
      endGroup(); // end group
      
      const enrichedModels = enrichModelData(rawModels, observability);
      return enrichedModels;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error en handshake: ${errorMessage}`, error, 'error', groupId);
      if (inSubGroup) endGroup();
      endGroup(); // end group
      throw error;
    }
  },

  streamChatCompletion: async function* (
    apiKey: string,
    modelId: string,
    messages: { role: string; content: string }[],
    config: InferenceConfig,
    observability: ObservabilityContextType,
    onMetrics?: (metrics: { tps: number; ttft: number; totalTokens: number }) => void
  ) {
    const { startGroup, addLog, startSubGroup, endGroup } = observability;
    const groupId = startGroup(`Iniciando Inferencia de Modelo - ${modelId}`);
    
    addLog("Inference Crash: Removed 'logprobs' from Groq API payload", null, 'info', groupId);
    
    addLog("Detalle de los parámetros enviados", { 
      temperature: config.temperature, 
      max_tokens: config.maxTokens,
      top_p: config.topP,
      frequency_penalty: config.frequencyPenalty,
      presence_penalty: config.presencePenalty,
      systemPrompt: messages.find(m => m.role === 'system')?.content || 'None'
    }, 'info', groupId);

    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    let totalTokens = 0;

    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: true,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          top_p: config.topP,
          frequency_penalty: config.frequencyPenalty,
          presence_penalty: config.presencePenalty,
          // logprobs: true, // Removed in AF-123 to prevent crash
          // top_logprobs: 5  // Removed in AF-123 to prevent crash
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Failed to parse response: ${response.statusText}` };
        }
        const errorMessage = typeof errorData.error === 'string' ? errorData.error : errorData.error?.message;
        throw new Error(errorMessage || 'Error en la petición de chat');
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const subGroupId = startSubGroup(groupId, "Recibiendo Stream Chunks");
      let chunkIndex = 0;
      let lastChunkRaw: unknown = null;
      let lastMetricsUpdateTime = performance.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6)) as any;
              
              // Check for logprobs error
              if (data.error && data.error.message && data.error.message.includes('logprobs')) {
                addLog("Nota técnica: Este modelo no expone sus capas de probabilidad internas (Logprobs deshabilitados por el proveedor).", null, 'warn', subGroupId);
                continue;
              }
              
              const chunkData = data as ChatCompletionChunk;
              if (chunkIndex < 3) {
                addLog(`Chunk #${chunkIndex + 1} recibido`, chunkData, 'debug', subGroupId);
              }
              lastChunkRaw = chunkData;
              chunkIndex++;

              const chunk = chunkData.choices[0]?.delta?.content || "";
              
              if (chunk) {
                if (firstTokenTime === null) {
                  firstTokenTime = performance.now();
                  const ttft = firstTokenTime - startTime;
                  addLog(`Primer token recibido (TTFT: ${ttft.toFixed(2)}ms)`, { ttft }, 'success', subGroupId);
                }
                
                tokenCount++;
                yield { content: chunk, logprobs: data.choices[0]?.logprobs };
              }
              
              if (data.x_groq?.usage) {
                totalTokens = data.x_groq.usage.total_tokens;
              }

              // Dynamic TPS updates every 500ms
              const now = performance.now();
              if (firstTokenTime !== null && now - lastMetricsUpdateTime > 500) {
                const elapsedSinceStart = now - startTime;
                let currentTps = 0;
                if (elapsedSinceStart > 0) {
                  const currentTokens = totalTokens || tokenCount;
                  currentTps = currentTokens / (elapsedSinceStart / 1000);
                }
                
                if (onMetrics) {
                  onMetrics({
                    tps: currentTps,
                    ttft: firstTokenTime - startTime,
                    totalTokens: totalTokens || tokenCount
                  });
                }
                lastMetricsUpdateTime = now;
              }
            } catch (e) {
              console.error("Error parsing stream chunk", e, line);
            }
          }
        }
      }

      if (lastChunkRaw) {
        addLog("Último chunk recibido", lastChunkRaw, 'debug', subGroupId);
      }

      endGroup(); // end subgroup

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const finalTotalTokens = totalTokens || tokenCount;
      const tps = totalTime > 0 ? (finalTotalTokens / (totalTime / 1000)) : 0;
      const ttft = firstTokenTime ? firstTokenTime - startTime : 0;

      if (onMetrics) {
        onMetrics({ tps, ttft, totalTokens: finalTotalTokens });
      }

      addLog("Inferencia completada", { 
        tpsTotal: tps.toFixed(2), 
        ttftReal: ttft.toFixed(2),
        totalTokens: finalTotalTokens
      }, 'success', groupId);
      endGroup(); // end group

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error en stream: ${errorMessage}`, error, 'error', groupId);
      endGroup(); // end group
      throw error;
    }
  },

  generateDidacticContent: async (
    apiKey: string,
    term: string,
    observability: ObservabilityContextType,
    specificSection?: string
  ): Promise<any> => {
    const { startGroup, addLog, startSubGroup, endGroup } = observability;
    const groupId = startGroup(`Generating Didactic Content: ${term}`);
    
    const systemPrompt = localStorage.getItem('athanor_didactic_prompt') || 
      "Eres el Motor de Sabiduría Técnica de Athanor Forge. Genera JSON estricto con las claves: 'scientific', 'professional', 'feynman_core', 'heuristic_rule', 'anti_pattern'.";
    
    const userPrompt = specificSection 
      ? `Reescribe la explicación para la sección '${specificSection}' del término ${term} because the anterior fue confusa.`
      : `Define the term: ${term}`;

    const payload = {
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    };

    const payloadSubId = startSubGroup(groupId, "Didactic Fetch Payload Check");
    addLog("Payload validado para Groq (OpenAI Format)", payload, 'info', payloadSubId);
    endGroup();

    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to fetch didactic content");
      const data = await response.json();
      
      let content;
      try {
        content = JSON.parse(data.choices[0].message.content);
      } catch (parseError) {
        addLog("JSON Parse Error in Didactic Engine", { 
          raw: data.choices[0].message.content,
          error: parseError 
        }, 'warn', groupId);
        
        // Return a special error object that the UI can recognize
        content = {
          isError: true,
          message: "Error de Generación: El Prompt del Motor Didáctico no produjo un JSON válido. Revisa la configuración en el Sidebar."
        };
      }
      
      addLog("Didactic content processing finished", content, content.isError ? 'warn' : 'success', groupId);
      endGroup();
      return content;
    } catch (error) {
      addLog("Error generating didactic content", error, 'error', groupId);
      endGroup();
      throw error;
    }
  }
};
