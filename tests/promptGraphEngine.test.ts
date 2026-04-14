import { describe, expect, it } from 'vitest';
import { PromptOrchestrator, buildAutoMacroTags, buildBasePrompt, extractSmallTags, optimizePrompt } from '../lib/prompt-graph/engine';
import { createDemoEdgeTabSummary } from '../lib/edge-tab-intel';

describe('Prompt Graph Engine', () => {
  it('extractSmallTags returns positioned tags with heuristic provider', async () => {
    const result = await extractSmallTags('cinematic motion shot reverse angle color grade', 'heuristic');

    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.tags[0].x).toBeTypeOf('number');
    expect(result.run.primary.provider).toBe('heuristic');
  });

  it('optimizePrompt returns evaluation history and optimization run', async () => {
    const optimized = await optimizePrompt('Initial prompt', 'Need concise storyboard output', {
      provider: 'heuristic',
      maxIterations: 2,
      rubric: {
        requiredTerms: ['storyboard'],
        bannedTerms: ['lorem'],
      },
    });

    expect(optimized.optimization.iterations.length).toBeGreaterThan(0);
    expect(optimized.evalHistory.length).toBeGreaterThan(0);
    expect(optimized.llmRuns.length).toBeGreaterThan(0);
  });

  it('orchestrator produces tags, atoms, optimization, and eval', async () => {
    const orchestrator = new PromptOrchestrator();
    const result = await orchestrator.run('build scene tags and camera directions', 'final storyboard output', {
      provider: 'heuristic',
      maxIterations: 2,
    });

    expect(result.smallTags.length).toBeGreaterThan(0);
    expect(result.atoms.length).toBeGreaterThan(0);
    expect(result.evalHistory.length).toBeGreaterThan(0);
    expect(result.optimization.bestPrompt.length).toBeGreaterThan(0);
  });

  it('buildBasePrompt formats prompt atoms into a deterministic scaffold', () => {
    const prompt = buildBasePrompt([
      {
        id: 'atom-1',
        layer: 'context',
        text: 'github, notion, figma',
        tagRefs: ['small-1'],
        enabled: true,
      },
      {
        id: 'atom-2',
        layer: 'task',
        text: 'Organize imported browser research into a prompt brief',
        tagRefs: ['small-2'],
        enabled: true,
      },
    ]);

    expect(prompt).toContain('You are a prompt process engine.');
    expect(prompt).toContain('[context] github, notion, figma');
    expect(prompt).toContain('[task] Organize imported browser research into a prompt brief');
    expect(prompt).toContain('Return output in deterministic JSON with rationale.');
  });

  it('buildAutoMacroTags groups extracted tags into reusable macro nodes', () => {
    const summary = createDemoEdgeTabSummary();
    const macros = buildAutoMacroTags([
      { id: 'small-1', level: 'small', label: 'github', type: 'entity', weight: 0.8, confidence: 0.9, enabled: true, children: [] },
      { id: 'small-2', level: 'small', label: 'notion', type: 'entity', weight: 0.78, confidence: 0.88, enabled: true, children: [] },
      { id: 'small-3', level: 'small', label: 'organize', type: 'intent', weight: 0.76, confidence: 0.8, enabled: true, children: [] },
      { id: 'small-4', level: 'small', label: 'prompt brief', type: 'intent', weight: 0.8, confidence: 0.81, enabled: true, children: [] },
    ], summary);

    expect(macros.length).toBeGreaterThan(1);
    expect(macros.some((macro) => macro.label.includes('Window Focus'))).toBe(true);
    expect(macros.every((macro) => macro.children.length >= 2)).toBe(true);
  });
});
