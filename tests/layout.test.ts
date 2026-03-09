import { describe, expect, it } from 'vitest';
import { runForceLayout } from '../lib/prompt-graph/layout';
import type { TagNode } from '../types/prompt-graph';

const generateTags = (size: number): TagNode[] =>
  Array.from({ length: size }).map((_, index) => ({
    id: `small-${index}`,
    level: 'small',
    label: `tag-${index}`,
    type: 'entity',
    weight: 0.6,
    confidence: 0.7,
    enabled: true,
    children: [],
  }));

describe('layout', () => {
  it('keeps nodes bounded for large graphs', () => {
    const tags = generateTags(1000);
    const out = runForceLayout(tags, { width: 1200, height: 640, iterations: 10 });

    expect(out).toHaveLength(1000);
    for (const node of out) {
      expect(node.x).toBeGreaterThanOrEqual(40);
      expect(node.y).toBeGreaterThanOrEqual(30);
      expect(node.x).toBeLessThanOrEqual(1160);
      expect(node.y).toBeLessThanOrEqual(610);
    }
  });
});
