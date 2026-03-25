/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GroqModel, ModelDefinition, ChatCompletionChunk, InferenceConfig, QuotaInfo, InfrastructureTier } from '../types';
import { enrichModelData } from './modelRegistry';
import { ForgeLoggerContextType } from '../contexts/ForgeLogger';
import { calculateInferenceCost, updateAccumulatedSpend } from './pricingRegistry';

const BASE_URL = import.meta.env.PROD 
  ? 'https://api.groq.com/openai/v1' 
  : '/api/proxy';

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
    limitTokens: tier === 'ON-DEMAND' ? 1000000 : limitTokens, // Use a high number for ON-DEMAND
    remainingTokens: tier === 'ON-DEMAND' ? 1000000 : remainingTokens,
    limitRequests: tier === 'ON-DEMAND' ? 1000 : limitRequests,
    remainingRequests: tier === 'ON-DEMAND' ? 1000 : remainingRequests,
    resetTokens,
    resetRequests,
    tier
  };
};

export const groqService = {
  fetchAvailableModels: async (
    apiKey: string, 
    observability: ForgeLoggerContextType,
    onQuotaUpdate?: (quota: QuotaInfo) => void
  ): Promise<ModelDefinition[]> => {
    const { startGroup, startSubGroup, endGroup, addLog } = observability;
    
    const groupId = startGroup("Athanor Forge AF-170: Infrastructure Sensor Activation");
    let inSubGroup = false;
    
    try {
      const routingSubId = startSubGroup(groupId, "Environment Routing");
      addLog('System', 'info', "Detectando entorno de ejecución", { 
        isProd: import.meta.env.PROD,
        baseUrl: BASE_URL,
        routingSubId
      });
      endGroup();

      addLog('System', 'info', "Infrastructure Sensor: Intercepting Groq Rate-Limit headers", {
        endpoint: `${BASE_URL}/models`,
        groupId
      });

      const response = await fetch(`${BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      // Extract Quota Info
      const quota = extractQuotaInfo(response.headers);
      if (quota) {
        addLog('System', 'info', `Tier identified: ${quota.tier} based on x-ratelimit-limit-tokens`, { 
          limit: quota.limitTokens,
          tier: quota.tier,
          groupId 
        });
        
        const quotaSubId = startSubGroup(groupId, "Quota Snapshot");
        const rawHeaders: Record<string, string> = {};
        response.headers.forEach((v, k) => {
          if (k.startsWith('x-ratelimit')) rawHeaders[k] = v;
        });
        addLog('System', 'debug', "Cabeceras de límite recibidas", { raw: rawHeaders, quotaSubId });
        endGroup();

        if (onQuotaUpdate) onQuotaUpdate(quota);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`Failed to parse response: ${response.statusText}`);
      }
      
      const subGroupId = startSubGroup(groupId, "Procesamiento de respuesta raw");
      inSubGroup = true;
      addLog('System', 'debug', "Respuesta recibida de Groq", { data, subGroupId });
      
      if (!response.ok) {
        const errorMessage = typeof data.error === 'string' ? data.error : data.error?.message;
        throw new Error(errorMessage || 'Error fetching models');
      }

      const rawModels: GroqModel[] = data.data;

      addLog('System', 'success', `Catálogo procesado: ${rawModels.length} modelos disponibles`, { subGroupId });
      endGroup(); // end subgroup
      inSubGroup = false;
      
      addLog('System', 'success', "Handshake completado exitosamente", { groupId });
      endGroup(); // end group
      
      const enrichedModels = enrichModelData(rawModels, observability);
      return enrichedModels;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog('System', 'error', `Error en handshake: ${errorMessage}`, { error, groupId });
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
    observability: ForgeLoggerContextType,
    onMetrics?: (metrics: { tps: number; ttft: number; totalTokens: number }) => void,
    onQuotaUpdate?: (quota: QuotaInfo) => void,
    files?: any[]
  ) {
    const { startGroup, addLog, startSubGroup, endGroup } = observability;
    const groupId = startGroup(`Iniciando Inferencia de Modelo - ${modelId}`);
    
    // Inject file context if available
    const enrichedMessages = [...messages];
    if (files && files.length > 0) {
      const fileContext = files.map(f => `FILE: ${f.name}\nCONTENT:\n${f.content}`).join('\n\n---\n\n');
      enrichedMessages.unshift({
        role: 'system',
        content: `CONTEXTO DE ARCHIVOS ADJUNTOS:\n${fileContext}\n\nUsa esta información para responder si el usuario lo solicita.`
      });
      addLog('Vault', 'info', `Inyectando ${files.length} archivos en el contexto`, { files: files.map(f => f.name), groupId });
    }

    const payload: any = {
      model: modelId,
      messages: enrichedMessages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      frequency_penalty: config.frequencyPenalty,
      presence_penalty: config.presencePenalty,
    };

    if (config.jsonMode) {
      payload.response_format = { type: 'json_object' };
      
      const jsonSubId = startSubGroup(groupId, "Structured Output Validation");
      addLog('Inference', 'info', "Advanced Inference: JSON Mode active. Injecting response_format: json_object", { 
        payload_fragment: { response_format: payload.response_format },
        jsonSubId 
      });
      endGroup();
    }

    addLog('Inference', 'info', "Preparación del Request y Gestión de Estado de Chat", { modelId, messageLength: messages.length, config: payload, groupId });
    
    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    let totalTokens = 0;

    try {
      addLog('Inference', 'info', "Llamada a la API de Groq (fetch stream)", { endpoint: `${BASE_URL}/chat/completions`, headers: ['Authorization: Bearer [REDACTED]', 'Content-Type: application/json'], body: payload, groupId });
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Extract Quota Info from initial response
      const quota = extractQuotaInfo(response.headers);
      if (quota && onQuotaUpdate) {
        onQuotaUpdate(quota);
      }

      if (!response.ok) {
        if (response.status === 429) {
          const resetTime = response.headers.get('x-ratelimit-reset-tokens') || response.headers.get('retry-after') || '30s';
          throw new Error(`RATE_LIMIT_EXCEEDED:${resetTime}`);
        }
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
      let lastChunks: string[] = [];

      const subGroupId = startSubGroup(groupId, "Recibiendo Stream Chunks");
      let chunkIndex = 0;
      let lastChunkRaw: unknown = null;
      let lastMetricsUpdateTime = performance.now();
      
      // Buffer for Level 4 logs (AF-150)
      let tokenBuffer = "";
      let tokenBufferCount = 0;

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
              
              if (data.error && data.error.message && data.error.message.includes('logprobs')) {
                addLog('Inference', 'warn', "Nota técnica: Este modelo no expone sus capas de probabilidad internas (Logprobs deshabilitados por el proveedor).", { subGroupId });
                continue;
              }
              
              const chunkData = data as ChatCompletionChunk;
              
              const toolCalls = (data.choices[0]?.delta as any)?.tool_calls;
              if (toolCalls) {
                addLog('Inference', 'warn', "Tool Use Detected: Groq identified a tool-use intention.", { 
                  toolCalls, 
                  subGroupId 
                });
              }

              if (chunkIndex < 3) {
                addLog('Inference', 'debug', "Parseo de chunks SSE y cálculo de métricas en tiempo real", { chunkRaw: chunkData, parsedData: data, subGroupId });
              }
              lastChunkRaw = chunkData;
              chunkIndex++;

              const chunk = chunkData.choices[0]?.delta?.content || "";
              
              if (chunk) {
                // Anti-Loop Engine
                lastChunks.push(chunk);
                if (lastChunks.length > 5) lastChunks.shift();
                
                if (lastChunks.length === 5 && lastChunks.every(c => c === lastChunks[0])) {
                  addLog('Inference', 'error', "[INFERENCE] Safety Abort: Infinite loop detected. Potential Rate Limit interference.", { subGroupId });
                  reader.cancel();
                  throw new Error("Infinite loop detected");
                }

                if (firstTokenTime === null) {
                  firstTokenTime = performance.now();
                  const ttft = firstTokenTime - startTime;
                  addLog('Inference', 'success', "Primer token recibido (TTFT Sensor AF-152)", { ttft, subGroupId });
                }
                
                tokenCount++;
                tokenBuffer += chunk;
                tokenBufferCount++;

                // Log every 20 tokens (AF-150)
                if (tokenBufferCount >= 20) {
                  addLog('Inference', 'debug', "Ráfaga de tokens recibida (Agregación AF-150)", { accumulatedText: tokenBuffer, tokenCount: tokenBufferCount, subGroupId });
                  tokenBuffer = "";
                  tokenBufferCount = 0;
                }

                yield { content: chunk, logprobs: data.choices[0]?.logprobs };
              }
              
              if (data.usage) {
                const usage = data.usage;
                totalTokens = usage.total_tokens;
                
                const cost = calculateInferenceCost(modelId, usage.prompt_tokens, usage.completion_tokens);
                const totalSpend = updateAccumulatedSpend(cost);
                
                addLog('Inference', 'success', `Financial Engine: Calculating inference cost for ${modelId}`, {
                  usage,
                  cost,
                  totalSpend,
                  groupId
                });
                
                addLog('Inference', 'info', `Usage: [Input: ${usage.prompt_tokens}] + [Output: ${usage.completion_tokens}] = [Total_Cost: $${cost.toFixed(6)}]`, { groupId });
                
                const billingSubId = startSubGroup(groupId, "Billing Snapshot");
                addLog('Audit', 'success', "Billing Snapshot Recorded", {
                  modelId,
                  delta: cost,
                  accumulated: totalSpend,
                  billingSubId
                });
                endGroup();

                yield { content: '', usage, cost };
              }
              
              if (data.x_groq?.usage) {
                totalTokens = data.x_groq.usage.total_tokens;
              }

              const now = performance.now();
              // Update metrics every 400ms (AF-152)
              if (firstTokenTime !== null && now - lastMetricsUpdateTime > 400) {
                const elapsedSinceFirstToken = now - firstTokenTime;
                let currentTps = 0;
                if (elapsedSinceFirstToken > 0) {
                  // Formula: (Conteo de tokens recibidos hasta ahora) / (Tiempo transcurrido desde el primer token en segundos)
                  currentTps = tokenCount / (elapsedSinceFirstToken / 1000);
                }
                
                if (onMetrics) {
                  onMetrics({
                    tps: currentTps,
                    ttft: firstTokenTime - startTime,
                    totalTokens: totalTokens || tokenCount
                  });
                }
                addLog('Inference', 'debug', "Métricas de inferencia actualizadas (400ms Sync AF-152)", { tps: currentTps, ttft: firstTokenTime - startTime, totalTokens: totalTokens || tokenCount, subGroupId });
                lastMetricsUpdateTime = now;
              }
            } catch (e) {
              addLog('Inference', 'error', "Error parsing stream chunk", { error: e, line, subGroupId });
            }
          }
        }
      }

      // Final flush of token buffer
      if (tokenBufferCount > 0) {
        addLog('Inference', 'debug', "Ráfaga final de tokens (Agregación AF-150)", { accumulatedText: tokenBuffer, tokenCount: tokenBufferCount, subGroupId });
      }

      if (lastChunkRaw) {
        addLog('Inference', 'debug', "Último chunk recibido", { lastChunkRaw, subGroupId });
      }

      endGroup(); // end subgroup

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const finalTotalTokens = totalTokens || tokenCount;
      const tps = totalTime > 0 ? (finalTotalTokens / (totalTime / 1000)) : 0;
      const ttft = firstTokenTime ? firstTokenTime - startTime : 0;

      // AF-153: Stream Process Completed Summary
      addLog('Inference', 'success', "Stream Process Completed", {
        totalTokens: finalTotalTokens,
        totalTimeMs: totalTime.toFixed(2),
        tps: tps.toFixed(2),
        ttft: ttft.toFixed(2),
        groupId
      });

      if (onMetrics) {
        onMetrics({ tps, ttft, totalTokens: finalTotalTokens });
      }

      addLog('Inference', 'success', "Inferencia completada", { 
        tpsTotal: tps.toFixed(2), 
        ttftReal: ttft.toFixed(2),
        totalTokens: finalTotalTokens,
        groupId
      });
      endGroup(); // end group

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog('Inference', 'error', `Error en stream: ${errorMessage}`, { error, groupId });
      endGroup(); // end group
      throw error;
    }
  },

  generateDidacticContent: async (
    apiKey: string,
    term: string,
    config: InferenceConfig,
    observability: ForgeLoggerContextType,
    specificSection?: string
  ): Promise<any> => {
    const { startGroup, addLog, endGroup } = observability;
    const groupId = startGroup(`Generating Didactic Content: ${term}`);
    
    const systemPrompt = localStorage.getItem('athanor_didactic_prompt') || 
      "Define el término de IA en JSON estricto con estas 6 llaves: 'overview' (resumen sobrio), 'scientific' (base matemática), 'professional' (uso industrial), 'intuition' (analogía física), 'heuristic' (regla de oro), 'pitfall' (error común). NADA de texto fuera del JSON.";
    
    const userPrompt = specificSection 
      ? `Reescribe la explicación para la sección '${specificSection}' del término ${term} because the anterior fue confusa.`
      : `Define the term: ${term}`;

    const payload = {
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      frequency_penalty: config.frequencyPenalty,
      presence_penalty: config.presencePenalty,
      response_format: { type: 'json_object' }
    };

    addLog('Didactic', 'debug', "Payload auditable enviado a Groq (Didactic Engine)", { raw: payload, groupId });

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
        addLog('Didactic', 'warn', "JSON Parse Error in Didactic Engine", { 
          raw: data.choices[0].message.content,
          error: parseError,
          groupId
        });
        
        content = { isError: true };
      }
      
      // Asegurar las 6 llaves exactas
      const keys = ['overview', 'scientific', 'professional', 'intuition', 'heuristic', 'pitfall'];
      const finalizedContent = { ...content };
      keys.forEach(key => {
        if (!finalizedContent[key] || finalizedContent[key].trim() === "") {
          finalizedContent[key] = "Analizando dimensión...";
        }
      });
      
      addLog('Didactic', 'success', "Didactic content processing finished", { finalizedContent, groupId });
      endGroup();
      return finalizedContent;
    } catch (error) {
      addLog('Didactic', 'error', "Error generating didactic content", { error, groupId });
      endGroup();
      throw error;
    }
  }
};
