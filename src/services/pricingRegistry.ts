/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PricingInfo {
  inputPer1M: number;
  outputPer1M: number;
}

export const PRICING_REGISTRY: Record<string, PricingInfo> = {
  'llama-3.3-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },
  'llama-3.3-70b-specdec': { inputPer1M: 0.59, outputPer1M: 0.79 },
  'deepseek-r1-distill-llama-70b': { inputPer1M: 0.59, outputPer1M: 0.79 },
  'llama-3.1-8b-instant': { inputPer1M: 0.05, outputPer1M: 0.08 },
  'mixtral-8x7b-32768': { inputPer1M: 0.24, outputPer1M: 0.24 },
  'whisper-large-v3': { inputPer1M: 0.01, outputPer1M: 0.01 }, // Estimated per request/10min
  'whisper-large-v3-turbo': { inputPer1M: 0.01, outputPer1M: 0.01 },
};

export const DEFAULT_PRICING: PricingInfo = { inputPer1M: 0.50, outputPer1M: 0.50 };

export function calculateInferenceCost(modelId: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING_REGISTRY[modelId] || DEFAULT_PRICING;
  const inputCost = (promptTokens * pricing.inputPer1M) / 1_000_000;
  const outputCost = (completionTokens * pricing.outputPer1M) / 1_000_000;
  return inputCost + outputCost;
}

export function getAccumulatedSpend(): number {
  const saved = localStorage.getItem('athanor_total_spend');
  return saved ? parseFloat(saved) : 0;
}

export function updateAccumulatedSpend(delta: number): number {
  const current = getAccumulatedSpend();
  const updated = current + delta;
  localStorage.setItem('athanor_total_spend', updated.toString());
  return updated;
}
