import type { OptimizationIteration, OptimizationRun, PromptAtom, TagNode } from '../../types/prompt-graph';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'have', 'will', 'about', 'your', 'you',
  'are', 'was', 'were', 'been', 'their', 'there', 'what', 'when', 'where', 'which', 'while', 'would',
  'should', 'could', 'can', 'to', 'of', 'in', 'on', 'a', 'an', 'is', 'it', 'as', 'by', 'or', 'be',
]);

const classifyType = (word: string): TagNode['type'] => {
  if (/risk|error|fail|unsafe|compliance/i.test(word)) return 'risk';
  if (/style|tone|voice|format/i.test(word)) return 'style';
  if (/must|should|limit|constraint|rule/i.test(word)) return 'constraint';
  if (/build|create|generate|extract|summarize|optimize/i.test(word)) return 'intent';
  if (/formal|casual|technical|friendly/i.test(word)) return 'tone';
  return 'entity';
};

const layerForType = (type: TagNode['type']): PromptAtom['layer'] => {
  if (type === 'intent') return 'task';
  if (type === 'constraint' || type === 'risk') return 'constraints';
  if (type === 'style' || type === 'tone') return 'style';
  return 'context';
};

export const extractSmallTags = (input: string): TagNode[] => {
  const words = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  const freq = new Map<string, number>();
  words.forEach((word) => {
    freq.set(word, (freq.get(word) || 0) + 1);
  });

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([word, count], index) => ({
      id: `small-${index + 1}`,
      level: 'small' as const,
      label: word,
      type: classifyType(word),
      weight: Math.min(1, count / 4),
      confidence: Math.min(1, 0.55 + count * 0.08),
      enabled: true,
      sourceSpan: word,
      children: [],
    }));
};

export const buildPromptAtoms = (tags: TagNode[]): PromptAtom[] => {
  return tags
    .filter((tag) => tag.enabled)
    .map((tag, index) => ({
      id: `atom-${index + 1}`,
      layer: layerForType(tag.type),
      text: tag.level === 'macro' ? `${tag.label}: ${tag.children.join(', ')}` : tag.label,
      tagRefs: [tag.id, ...tag.children],
      enabled: true,
    }));
};

const tokenize = (text: string): Set<string> => {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
  );
};

const scorePrompt = (prompt: string, target: string): number => {
  const a = tokenize(prompt);
  const b = tokenize(target);
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  a.forEach((word) => {
    if (b.has(word)) intersection += 1;
  });

  return intersection / new Set([...a, ...b]).size;
};

export const optimizePrompt = (inputPrompt: string, target: string, maxIterations = 3): OptimizationRun => {
  const runId = `run-${Date.now()}`;
  const targetTerms = tokenize(target);
  const iterations: OptimizationIteration[] = [];
  let bestPrompt = inputPrompt.trim();
  let bestScore = scorePrompt(bestPrompt, target);

  for (let i = 0; i < maxIterations; i += 1) {
    const currentTerms = tokenize(bestPrompt);
    const missing = Array.from(targetTerms).filter((term) => !currentTerms.has(term)).slice(0, 4);
    const candidate = missing.length > 0
      ? `${bestPrompt}\n\nFocus additions: ${missing.join(', ')}.`
      : `${bestPrompt}\n\nKeep output aligned with target quality constraints.`;
    const candidateScore = scorePrompt(candidate, target);

    if (candidateScore > bestScore) {
      bestPrompt = candidate;
      bestScore = candidateScore;
      iterations.push({ index: i + 1, prompt: candidate, score: candidateScore, reason: 'Added missing target concepts.' });
    } else {
      iterations.push({ index: i + 1, prompt: bestPrompt, score: bestScore, reason: 'No measurable improvement; kept previous best.' });
      break;
    }
  }

  return {
    runId,
    input: inputPrompt,
    target,
    iterations,
    bestPrompt,
    score: bestScore,
  };
};
