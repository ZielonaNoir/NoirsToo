import { describe, expect, it } from 'vitest';
import { LLMGateway } from '../lib/prompt-graph/providers/gateway';

describe('LLMGateway', () => {
  it('falls back to heuristic when provider is not configured', async () => {
    const gateway = new LLMGateway();
    const run = await gateway.generate('extract', { input: 'camera motion cinematic storyboard' }, 'openai');

    expect(run.primary.provider).toBe('heuristic');
    expect(run.fallback?.provider).toBe('heuristic');
    expect(run.primary.fallbackUsed).toBe(true);
  });

  it('returns attempt metadata', async () => {
    const gateway = new LLMGateway();
    const run = await gateway.generate('optimize', {
      input: 'initial',
      target: 'final output',
      prompt: 'base prompt',
    }, 'heuristic');

    expect(run.primary.attempt).toBeGreaterThan(0);
    expect(run.attempts).toBeGreaterThan(0);
  });
});
