import type {
  BrowserTabCandidate,
  EdgeTabImportSummary,
  ImportedEdgeTab,
  ImportedTabCategory,
} from '../types';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
]);

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'you', 'are', 'was', 'were', 'have',
  'has', 'had', 'will', 'would', 'should', 'could', 'can', 'about', 'http', 'https', 'www', 'com', 'org',
  'net', 'html', 'php', 'index', 'home', 'page', 'tab', 'edge',
]);

const INTERNAL_PROTOCOLS = ['edge:', 'chrome:', 'about:', 'devtools:', 'chrome-extension:'];

const CATEGORY_RULES: Array<{ category: ImportedTabCategory; patterns: RegExp[] }> = [
  { category: 'code', patterns: [/github/i, /gitlab/i, /bitbucket/i, /pull request/i, /commit/i, /diff/i, /repo/i, /sourcegraph/i] },
  { category: 'docs', patterns: [/docs?/i, /reference/i, /api/i, /developer/i, /mdn/i, /readme/i, /manual/i] },
  { category: 'ai', patterns: [/openai/i, /chatgpt/i, /claude/i, /gemini/i, /perplexity/i, /qwen/i, /llm/i, /prompt/i] },
  { category: 'communication', patterns: [/gmail/i, /outlook/i, /slack/i, /discord/i, /teams/i, /mail/i, /inbox/i] },
  { category: 'design', patterns: [/figma/i, /dribbble/i, /behance/i, /miro/i, /design/i] },
  { category: 'shopping', patterns: [/amazon/i, /taobao/i, /ebay/i, /shop/i, /cart/i, /checkout/i] },
  { category: 'video', patterns: [/youtube/i, /bilibili/i, /vimeo/i, /netflix/i, /video/i, /watch/i] },
  { category: 'social', patterns: [/twitter/i, /\bx\.com\b/i, /reddit/i, /linkedin/i, /facebook/i, /instagram/i] },
  { category: 'productivity', patterns: [/calendar/i, /drive/i, /docs.google/i, /sheets/i, /notion/i, /linear/i, /jira/i] },
  { category: 'research', patterns: [/news/i, /medium/i, /substack/i, /blog/i, /article/i, /paper/i, /arxiv/i] },
];

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const isImportableUrl = (url: string) => {
  if (!url) return false;
  return !INTERNAL_PROTOCOLS.some((prefix) => url.startsWith(prefix));
};

export const cleanTabUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    const query = url.searchParams.toString();
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.origin}${pathname}${query ? `?${query}` : ''}`;
  } catch {
    return rawUrl;
  }
};

const titleFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'Untitled tab';
  }
};

const extractKeywords = (title: string, url: string) => {
  const basis = `${title} ${url}`
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ')
    .replace(/[/-]/g, ' ');

  const counts = new Map<string, number>();
  for (const token of basis.split(/\s+/).filter(Boolean)) {
    if (token.length < 3 || STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([token]) => token);
};

export const classifyImportedTab = (title: string, url: string): ImportedTabCategory => {
  const text = `${title} ${url}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.category;
    }
  }
  return 'general';
};

const summarizeTab = (tab: ImportedEdgeTab) => {
  const keywordText = tab.keywords.length > 0 ? tab.keywords.join(', ') : 'no strong keywords';
  return `${tab.category.toUpperCase()} · ${tab.domain} · ${keywordText}`;
};

const sortTabs = (a: ImportedEdgeTab, b: ImportedEdgeTab) => {
  if (a.active !== b.active) return a.active ? -1 : 1;
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return a.title.localeCompare(b.title);
};

