/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelMetadata, ModelDefinition, GroqModel } from '../types';
import { ObservabilityContextType } from './observabilityService';

export const MODEL_METADATA_REGISTRY: Record<string, ModelMetadata> = {
  'openai/gpt-oss-120b': {
    provider: 'OpenAI',
    releaseDate: '2025-01-01',
    contextWindow: 128000,
    architecture: 'Dense',
    strengths: ['Reasoning', 'Coding', 'Versatile'],
    powerScore: 95,
    pros: ['Potencia máxima', 'Razonamiento avanzado'],
    cons: ['Consumo de tokens elevado'],
    parameters: '120B',
    lore: "El motor raíz de Athanor Forge. Un titán de 120B parámetros diseñado para el razonamiento profundo y la versatilidad técnica. La cúspide de la inferencia abierta.",
    tps: 150,
    latency: 200,
    benchmarks: [
      { name: 'MMLU', score: 90.0 },
      { name: 'HumanEval', score: 88.0 }
    ]
  },
  'llama-3.3-70b-versatile': {
    provider: 'Meta',
    releaseDate: '2024-12-06',
    contextWindow: 128000,
    architecture: 'Dense',
    strengths: ['Reasoning', 'Coding', 'Versatile'],
    powerScore: 90,
    pros: ['Equilibrio perfecto potencia/velocidad', 'Excelente en codificación'],
    cons: ['Consumo de tokens elevado'],
    parameters: '70B',
    lore: "Meta's flagship revolution. A dense architecture powerhouse with 15T token pre-training. Optimized for high-reasoning and complex instruction following, representing the peak of open-weight versatility.",
    tps: 250,
    latency: 120,
    benchmarks: [
      { name: 'MMLU', score: 88.5 },
      { name: 'HumanEval', score: 85.2 },
      { name: 'IFEval', score: 82.1 },
      { name: 'GSM8K', score: 89.0 },
      { name: 'MATH', score: 54.1 }
    ]
  },
  'llama-3.1-8b-instant': {
    provider: 'Meta',
    releaseDate: '2024-07-23',
    contextWindow: 128000,
    architecture: 'Dense',
    strengths: ['Fast', 'Efficient'],
    powerScore: 60,
    pros: ['Latencia ultra-baja', 'Ideal para tareas simples'],
    cons: ['Razonamiento limitado en tareas complejas'],
    parameters: '8B',
    lore: "Meta's lightweight powerhouse. Optimized for high-throughput and low-latency inference. The gold standard for sub-10B parameter efficiency, delivering rapid-fire responses for Athanor Forge users.",
    tps: 850,
    latency: 45,
    benchmarks: [
      { name: 'MMLU', score: 68.4 },
      { name: 'GSM8K', score: 52.1 },
      { name: 'HumanEval', score: 45.0 }
    ]
  },
  'llama3-70b-8192': {
    provider: 'Meta',
    releaseDate: '2024-04-18',
    contextWindow: 8192,
    architecture: 'Dense',
    strengths: ['Reasoning', 'Creative'],
    powerScore: 85,
    pros: ['Gran capacidad creativa', 'Sólido en lógica'],
    cons: ['Ventana de contexto pequeña (8k)'],
    parameters: '70B',
    lore: "The original Llama 3 titan. While context-limited compared to 3.1, it remains a benchmark for dense 70B reasoning capabilities, serving as a reliable engine within Athanor Forge.",
    tps: 220,
    latency: 150,
    benchmarks: [
      { name: 'MMLU', score: 82.0 },
      { name: 'HumanEval', score: 81.7 },
      { name: 'IFEval', score: 78.5 },
      { name: 'GSM8K', score: 75.0 }
    ]
  },
  'llama3-8b-8192': {
    provider: 'Meta',
    releaseDate: '2024-04-18',
    contextWindow: 8192,
    architecture: 'Dense',
    strengths: ['Fast'],
    powerScore: 55,
    pros: ['Velocidad extrema', 'Bajo costo'],
    cons: ['Propenso a alucinaciones en lógica compleja'],
    parameters: '8B',
    lore: "The model that brought high-quality inference to the edge. Fast, reliable, and highly steerable for basic classification and chat, optimized for Athanor Forge's rapid-response needs.",
    tps: 780,
    latency: 55,
    benchmarks: [
      { name: 'MMLU', score: 66.6 },
      { name: 'GSM8K', score: 48.0 }
    ]
  },
  'mixtral-8x7b-32768': {
    provider: 'Mistral',
    releaseDate: '2023-12-11',
    contextWindow: 32768,
    architecture: 'MoE',
    strengths: ['Reasoning', 'Coding', 'Multilingual'],
    powerScore: 80,
    pros: ['Arquitectura MoE eficiente', 'Buen soporte multi-idioma'],
    cons: ['Menos preciso que Llama 3.3 en código'],
    parameters: '46.7B (MoE)',
    lore: "The MoE (Mixture of Experts) efficiency king. Orchestrates 8 expert networks for near-GPT4 performance with sparse compute. A milestone in open-source MoE, integrated seamlessly into Athanor Forge.",
    tps: 320,
    latency: 180,
    benchmarks: [
      { name: 'MMLU', score: 70.6 },
      { name: 'MBPP', score: 60.7 },
      { name: 'HumanEval', score: 58.0 },
      { name: 'IFEval', score: 65.0 }
    ]
  },
  'gemma2-9b-it': {
    provider: 'Google',
    releaseDate: '2024-06-27',
    contextWindow: 8192,
    architecture: 'Dense',
    strengths: ['Efficient', 'Reasoning'],
    powerScore: 65,
    pros: ['Muy eficiente para su tamaño', 'Buen razonamiento lógico'],
    cons: ['Ventana de contexto limitada'],
    parameters: '9B',
    lore: "Google’s lightweight powerhouse, derived from the same technology behind Gemini. Exceptional at reasoning tasks for its parameter class, providing a balanced compute profile for Athanor Forge.",
    tps: 450,
    latency: 95,
    benchmarks: [
      { name: 'MMLU', score: 71.3 },
      { name: 'GSM8K', score: 68.0 }
    ]
  },
  'deepseek-r1-distill-llama-70b': {
    provider: 'DeepSeek',
    releaseDate: '2025-01-20',
    contextWindow: 128000,
    architecture: 'Dense',
    strengths: ['Reasoning', 'Math', 'Coding'],
    powerScore: 95,
    isBeta: true,
    pros: ['Razonamiento de nivel superior (Chain of Thought)', 'Excelente en matemáticas'],
    cons: ['Mayor latencia por proceso de pensamiento'],
    parameters: '70B',
    lore: "The reasoning breakthrough of 2025. Distilled from DeepSeek-R1, it brings advanced Chain-of-Thought capabilities to the Llama architecture, enabling deep-dive analysis within Athanor Forge.",
    tps: 180,
    latency: 350,
    benchmarks: [
      { name: 'MMLU', score: 89.1 },
      { name: 'MATH', score: 92.4 },
      { name: 'GSM8K', score: 94.2 },
      { name: 'HumanEval', score: 88.0 }
    ]
  },
  'canopylabs/orpheus-v1-english': {
    provider: 'CanopyLabs',
    releaseDate: '2025-01-01',
    contextWindow: 32768,
    architecture: 'Dense',
    strengths: ['Reasoning', 'English', 'Instruction'],
    powerScore: 88,
    pros: ['Optimizado para instrucciones en inglés', 'Alta fidelidad'],
    cons: ['Específico para idioma inglés'],
    parameters: 'Unknown',
    lore: "A specialized instruction-following model. Fine-tuned for extreme precision in English-language complex task execution.",
    benchmarks: [
      { name: 'IFEval', score: 85.0 }
    ]
  }
};

