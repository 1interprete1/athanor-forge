/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface LogEvent {
  id: string;
  timestamp: number;
  message: string;
  level: LogLevel;
  parentId?: string;
  depth: number;
  raw?: unknown;
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
  powerScore?: number;
  tps?: number;
  latency?: number;
  pros?: string[];
  cons?: string[];
  parameters?: string;
  lore?: string;
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
}

export type ArtifactType = 'code' | 'markdown' | 'mermaid' | 'html';

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
