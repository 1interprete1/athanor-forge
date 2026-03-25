/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface ForgeLog {
  id: string;
  timestamp: string; // Formato CST
  category: 'Inference' | 'Didactic' | 'Security' | 'System' | 'UI' | 'Feedback' | 'Audit' | 'Quota Monitor' | 'Infrastructure HUD' | 'Financial' | 'Vault' | 'Content Engine' | 'Structured Data' | 'Context Optimization';
  severity: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
  metadata: any; // El "Raw Data" para diagnóstico profundo
}

export interface SecretState {
  groqApiKey: string | null;
}

export interface GroqModel {
  id: string;
  created: number;
  object: string;
  owned_by: string;
}

export type UI_Preset = 'casual' | 'professional' | 'technical';
export type SelectionFocus = 'general' | 'coding' | 'creative' | 'performance' | 'rag' | 'math';

export interface ModelMetadata {
  provider: string;
  releaseDate: string;
  contextWindow: number;
  architecture: string;
  strengths: string[];
  isNew?: boolean;
  isBeta?: boolean;
  isUnmapped?: boolean;
  status?: 'PREVIEW' | 'BETA' | 'PRODUCTION';
  powerScore?: number;
  tps?: number;
  latency?: number;
  pros?: string[];
  cons?: string[];
  parameters?: string;
  lore?: string;
  capabilities?: {
    jsonMode: boolean;
    toolUse: boolean;
    vision: boolean;
  };
  benchmarks?: {
    name: string;
    score: number;
  }[];
}

export interface ModelDefinition extends GroqModel, ModelMetadata {}

export interface LayoutConfig {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
}

export interface InferenceConfig {
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  jsonMode: boolean;
}

export type ArtifactType = 'code' | 'markdown' | 'mermaid' | 'html';

export type InfrastructureTier = 'FREE' | 'DEVELOPER' | 'ON-DEMAND' | 'UNKNOWN';

export interface QuotaInfo {
  limitTokens: number;
  remainingTokens: number;
  limitRequests: number;
  remainingRequests: number;
  resetTokens: string;
  resetRequests: string;
  tier: InfrastructureTier;
}

export interface ArtifactInstance {
  id: string;
  parentId?: string; // Links to the first version of this artifact
  version: number;
  sessionId: string;
  messageId: string;
  type: ArtifactType;
  language?: string;
  title: string;
  content: string;
  timestamp: number;
  isStreaming: boolean;
}

export interface Message {
  id: string;
  parentId: string | null;
  branchIndex: number;
  totalBranches: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string; // Formato HH:MM:SS
  cost?: number;
  tps?: number;
  ttft?: number;
  jsonMode?: boolean;
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
  activeBranchIndices?: Record<string, number>;
  modelId?: string;
  totalTokens?: number;
}

export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    logprobs?: {
      content?: {
        token: string;
        logprob: number;
        top_logprobs: {
          token: string;
          logprob: number;
        }[];
      }[];
    };
    finish_reason: string | null;
  }[];
  x_groq?: {
    id: string;
    usage?: {
      queue_time: number;
      prompt_tokens: number;
      prompt_time: number;
      completion_tokens: number;
      completion_time: number;
      total_tokens: number;
      total_time: number;
    };
  };
}

export interface PerformanceEntry {
  timestamp: number;
  tps: number;
  contextUsage: number;
  ttft: number;
}

export interface AttachedFile {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'code' | 'json' | 'csv';
  size: number;
  content: string | null;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  estimatedTokens?: number;
  pageCount?: number;
}
