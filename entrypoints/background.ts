import { buildPromptAtoms, extractSmallTags, optimizePrompt } from '../lib/prompt-graph/engine';
import type { PickSession, RuntimeEventMessage, TagNode } from '../types/prompt-graph';

type FillMode = 'empty-only' | 'force';

interface SessionStore {
  [tabId: number]: PickSession;
}

const sessions: SessionStore = {};

const createSession = (tabId: number): PickSession => {
  const existing = sessions[tabId];
  if (existing) return existing;

  const session: PickSession = {
    sessionId: `session-${Date.now()}-${tabId}`,
    tabId,
    state: 'idle',
    updatedAt: Date.now(),
  };
  sessions[tabId] = session;
  return session;
};

const updateSession = (tabId: number, patch: Partial<PickSession>) => {
  const session = createSession(tabId);
  sessions[tabId] = { ...session, ...patch, updatedAt: Date.now() };
  return sessions[tabId];
};

const broadcastPanelEvent = async (tabId: number, event: string, payload?: unknown) => {
  await browser.runtime.sendMessage({
    type: 'PANEL_EVENT',
    tabId,
    event,
    payload,
    session: sessions[tabId],
  }).catch(() => {
    // Ignore if no panel listeners are attached.
  });
};

const sendToTab = async (tabId: number, message: Record<string, unknown>) => {
  await browser.tabs.sendMessage(tabId, message).catch((error) => {
    updateSession(tabId, { state: 'error', lastError: String(error) });
  });
};

const startPicking = async (tabId: number) => {
  const session = createSession(tabId);
  updateSession(tabId, { state: 'picking', lastError: undefined });
  await sendToTab(tabId, { type: 'PICK_START', sessionId: session.sessionId });
  await broadcastPanelEvent(tabId, 'PICK_START', { source: 'background' });
};

const stopPicking = async (tabId: number) => {
  updateSession(tabId, { state: 'idle' });
  await sendToTab(tabId, { type: 'PICK_STOP' });
  await broadcastPanelEvent(tabId, 'PICK_STOP', { source: 'background' });
};

const requestInjection = async (tabId: number, mode: FillMode) => {
  updateSession(tabId, { state: 'injecting' });
  await sendToTab(tabId, { type: 'INJECT_REQUEST', mode });
  await broadcastPanelEvent(tabId, 'INJECT_REQUEST', { mode });
};

export default defineBackground(() => {
  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'toggle-picker') return;

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const session = createSession(tab.id);
    if (session.state === 'picking') {
      await stopPicking(tab.id);
    } else {
      await startPicking(tab.id);
    }
  });

  browser.runtime.onMessage.addListener((message, sender) => {
    if (!message || typeof message !== 'object') return undefined;

    if (message.type === 'CONTENT_READY') {
      const tabId = sender.tab?.id;
      if (!tabId) return Promise.resolve({ ok: false });
      createSession(tabId);
      return Promise.resolve({ ok: true, tabId });
    }

    if (message.type === 'PICK_EVENT') {
      const eventMessage = message as RuntimeEventMessage & { sessionId?: string };
      const tabId = sender.tab?.id ?? (typeof eventMessage.tabId === 'number' ? eventMessage.tabId : -1);
      if (tabId <= -1) return undefined;

      if (eventMessage.event === 'PICK_START') updateSession(tabId, { state: 'picking' });
      if (eventMessage.event === 'PICK_SELECT') updateSession(tabId, { state: 'selected', targetNode: eventMessage.payload as PickSession['targetNode'] });
      if (eventMessage.event === 'INJECT_RESULT') updateSession(tabId, { state: 'done' });
      if (eventMessage.event === 'ERROR') updateSession(tabId, { state: 'error', lastError: String((eventMessage.payload as any)?.message ?? 'Unknown error') });

      void broadcastPanelEvent(tabId, eventMessage.event, eventMessage.payload);
      return undefined;
    }

    if (message.type === 'PANEL_GET_STATE') {
      const tabId = Number(message.tabId ?? 0);
      if (!tabId) return Promise.resolve({ ok: false, error: 'Invalid tabId' });
      return Promise.resolve({ ok: true, session: createSession(tabId) });
    }

    if (message.type === 'PANEL_PICK_START') {
      const tabId = Number(message.tabId ?? 0);
      if (!tabId) return Promise.resolve({ ok: false, error: 'Invalid tabId' });
      return startPicking(tabId).then(() => ({ ok: true }));
    }

    if (message.type === 'PANEL_PICK_STOP') {
      const tabId = Number(message.tabId ?? 0);
      if (!tabId) return Promise.resolve({ ok: false, error: 'Invalid tabId' });
      return stopPicking(tabId).then(() => ({ ok: true }));
    }

    if (message.type === 'PANEL_INJECT') {
      const tabId = Number(message.tabId ?? 0);
      if (!tabId) return Promise.resolve({ ok: false, error: 'Invalid tabId' });
      const mode: FillMode = message.mode === 'force' ? 'force' : 'empty-only';
      return requestInjection(tabId, mode).then(() => ({ ok: true }));
    }

    if (message.type === 'PANEL_EXTRACT_TAGS') {
      const text = typeof message.input === 'string' ? message.input : '';
      const smallTags = extractSmallTags(text);
      const atoms = buildPromptAtoms(smallTags);
      return Promise.resolve({ ok: true, smallTags, atoms });
    }

    if (message.type === 'PANEL_OPTIMIZE_PROMPT') {
      const prompt = typeof message.prompt === 'string' ? message.prompt : '';
      const target = typeof message.target === 'string' ? message.target : '';
      const maxIterations = Number(message.maxIterations ?? 3);
      const run = optimizePrompt(prompt, target, Number.isNaN(maxIterations) ? 3 : maxIterations);
      return Promise.resolve({ ok: true, run });
    }

    if (message.type === 'PANEL_SAVE_GRAPH') {
      const tabId = Number(message.tabId ?? 0);
      const graph = {
        smallTags: Array.isArray(message.smallTags) ? (message.smallTags as TagNode[]) : [],
        macroTags: Array.isArray(message.macroTags) ? (message.macroTags as TagNode[]) : [],
        prompt: String(message.prompt ?? ''),
        updatedAt: Date.now(),
      };
      const key = tabId ? `prompt-graph:${tabId}` : 'prompt-graph:global';
      return browser.storage.local.set({ [key]: graph }).then(() => ({ ok: true, key }));
    }

    if (message.type === 'PANEL_LOAD_GRAPH') {
      const tabId = Number(message.tabId ?? 0);
      const key = tabId ? `prompt-graph:${tabId}` : 'prompt-graph:global';
      return browser.storage.local.get(key).then((result) => ({ ok: true, graph: result[key] ?? null }));
    }

    return undefined;
  });
});
