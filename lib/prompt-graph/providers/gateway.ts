import type { LLMProviderKind, LLMRun, LLMTaskPayload, LLMTaskType, ProviderResult } from '../../../types/prompt-graph';
import { GeminiAdapter } from './gemini';
import { HeuristicAdapter } from './heuristic';
import { OpenAIAdapter } from './openai';
import { QwenAdapter } from './qwen';
import type { LLMProvider } from './types';

const providers: Record<LLMProviderKind, LLMProvider> = {
  openai: new OpenAIAdapter(),
  gemini: new GeminiAdapter(),
  qwen: new QwenAdapter(),
  heuristic: new HeuristicAdapter(),
};

const fallbackOrder: Record<LLMProviderKind, LLMProviderKind[]> = {
  openai: ['qwen', 'gemini', 'heuristic'],
  gemini: ['qwen', 'openai', 'heuristic'],
  qwen: ['openai', 'gemini', 'heuristic'],
  heuristic: [],
};

const MAX_RETRIES = Number(import.meta.env.VITE_LLM_MAX_RETRIES || 2);
const PROVIDER_TIMEOUT_MS = Number(import.meta.env.VITE_LLM_TIMEOUT_MS || 18000);
const MAX_REQUESTS_PER_MINUTE = Number(import.meta.env.VITE_LLM_MAX_REQUESTS_PER_MINUTE || 20);
const MAX_COST_PER_MINUTE_USD = Number(import.meta.env.VITE_LLM_MAX_COST_PER_MINUTE_USD || 1.2);

const budgetByMinute = new Map<string, { requests: number; costUsd: number }>();

const nowMinuteKey = () => new Date().toISOString().slice(0, 16);

const estimateCostUsd = (result: ProviderResult) => {
  if (typeof result.costUsd === 'number') return result.costUsd;
  const tokenCost = ((result.tokensIn ?? 0) + (result.tokensOut ?? 0)) * 0.0000012;
  return Number(tokenCost.toFixed(6));
};

const canSpendBudget = () => {
  const key = nowMinuteKey();
  const state = budgetByMinute.get(key) ?? { requests: 0, costUsd: 0 };
  return state.requests < MAX_REQUESTS_PER_MINUTE && state.costUsd < MAX_COST_PER_MINUTE_USD;
};

const spendBudget = (result: ProviderResult) => {
  const key = nowMinuteKey();
  const state = budgetByMinute.get(key) ?? { requests: 0, costUsd: 0 };
  state.requests += 1;
  state.costUsd = Number((state.costUsd + estimateCostUsd(result)).toFixed(6));
  budgetByMinute.set(key, state);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(promise: Promise<T>, ms: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`provider timeout (${ms}ms)`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const recoverable = (error: unknown) => {
  const message = String((error as Error)?.message ?? '').toLowerCase();
  return message.includes('timeout') || message.includes('429') || message.includes('5');
};

const normalizeFailure = (
  provider: LLMProviderKind,
  taskType: LLMTaskType,
  traceId: string,
  error: unknown,
  attempt: number,
): ProviderResult => ({
  provider,
  taskType,
  output: '',
  json: null,
  error: String((error as Error)?.message ?? 'Unknown provider error'),
  recoverable: recoverable(error),
  latencyMs: 0,
  traceId,
  attempt,
});

export class LLMGateway {
  async generate(taskType: LLMTaskType, payload: LLMTaskPayload, provider: LLMProviderKind = 'openai'): Promise<LLMRun> {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();

    const tryProvider = async (candidate: LLMProviderKind): Promise<ProviderResult | undefined> => {
      const client = providers[candidate];
      if (!client?.isConfigured()) return undefined;

      if (!canSpendBudget()) {
        return {
          provider: candidate,
          taskType,
          output: '',
          json: null,
          error: 'Budget exceeded for current minute window',
          recoverable: true,
          latencyMs: 0,
          traceId,
        };
      }

      let lastFailure: ProviderResult | undefined;

      for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
        try {
          const result = await withTimeout(client.generate(taskType, payload, traceId), PROVIDER_TIMEOUT_MS);
          const enriched = { ...result, attempt };
          spendBudget(enriched);
          return enriched;
        } catch (error) {
          lastFailure = normalizeFailure(candidate, taskType, traceId, error, attempt);
          if (!lastFailure.recoverable || attempt > MAX_RETRIES) break;
          await sleep(150 * attempt);
        }
      }

      return lastFailure;
    };

    const primaryResult = await tryProvider(provider) ?? await providers.heuristic.generate(taskType, payload, traceId);

    let fallback: ProviderResult | undefined;
    if (primaryResult.provider !== provider || primaryResult.error) {
      fallback = primaryResult;
      const normalizedPrimary = {
        ...await providers.heuristic.generate(taskType, payload, traceId),
        fallbackUsed: true,
      };
      return {
        traceId,
        taskType,
        startedAt,
        completedAt: Date.now(),
        primary: normalizedPrimary,
        fallback,
        attempts: primaryResult.attempt ?? 1,
      };
    }

    for (const candidate of fallbackOrder[provider]) {
      if (candidate === primaryResult.provider) continue;
      const candidateResult = await tryProvider(candidate);
      if (candidateResult && !candidateResult.error) {
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
      attempts: primaryResult.attempt ?? 1,
    };
  }
}
