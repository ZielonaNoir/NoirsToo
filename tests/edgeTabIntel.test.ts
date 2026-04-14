import { describe, expect, it } from 'vitest';
import { buildEdgeTabImportSummary, cleanTabUrl, classifyImportedTab } from '../lib/edge-tab-intel';

describe('edge tab import intel', () => {
  it('removes tracking params from URLs', () => {
    const cleaned = cleanTabUrl('https://platform.openai.com/docs/guides/prompt-engineering?utm_source=x&utm_medium=y&foo=bar#intro');
    expect(cleaned).toBe('https://platform.openai.com/docs/guides/prompt-engineering?foo=bar');
  });

  it('classifies common work categories', () => {
    expect(classifyImportedTab('OpenAI Prompt Engineering', 'https://platform.openai.com/docs')).toBe('docs');
    expect(classifyImportedTab('GitHub pull request', 'https://github.com/openai/openai/pull/1')).toBe('code');
    expect(classifyImportedTab('Figma board', 'https://www.figma.com/file/abc')).toBe('design');
  });

  it('cleans, deduplicates, and summarizes tabs', () => {
    const summary = buildEdgeTabImportSummary([
      { id: 1, windowId: 7, index: 0, title: 'OpenAI Docs', url: 'https://platform.openai.com/docs?utm_source=test', active: true },
      { id: 2, windowId: 7, index: 1, title: 'OpenAI Docs duplicate', url: 'https://platform.openai.com/docs#examples' },
      { id: 3, windowId: 7, index: 2, title: 'GitHub Repo', url: 'https://github.com/ZielonaNoir/NoirsToo' },
      { id: 4, windowId: 7, index: 3, title: 'Edge Internal', url: 'edge://extensions/' },
    ]);

    expect(summary.totalTabs).toBe(4);
    expect(summary.cleanedTabs).toBe(2);
    expect(summary.duplicateTabs).toBe(1);
    expect(summary.tabs[0]?.active).toBe(true);
    expect(summary.digest).toContain('Imported 2 cleaned Edge tabs');
    expect(summary.domains.map((item) => item.domain)).toEqual(expect.arrayContaining(['platform.openai.com', 'github.com']));
  });
});
