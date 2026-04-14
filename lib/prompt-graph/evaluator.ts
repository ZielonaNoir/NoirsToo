import type { EvalRubric, EvalRun } from '../../types/prompt-graph';

const tokenize = (text: string) => text
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
  .split(/\s+/)
  .filter((word) => word.length >= 3);

const jaccard = (a: string[], b: string[]) => {
  const setA = new Set(a);
  const setB = new Set(b);
  let hit = 0;
  setA.forEach((item) => {
    if (setB.has(item)) hit += 1;
  });
  return setA.size + setB.size === 0 ? 0 : hit / new Set([...setA, ...setB]).size;
};

export class Evaluator {
  score(candidate: string, target: string, rubric?: EvalRubric): EvalRun {
    const evalId = `eval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const reasons: string[] = [];

    const candidateTokens = tokenize(candidate);
    const targetTokens = tokenize(target);
    const semanticScore = Number(jaccard(candidateTokens, targetTokens).toFixed(4));

    const structureHits = (rubric?.mustContainSections ?? []).filter((section) => candidate.toLowerCase().includes(section.toLowerCase())).length;
    const structureScore = rubric?.mustContainSections?.length
      ? Number((structureHits / rubric.mustContainSections.length).toFixed(4))
      : Number((candidate.includes('\n') ? 0.75 : 0.5).toFixed(4));

    const required = rubric?.requiredTerms ?? [];
    const banned = rubric?.bannedTerms ?? [];
    const requiredHits = required.filter((term) => candidate.toLowerCase().includes(term.toLowerCase())).length;
    const bannedHits = banned.filter((term) => candidate.toLowerCase().includes(term.toLowerCase())).length;
    const constraintScoreRaw = required.length === 0 ? 1 : requiredHits / required.length;
    const constraintScore = Number(Math.max(0, constraintScoreRaw - bannedHits * 0.2).toFixed(4));

    if (required.length > 0 && requiredHits < required.length) reasons.push(`missing_required_terms:${required.length - requiredHits}`);
    if (bannedHits > 0) reasons.push(`contains_banned_terms:${bannedHits}`);

    const overallScore = Number(((semanticScore * 0.45) + (structureScore * 0.25) + (constraintScore * 0.30)).toFixed(4));

    if (overallScore >= 0.8) reasons.push('high_alignment');
    else if (overallScore < 0.5) reasons.push('low_alignment');

    return {
      evalId,
      candidate,
      target,
      rubric,
      structureScore,
      semanticScore,
      constraintScore,
      overallScore,
      reasons,
      createdAt: Date.now(),
    };
  }
}
