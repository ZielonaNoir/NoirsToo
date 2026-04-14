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
import type { EdgeTabImportSummary } from '../../types';
import { Evaluator } from './evaluator';
import { persistEvalRun } from './eval-store';
import { LLMGateway } from './providers/gateway';
import { logAuditEvent, maskSensitiveText } from './telemetry';

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

const ensurePromptFromProvider = (raw: unknown, fallback: string): string => {
  if (!raw || typeof raw !== 'object') return fallback;
  const prompt = String((raw as { prompt?: unknown }).prompt ?? '').trim();
  return prompt || fallback;
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

export const buildBasePrompt = (atoms: PromptAtom[], leadLine = 'You are a prompt process engine.') => {
  return [
    leadLine,
    ...atoms.map((atom) => `[${atom.layer}] ${atom.text}`),
    'Return output in deterministic JSON with rationale.',
  ].join('\n');
};

const average = (values: number[]) => values.length === 0
  ? 0
  : Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));

export const buildAutoMacroTags = (tags: TagNode[], summary?: EdgeTabImportSummary | null): TagNode[] => {
  const smallTags = tags.filter((tag) => tag.level === 'small');
  const groups: Array<{ label: string; type: TagNode['type']; children: string[] }> = [];

  const pushGroup = (label: string, type: TagNode['type'], children: string[]) => {
    const uniqueChildren = Array.from(new Set(children)).slice(0, 8);
    if (uniqueChildren.length < 2) return;
    groups.push({ label, type, children: uniqueChildren });
  };

  const entities = smallTags.filter((tag) => tag.type === 'entity').map((tag) => tag.id);
  const intents = smallTags.filter((tag) => tag.type === 'intent').map((tag) => tag.id);
  const constraints = smallTags.filter((tag) => tag.type === 'constraint' || tag.type === 'risk').map((tag) => tag.id);
  const style = smallTags.filter((tag) => tag.type === 'style' || tag.type === 'tone').map((tag) => tag.id);

  pushGroup('Source Context', 'entity', entities);
  pushGroup('Workflow Goal', 'intent', intents);
  pushGroup('Guardrails', 'constraint', constraints);
  pushGroup('Output Style', 'style', style);

  if (summary && smallTags.length >= 2) {
    const topCategories = summary.categories.slice(0, 2).map((item: { category: string }) => item.category).join(' + ');
    const topDomains = summary.domains.slice(0, 3).map((item: { domain: string }) => item.domain).join(', ');
    pushGroup(
      topCategories ? `Window Focus: ${topCategories}` : 'Window Focus',
      'intent',
      smallTags.slice(0, 4).map((tag) => tag.id),
    );
    pushGroup(
      topDomains ? `Domains: ${topDomains}` : 'Top Domains',
      'entity',
      entities.length >= 2 ? entities : smallTags.slice(0, 4).map((tag) => tag.id),
    );
  }

  return groups.map((group, index) => {
    const childTags = group.children
      .map((childId) => smallTags.find((tag) => tag.id === childId))
      .filter((tag): tag is TagNode => Boolean(tag));

    return {
      id: `macro-auto-${index + 1}`,
      level: 'macro',
      label: group.label,
      type: group.type,
      weight: average(childTags.map((tag) => tag.weight)),
      confidence: average(childTags.map((tag) => tag.confidence)),
      enabled: true,
      children: group.children,
      x: 160 + (index % 3) * 220,
      y: 70 + Math.floor(index / 3) * 80,
    } as TagNode;
  });
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
  let latestTraceId = '';

  for (let i = 0; i < maxIterations; i += 1) {
    const llmRun = await gateway.generate('optimize', {
      input: inputPrompt,
      prompt: bestPrompt,
      target,
      constraints: ['Preserve deterministic output format', 'Avoid hallucinated constraints'],
    }, provider);

    llmRuns.push(llmRun);
    latestTraceId = llmRun.traceId;
    const candidatePrompt = ensurePromptFromProvider(llmRun.primary.json, llmRun.primary.output || bestPrompt).trim();
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

  for (const run of evalHistory) {
    await persistEvalRun(run, {
      runId,
      dataset: 'default',
      provider: options.provider ?? 'openai',
      prompt: maskSensitiveText(bestPrompt),
      traceId: latestTraceId || `trace-${run.evalId}`,
      tabId: options.tabId,
      sessionId: options.sessionId,
    }).catch(() => undefined);
  }

  await logAuditEvent({
    eventType: 'eval_result',
    tabId: options.tabId,
    sessionId: options.sessionId,
    traceId: latestTraceId,
    provider: options.provider ?? 'openai',
    payload: {
      runId,
      evalRuns: evalHistory.length,
      score: bestScore,
    },
    createdAt: Date.now(),
  });

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
    const basePrompt = buildBasePrompt(atoms);

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