export const buildEdgeTabImportSummary = (candidates: BrowserTabCandidate[]): EdgeTabImportSummary => {
  const importable = candidates.filter((tab) => isImportableUrl(tab.url ?? ''));
  const grouped = new Map<string, BrowserTabCandidate[]>();

  for (const tab of importable) {
    const cleanUrl = cleanTabUrl(tab.url ?? '');
    const cluster = grouped.get(cleanUrl) ?? [];
    cluster.push(tab);
    grouped.set(cleanUrl, cluster);
  }

  const tabs = Array.from(grouped.entries())
    .map(([cleanUrl, tabsForUrl]) => {
      const tab = tabsForUrl[0];
      const title = normalizeWhitespace(tab.title?.trim() || titleFromUrl(cleanUrl));
      const parsed = new URL(cleanUrl);
      const domain = parsed.hostname.replace(/^www\./, '');
      const category = classifyImportedTab(title, cleanUrl);
      const imported: ImportedEdgeTab = {
        id: tab.id ?? -1,
        index: tab.index ?? 0,
        windowId: tab.windowId ?? 0,
        title,
        url: tab.url ?? cleanUrl,
        cleanUrl,
        domain,
        path: parsed.pathname || '/',
        category,
        keywords: extractKeywords(title, cleanUrl),
        active: Boolean(tab.active),
        pinned: Boolean(tab.pinned),
        audible: Boolean(tab.audible),
        duplicateCount: tabsForUrl.length - 1,
        summary: '',
      };
      imported.summary = summarizeTab(imported);
      return imported;
    })
    .sort(sortTabs);

  const categories = new Map<ImportedTabCategory, number>();
  const domains = new Map<string, number>();
  for (const tab of tabs) {
    categories.set(tab.category, (categories.get(tab.category) ?? 0) + 1);
    domains.set(tab.domain, (domains.get(tab.domain) ?? 0) + 1);
  }

  const categoryList = Array.from(categories.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => ({ category, count }));

  const domainList = Array.from(domains.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([domain, count]) => ({ domain, count }));

  const duplicateTabs = tabs.reduce((sum, tab) => sum + tab.duplicateCount, 0);
  const activeTab = tabs.find((tab) => tab.active);
  const digestLines = [
    `Imported ${tabs.length} cleaned Edge tabs from ${importable.length} visible tabs.`,
    categoryList.length > 0
      ? `Category mix: ${categoryList.map((item) => `${item.category}(${item.count})`).join(', ')}.`
      : 'Category mix: none.',
    domainList.length > 0
      ? `Top domains: ${domainList.map((item) => `${item.domain}(${item.count})`).join(', ')}.`
      : 'Top domains: none.',
    duplicateTabs > 0 ? `Collapsed ${duplicateTabs} duplicate tabs.` : 'No duplicate tabs detected.',
    activeTab ? `Active focus: ${activeTab.title}.` : 'No active tab detected.',
  ];

  return {
    importedAt: Date.now(),
    sourceBrowser: 'edge',
    totalTabs: candidates.length,
    cleanedTabs: tabs.length,
    duplicateTabs,
    activeTabId: activeTab?.id,
    digest: digestLines.join('\n'),
    categories: categoryList,
    domains: domainList,
    tabs,
  };
};

export const createDemoEdgeTabSummary = () => buildEdgeTabImportSummary([
  { id: 1, windowId: 1, index: 0, title: 'OpenAI Prompt Engineering Guide', url: 'https://platform.openai.com/docs/guides/prompt-engineering?utm_source=test', active: true, pinned: true },
  { id: 2, windowId: 1, index: 1, title: 'GitHub - ZielonaNoir/NoirsToo', url: 'https://github.com/ZielonaNoir/NoirsToo' },
  { id: 3, windowId: 1, index: 2, title: 'Figma - Prompt Graph Flow', url: 'https://www.figma.com/file/dragon/prompt-graph' },
  { id: 4, windowId: 1, index: 3, title: 'Notion - Weekly Product Notes', url: 'https://www.notion.so/workspace/weekly-product-notes' },
  { id: 5, windowId: 1, index: 4, title: 'GitHub - ZielonaNoir/NoirsToo', url: 'https://github.com/ZielonaNoir/NoirsToo#readme' },
]);