export function enrichModelData(apiModels: GroqModel[], observability: ObservabilityContextType): ModelDefinition[] {
  const { startGroup, addLog, startSubGroup, endGroup } = observability;
  
  const groupId = startGroup("Enriquecimiento de Catálogo de Modelos");
  
  let knownCount = 0;
  let newCount = 0;
  
  const enrichedModels: ModelDefinition[] = apiModels.map(model => {
    const metadata = MODEL_METADATA_REGISTRY[model.id];
    if (metadata) {
      knownCount++;
      return { ...model, ...metadata, isNew: false, isUnmapped: false };
    } else {
      newCount++;
      // Autogenerate generic metadata
      const genericMetadata: ModelMetadata = {
        provider: model.owned_by || 'Unknown',
        releaseDate: new Date(model.created * 1000).toISOString().split('T')[0],
        contextWindow: 8192, // Default fallback
        architecture: 'Unknown',
        strengths: ['General'],
        isNew: true,
        isUnmapped: true,
        powerScore: 50
      };
      return { ...model, ...genericMetadata };
    }
  });

  // Inject openai/gpt-oss-120b if not present
  if (!enrichedModels.some(m => m.id === 'openai/gpt-oss-120b')) {
    const metadata = MODEL_METADATA_REGISTRY['openai/gpt-oss-120b'];
    enrichedModels.push({
      id: 'openai/gpt-oss-120b',
      object: 'model',
      created: Math.floor(new Date('2025-01-01').getTime() / 1000),
      owned_by: 'OpenAI',
      ...metadata,
      isNew: false,
      isUnmapped: false
    });
  }

  // Sort: Newest first, then by powerScore
  enrichedModels.sort((a, b) => {
    const dateA = new Date(a.releaseDate).getTime();
    const dateB = new Date(b.releaseDate).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return (b.powerScore || 0) - (a.powerScore || 0);
  });

  addLog(`Coincidencias en registro: ${knownCount}. Modelos Nuevos/Emergentes: ${newCount}`, {
    known: knownCount,
    emerging: newCount
  }, 'info', groupId);

  const subGroupId = startSubGroup(groupId, "Merge Result");
  addLog("Objeto resultante de la mezcla", enrichedModels, 'debug', subGroupId);
  endGroup(); // end subgroup

  addLog("Inyección de Metadatos Completada", null, 'success', groupId);
  endGroup(); // end group

  return enrichedModels;
}
