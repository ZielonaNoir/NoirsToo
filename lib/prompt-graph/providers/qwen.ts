import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { LLMTaskPayload, LLMTaskType, ProviderResult } from '../../../types/prompt-graph';
import type { LLMProvider } from './types';

const QWEN_KEY = import.meta.env.VITE_QWEN_API_KEY;
const QWEN_MODEL = import.meta.env.VITE_QWEN_MODEL || 'qwen-max';

const qwen = createOpenAI({
  apiKey: QWEN_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const buildPrompt = (taskType: LLMTaskType, payload: LLMTaskPayload): string => {
  return `Task=${taskType}\nReturn JSON if possible.\nPayload:\n${JSON.stringify(payload, null, 2)}`;
};

export class QwenAdapter implements LLMProvider {
  readonly kind = 'qwen' as const;

  isConfigured() {
    return Boolean(QWEN_KEY);
  }

  async generate(taskType: LLMTaskType, payload: LLMTaskPayload, traceId: string): Promise<ProviderResult> {
    if (!QWEN_KEY) {
      throw new Error('Qwen API key missing');
    }

    const startedAt = Date.now();
    
    const { text, usage } = await generateText({
      model: qwen(QWEN_MODEL),
      prompt: buildPrompt(taskType, payload),
      temperature: 0.2,
    });

    const output = text;

    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch {
      parsed = { raw: output };
    }

    return {
      provider: this.kind,
      taskType,
      output,
      json: parsed,
      tokensIn: (usage as any).promptTokens,
      tokensOut: (usage as any).completionTokens,
      costUsd: 0, // Costs vary significantly by model, setting 0 for now
      latencyMs: Date.now() - startedAt,
      traceId,
    };
  }
}
