import type { LLMTaskPayload, LLMTaskType, ProviderResult, TagNode } from '../../../types/prompt-graph';
import type { LLMProvider } from './types';

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'have', 'will', 'about', 'your', 'you', 'are', 'was', 'were', 'been', 'their', 'there', 'what', 'when', 'where', 'which', 'while', 'would', 'should', 'could', 'can', 'to', 'of', 'in', 'on', 'a', 'an', 'is', 'it', 'as', 'by', 'or', 'be']);

const classifyType = (word: string): TagNode['type'] => {
  if (/risk|error|fail|unsafe|compliance|pii|secret/i.test(word)) return 'risk';
  if (/style|tone|voice|format/i.test(word)) return 'style';
  if (/must|should|limit|constraint|rule/i.test(word)) return 'constraint';
  if (/build|create|generate|extract|summarize|optimize|rewrite/i.test(word)) return 'intent';
  if (/formal|casual|technical|friendly/i.test(word)) return 'tone';
  return 'entity';
};

const extractTags = (input: string): TagNode[] => {
  const words = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  const freq = new Map<string, number>();
  words.forEach((word) => freq.set(word, (freq.get(word) || 0) + 1));

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([word, count], index) => ({
      id: `small-${index + 1}`,
      level: 'small',
      label: word,
      type: classifyType(word),
      weight: Math.min(1, count / 4),
      confidence: Math.min(1, 0.55 + count * 0.08),
      enabled: true,
      sourceSpan: word,
      children: [],
    }));
};

const createPromptFromPayload = (payload: LLMTaskPayload): string => {
  if (payload.prompt) return payload.prompt;
  const seed = payload.input.trim();
  if (!seed) return 'Provide a concise response.';
  return `You are a prompt process engine.\nInput: ${seed}`;
};

const optimizeHeuristic = (payload: LLMTaskPayload): string => {
  const base = createPromptFromPayload(payload);
  const target = payload.target?.trim();
  if (!target) return `${base}\n\nEnsure deterministic structure and concise output.`;

  const targetTerms = target
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .slice(0, 8);

  return `${base}\n\nTarget cues: ${targetTerms.join(', ')}.\nAvoid generic filler and keep format strict.`;
};

export class HeuristicAdapter implements LLMProvider {
  readonly kind = 'heuristic' as const;

  isConfigured() {
    return true;
  }

  async generate(taskType: LLMTaskType, payload: LLMTaskPayload, traceId: string): Promise<ProviderResult> {
    const startedAt = performance.now();

    let output = '';
    let json: unknown;

    if (taskType === 'extract') {
      const tags = extractTags(payload.input);
      output = JSON.stringify(tags);
      json = tags;
    } else if (taskType === 'merge') {
      const merged = (payload.tags ?? []).slice(0, 20);
      output = JSON.stringify(merged);
      json = merged;
    } else if (taskType === 'atomize') {
      const atoms = (payload.tags ?? []).filter((tag) => tag.enabled).map((tag) => `[${tag.type}] ${tag.label}`);
      output = atoms.join('\n');
      json = atoms;
    } else {
      output = optimizeHeuristic(payload);
      json = { prompt: output };
    }

    return {
      provider: this.kind,
      taskType,
      output,
      json,
      latencyMs: Math.round(performance.now() - startedAt),
      traceId,
    };
  }
}
