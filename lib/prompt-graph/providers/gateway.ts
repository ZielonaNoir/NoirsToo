import type { LLMProviderKind, LLMRun, LLMTaskPayload, LLMTaskType, ProviderResult } from '../../../types/prompt-graph';
import { GeminiAdapter } from './gemini';
import { HeuristicAdapter } from './heuristic';
import { OpenAIAdapter } from './openai';
import type { LLMProvider } from './types';

const providers: Record<LLMProviderKind, LLMProvider> = {
  openai: new OpenAIAdapter(),
  gemini: new GeminiAdapter(),
  heuristic: new HeuristicAdapter(),
};

const fallbackOrder: Record<LLMProviderKind, LLMProviderKind[]> = {
  openai: ['gemini', 'heuristic'],
  gemini: ['openai', 'heuristic'],
  heuristic: [],
};

export class LLMGateway {
  async generate(taskType: LLMTaskType, payload: LLMTaskPayload, provider: LLMProviderKind = 'openai'): Promise<LLMRun> {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();

    const primary = providers[provider];

    const tryProvider = async (candidate: LLMProviderKind): Promise<ProviderResult | undefined> => {
      const client = providers[candidate];
      if (!client?.isConfigured()) return undefined;
      try {
        const result = await client.generate(taskType, payload, traceId);
        return result;
      } catch {
        return undefined;
      }
    };

    const primaryResult = await tryProvider(provider) ?? await providers.heuristic.generate(taskType, payload, traceId);

    let fallback: ProviderResult | undefined;
    if (primaryResult.provider !== provider) {
      fallback = primaryResult;
      const normalizedPrimary = { ...primaryResult, fallbackUsed: true };
      return {
        traceId,
        taskType,
        startedAt,
        completedAt: Date.now(),
        primary: normalizedPrimary,
        fallback,
      };
    }

    for (const candidate of fallbackOrder[provider]) {
      if (candidate === primaryResult.provider) continue;
      const candidateResult = await tryProvider(candidate);
      if (candidateResult) {
        fallback = { ...candidateResult, fallbackUsed: true };
        break;
      }
    }

    return {
      traceId,
      taskType,
      startedAt,
      completedAt: Date.now(),
      primary: primaryResult,
      fallback,
    };
  }
}
