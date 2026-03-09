import { describe, expect, it } from 'vitest';
import { Evaluator } from '../lib/prompt-graph/evaluator';

describe('Evaluator', () => {
  it('scores higher for closer candidate to target', () => {
    const evaluator = new Evaluator();
    const good = evaluator.score('output json with storyboard and rationale', 'storyboard json rationale');
    const bad = evaluator.score('random unrelated words', 'storyboard json rationale');

    expect(good.overallScore).toBeGreaterThan(bad.overallScore);
  });

  it('applies rubric constraints for required and banned terms', () => {
    const evaluator = new Evaluator();
    const run = evaluator.score('include alpha and beta but avoid omega', 'alpha beta', {
      requiredTerms: ['alpha', 'beta'],
      bannedTerms: ['omega'],
      mustContainSections: ['alpha'],
    });

    expect(run.constraintScore).toBeLessThan(1);
    expect(run.reasons.some((reason) => reason.includes('contains_banned_terms'))).toBe(true);
  });
});
