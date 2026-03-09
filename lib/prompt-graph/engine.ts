import type {
  LLMProviderKind,
  PromptAtom,
  PromptOrchestratorResult,
  PromptRunOptions,
  TagNode,
  OptimizationRun,
  OptimizationIteration,
  EvalRun,
  EvalRubric,
} from '../../types/prompt-graph';
import { Evaluator } from './evaluator';
import { LLMGateway } from './providers/gateway';

const gateway = new LLMGateway();
const evaluator = new Evaluator();

const layerForType = (type: TagNode['type']): PromptAtom['layer'] => {
  if (type === 'intent') return 'task';
  if (type === 'constraint' || type === 'risk') return 'constraints';
  if (type === 'style' || type === 'tone') return 'style';
  return 'context';
};

const normalizeExtractedTags = (raw: unknown): TagNode[] => {
  const arrayValue = Array.isArray(raw) ? raw : [];
  return arrayValue
    .map((item, index) => {
      const token = item as Partial<TagNode>;
      return {
        id: token.id || `small-${index + 1}`,
        level: token.level === 'macro' ? 'macro' : 'small',
        label: String(token.label ?? '').trim(),
        type: token.type && ['entity', 'intent', 'constraint', 'style', 'tone', 'risk'].includes(token.type)
          ? token.type
          : 'entity',
        weight: typeof token.weight === 'number' ? token.weight : 0.7,
        confidence: typeof token.confidence === 'number' ? token.confidence : 0.7,
        sourceSpan: token.sourceSpan,
        enabled: token.enabled ?? true,
        children: Array.isArray(token.children) ? token.children : [],
      } as TagNode;
    })
    .filter((tag) => tag.label.length > 0);
};

export const extractSmallTags = async (input: string, provider: LLMProviderKind = 'openai') => {
  const run = await gateway.generate('extract', { input }, provider);
  const raw = run.primary.json;

  const tags = normalizeExtractedTags(raw)
    .slice(0, 50)
    .map((tag, index) => ({ ...tag, x: 80 + (index % 8) * 120, y: 80 + Math.floor(index / 8) * 90 }));

  return { tags, run };
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

const scorePrompt = (candidate: string, target: string, history: EvalRun[], rubric?: EvalRubric) => {
  const evalRun = evaluator.score(candidate, target, rubric);
  history.push(evalRun);
  return evalRun.overallScore;
};

export const optimizePrompt = async (
  inputPrompt: string,
  target: string,
  options: PromptRunOptions = {},
): Promise<{ optimization: OptimizationRun; evalHistory: EvalRun[]; llmRuns: PromptOrchestratorResult['llmRuns'] }> => {
  const maxIterations = options.maxIterations ?? 3;
  const provider = options.provider ?? 'openai';
  const evalHistory: EvalRun[] = [];
  const llmRuns: PromptOrchestratorResult['llmRuns'] = [];

  const runId = `run-${Date.now()}`;
  const iterations: OptimizationIteration[] = [];
  let bestPrompt = inputPrompt.trim();
  let bestScore = scorePrompt(bestPrompt, target, evalHistory, options.rubric);

  for (let i = 0; i < maxIterations; i += 1) {
    const llmRun = await gateway.generate('optimize', {
      input: inputPrompt,
      prompt: bestPrompt,
      target,
      constraints: ['Preserve deterministic output format', 'Avoid hallucinated constraints'],
    }, provider);

    llmRuns.push(llmRun);
    const candidatePrompt = String((llmRun.primary.json as any)?.prompt ?? llmRun.primary.output ?? bestPrompt).trim();
    const candidateScore = scorePrompt(candidatePrompt, target, evalHistory, options.rubric);

    if (candidateScore > bestScore) {
      bestPrompt = candidatePrompt;
      bestScore = candidateScore;
      iterations.push({ index: i + 1, prompt: candidatePrompt, score: candidateScore, reason: 'LLM optimization improved evaluated score.' });
    } else {
      iterations.push({ index: i + 1, prompt: bestPrompt, score: bestScore, reason: 'No improvement from optimization candidate.' });
      break;
    }
  }

  return {
    optimization: {
      runId,
      input: inputPrompt,
      target,
      iterations,
      bestPrompt,
      score: bestScore,
    },
    evalHistory,
    llmRuns,
  };
};

export class PromptOrchestrator {
  async run(input: string, target: string, options: PromptRunOptions = {}): Promise<PromptOrchestratorResult> {
    const provider = options.provider ?? 'openai';
    const { tags, run } = await extractSmallTags(input, provider);
    const atoms = buildPromptAtoms(tags);
    const basePrompt = [
      'You are a prompt process engine.',
      ...atoms.map((atom) => `[${atom.layer}] ${atom.text}`),
      'Return output in deterministic JSON with rationale.',
    ].join('\n');

    const optimized = await optimizePrompt(basePrompt, target, options);

    return {
      smallTags: tags,
      atoms,
      optimization: optimized.optimization,
      evalHistory: optimized.evalHistory,
      llmRuns: [run, ...optimized.llmRuns],
    };
  }
}
