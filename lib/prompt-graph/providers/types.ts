import type { LLMTaskPayload, LLMTaskType, ProviderResult } from '../../../types/prompt-graph';

export interface LLMProvider {
  readonly kind: 'openai' | 'gemini' | 'heuristic';
  isConfigured(): boolean;
  generate(taskType: LLMTaskType, payload: LLMTaskPayload, traceId: string): Promise<ProviderResult>;
}
