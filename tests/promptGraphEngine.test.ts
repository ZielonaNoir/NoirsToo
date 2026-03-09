import { describe, expect, it } from 'vitest';
import { PromptOrchestrator, extractSmallTags, optimizePrompt } from '../lib/prompt-graph/engine';

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
});
