import type { TagNode } from '../../types/prompt-graph';

export interface LayoutOptions {
  width: number;
  height: number;
  iterations?: number;
  repulsion?: number;
  attraction?: number;
}

export const runForceLayout = (tags: TagNode[], options: LayoutOptions): TagNode[] => {
  const iterations = options.iterations ?? 80;
  const repulsion = options.repulsion ?? 4500;
  const attraction = options.attraction ?? 0.025;

  const nodes = tags.map((tag, index) => ({
    ...tag,
    x: tag.x ?? 80 + (index % 8) * 110,
    y: tag.y ?? 80 + Math.floor(index / 8) * 90,
    vx: 0,
    vy: 0,
  }));

  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = (a.x ?? 0) - (b.x ?? 0);
        const dy = (a.y ?? 0) - (b.y ?? 0);
        const distSq = Math.max(1, dx * dx + dy * dy);
        const force = repulsion / distSq;
        const fx = (dx / Math.sqrt(distSq)) * force;
        const fy = (dy / Math.sqrt(distSq)) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    for (const node of nodes) {
      if (node.level === 'macro') {
        for (const childId of node.children) {
          const child = nodes.find((candidate) => candidate.id === childId);
          if (!child) continue;
          const dx = (child.x ?? 0) - (node.x ?? 0);
          const dy = (child.y ?? 0) - (node.y ?? 0);
          node.vx += dx * attraction;
          node.vy += dy * attraction;
          child.vx -= dx * attraction;
          child.vy -= dy * attraction;
        }
      }
    }

    for (const node of nodes) {
      node.vx *= 0.82;
      node.vy *= 0.82;
      node.x = Math.min(options.width - 40, Math.max(40, (node.x ?? 0) + node.vx));
      node.y = Math.min(options.height - 30, Math.max(30, (node.y ?? 0) + node.vy));
    }
  }

  return nodes.map(({ vx, vy, ...node }) => node);
};
