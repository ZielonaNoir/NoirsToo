import type { LLMTaskPayload, LLMTaskType, ProviderResult } from '../../../types/prompt-graph';
import type { LLMProvider } from './types';

const OPENAI_BASE = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const buildPrompt = (taskType: LLMTaskType, payload: LLMTaskPayload): string => {
  const base = `Task: ${taskType}. Return JSON when possible.`;
  const body = JSON.stringify(payload, null, 2);
  return `${base}\n\nPayload:\n${body}`;
};

export class OpenAIAdapter implements LLMProvider {
  readonly kind = 'openai' as const;

  isConfigured() {
    return Boolean(OPENAI_KEY);
  }

  async generate(taskType: LLMTaskType, payload: LLMTaskPayload, traceId: string): Promise<ProviderResult> {
    if (!OPENAI_KEY) {
      throw new Error('OpenAI key missing');
    }

    const startedAt = performance.now();
    const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a strict prompt graph assistant. Always return concise output.' },
          { role: 'user', content: buildPrompt(taskType, payload) },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const json = await response.json() as any;
    const output = String(json?.choices?.[0]?.message?.content ?? '{}');

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
      tokensIn: json?.usage?.prompt_tokens,
      tokensOut: json?.usage?.completion_tokens,
      latencyMs: Math.round(performance.now() - startedAt),
      traceId,
    };
  }
}
