import type { LLMTaskPayload, LLMTaskType, ProviderResult } from '../../../types/prompt-graph';
import type { LLMProvider } from './types';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-exp';

const buildPrompt = (taskType: LLMTaskType, payload: LLMTaskPayload): string => {
  return `Task=${taskType}\nReturn JSON if possible.\nPayload:\n${JSON.stringify(payload, null, 2)}`;
};

export class GeminiAdapter implements LLMProvider {
  readonly kind = 'gemini' as const;

  isConfigured() {
    return Boolean(GEMINI_KEY);
  }

  async generate(taskType: LLMTaskType, payload: LLMTaskPayload, traceId: string): Promise<ProviderResult> {
    if (!GEMINI_KEY) {
      throw new Error('Gemini key missing');
    }

    const startedAt = performance.now();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildPrompt(taskType, payload) }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const json = await response.json() as any;
    const output = String(json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');

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
      tokensIn: json?.usageMetadata?.promptTokenCount,
      tokensOut: json?.usageMetadata?.candidatesTokenCount,
      costUsd: Number(((((json?.usageMetadata?.promptTokenCount ?? 0) + (json?.usageMetadata?.candidatesTokenCount ?? 0)) * 0.000001).toFixed(6))),
      latencyMs: Math.round(performance.now() - startedAt),
      traceId,
    };
  }
}
