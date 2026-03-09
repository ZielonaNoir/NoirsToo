import { PromptOrchestrator, buildPromptAtoms, extractSmallTags, optimizePrompt } from '../lib/prompt-graph/engine';
import { logAuditEvent, maskSensitiveText } from '../lib/prompt-graph/telemetry';
import type {
  EvalRubric,
  GraphSnapshot,
  PickSession,
  RuntimeEventMessage,
  TagNode,
  TargetNode,
  LLMProviderKind,
} from '../types/prompt-graph';

type FillMode = 'empty-only' | 'force';

interface SessionStore {
  [tabId: number]: PickSession;
}

const sessions: SessionStore = {};
const GRAPH_SNAPSHOT_VERSION = 2;
const orchestrator = new PromptOrchestrator();

const log = (event: string, tabId: number, sessionId?: string, state?: PickSession['state'], payload?: unknown) => {
  console.info('[PromptGraph:background]', {
    event,
    tabId,
    sessionId,
    state,
    timestamp: Date.now(),
    payload,
  });
};

const createSession = (tabId: number): PickSession => {
  const existing = sessions[tabId];
  if (existing) return existing;

  const session: PickSession = {
    sessionId: `session-${Date.now()}-${tabId}`,
    tabId,
    state: 'idle',
    updatedAt: Date.now(),
    selectionHistory: [],
  };
  sessions[tabId] = session;
  return session;
};

const pushSelectionHistory = (tabId: number, targetNode: TargetNode) => {
  const session = createSession(tabId);
  const history = [...(session.selectionHistory ?? []), targetNode].slice(-20);
  sessions[tabId] = {
    ...session,
    selectionHistory: history,
    targetNode,
    updatedAt: Date.now(),
  };
};

const updateSession = (tabId: number, patch: Partial<PickSession>) => {
  const session = createSession(tabId);
  sessions[tabId] = { ...session, ...patch, updatedAt: Date.now() };
  return sessions[tabId];
};

const broadcastPanelEvent = async (tabId: number, event: string, payload?: unknown, traceId?: string) => {
  const session = sessions[tabId];
  log(event, tabId, session?.sessionId, session?.state, payload);
  await browser.runtime.sendMessage({
    type: 'PANEL_EVENT',
    tabId,
    event,
    payload: {
      ...(payload && typeof payload === 'object' ? payload as Record<string, unknown> : { value: payload }),
      timestamp: Date.now(),
      traceId,
    },
    session,
  }).catch(() => {
    // Ignore if no panel listeners are attached.
  });
};

const auditRuntimeEvent = async (
  tabId: number,
  event: string,
  session: PickSession | undefined,
  payload?: unknown,
  traceId?: string,
) => {
  const eventMap: Record<string, 'pick_start' | 'pick_select' | 'inject_request' | 'inject_result' | 'llm_request' | 'llm_result' | 'eval_result' | 'risk_blocked' | 'error'> = {
    PICK_START: 'pick_start',
    PICK_SELECT: 'pick_select',
    INJECT_REQUEST: 'inject_request',
    INJECT_RESULT: 'inject_result',
    LLM_REQUEST: 'llm_request',
    LLM_RESULT: 'llm_result',
    EVAL_RESULT: 'eval_result',
    RISK_BLOCKED: 'risk_blocked',
    ERROR: 'error',
  };

  const mapped = eventMap[event];
  if (!mapped) return;
  const payloadRecord = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined;
  await logAuditEvent({
    eventType: mapped,
    tabId,
    sessionId: session?.sessionId,
    traceId,
    state: session?.state,
    payload: payloadRecord,
    riskFlags: Array.isArray(payloadRecord?.riskFlags) ? (payloadRecord.riskFlags as string[]) : undefined,
    createdAt: Date.now(),
  });
  await broadcastPanelEvent(tabId, 'AUDIT_LOGGED', { event }, traceId);
};

const sendToTab = async (tabId: number, message: Record<string, unknown>) => {
  await browser.tabs.sendMessage(tabId, message).catch((error) => {
    updateSession(tabId, { state: 'error', lastError: String(error) });
    log('TAB_MESSAGE_ERROR', tabId, sessions[tabId]?.sessionId, sessions[tabId]?.state, { message: String(error) });
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
      if (eventMessage.event === 'PICK_SELECT') {
        const targetNode = eventMessage.payload as TargetNode;
        pushSelectionHistory(tabId, targetNode);
        updateSession(tabId, { state: 'selected', targetNode });
      }
      if (eventMessage.event === 'INJECT_RESULT') updateSession(tabId, { state: 'done' });
      if (eventMessage.event === 'ERROR' || eventMessage.event === 'RISK_BLOCKED') {
        updateSession(tabId, { state: 'error', lastError: String((eventMessage.payload as any)?.message ?? 'Unknown error') });
      }

      log(eventMessage.event, tabId, eventMessage.sessionId ?? sessions[tabId]?.sessionId, sessions[tabId]?.state, eventMessage.payload);
      void broadcastPanelEvent(tabId, eventMessage.event, eventMessage.payload, eventMessage.traceId);
      void auditRuntimeEvent(tabId, eventMessage.event, sessions[tabId], eventMessage.payload, eventMessage.traceId);
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

    if (message.type === 'PANEL_IMPORT_SELECTED_NODE') {
      const tabId = Number(message.tabId ?? 0);
      const targetNode = message.targetNode as TargetNode | undefined;
      if (!tabId || !targetNode) return Promise.resolve({ ok: false, error: 'Invalid import payload' });

      pushSelectionHistory(tabId, targetNode);
      updateSession(tabId, { state: 'selected', targetNode });
      void broadcastPanelEvent(tabId, 'PICK_SELECT', targetNode);
      return Promise.resolve({ ok: true, session: sessions[tabId] });
    }

    if (message.type === 'PANEL_GET_SELECTION_HISTORY') {
      const tabId = Number(message.tabId ?? 0);
      if (!tabId) return Promise.resolve({ ok: false, error: 'Invalid tabId' });
      return Promise.resolve({ ok: true, history: createSession(tabId).selectionHistory ?? [] });
    }

    if (message.type === 'PANEL_EXTRACT_TAGS') {
      const text = typeof message.input === 'string' ? message.input : '';
      const provider = (message.provider as LLMProviderKind) || 'openai';
      return extractSmallTags(text, provider).then(({ tags, run }) => {
        void broadcastPanelEvent(Number(message.tabId ?? 0), 'LLM_RESULT', {
          taskType: 'extract',
          provider: run.primary.provider,
          latencyMs: run.primary.latencyMs,
          fallbackUsed: Boolean(run.fallback),
        }, run.traceId);
        void auditRuntimeEvent(Number(message.tabId ?? 0), 'LLM_RESULT', sessions[Number(message.tabId ?? 0)], {
          taskType: 'extract',
          provider: run.primary.provider,
          latencyMs: run.primary.latencyMs,
          costUsd: run.primary.costUsd,
        }, run.traceId);
        return { ok: true, smallTags: tags, llmRun: run };
      });
    }

    if (message.type === 'PANEL_OPTIMIZE_PROMPT') {
      const prompt = typeof message.prompt === 'string' ? message.prompt : '';
      const target = typeof message.target === 'string' ? message.target : '';
      const provider = (message.provider as LLMProviderKind) || 'openai';
      const maxIterations = Number(message.maxIterations ?? 3);
      const rubric = (message.rubric as EvalRubric | undefined);
      const tabId = Number(message.tabId ?? 0);

      void broadcastPanelEvent(tabId, 'LLM_REQUEST', { taskType: 'optimize', provider });
      void auditRuntimeEvent(tabId, 'LLM_REQUEST', sessions[tabId], { taskType: 'optimize', provider });
      return optimizePrompt(prompt, target, {
        provider,
        maxIterations: Number.isNaN(maxIterations) ? 3 : maxIterations,
        rubric,
        tabId,
        sessionId: sessions[tabId]?.sessionId,
      }).then((result) => {
        void broadcastPanelEvent(tabId, 'EVAL_RESULT', {
          latestScore: result.optimization.score,
          evalRuns: result.evalHistory.length,
        }, result.llmRuns[0]?.traceId);
        const latestRun = result.llmRuns[result.llmRuns.length - 1];
        if (latestRun) {
          void broadcastPanelEvent(tabId, 'LLM_RESULT', {
            taskType: 'optimize',
            provider: latestRun.primary.provider,
            latencyMs: latestRun.primary.latencyMs,
            fallbackUsed: Boolean(latestRun.fallback),
          }, latestRun.traceId);
        }
        void auditRuntimeEvent(tabId, 'EVAL_RESULT', sessions[tabId], {
          latestScore: result.optimization.score,
          evalRuns: result.evalHistory.length,
          bestPrompt: maskSensitiveText(result.optimization.bestPrompt),
        }, result.llmRuns[0]?.traceId);

        return {
          ok: true,
          run: result.optimization,
          evalHistory: result.evalHistory,
          llmRuns: result.llmRuns,
        };
      });
    }

    if (message.type === 'PANEL_ORCHESTRATE') {
      const tabId = Number(message.tabId ?? 0);
      const input = String(message.input ?? '');
      const target = String(message.target ?? '');
      const provider = (message.provider as LLMProviderKind) || 'openai';
      const rubric = message.rubric as EvalRubric | undefined;

      void broadcastPanelEvent(tabId, 'LLM_REQUEST', { taskType: 'extract+optimize', provider });
      void auditRuntimeEvent(tabId, 'LLM_REQUEST', sessions[tabId], { taskType: 'extract+optimize', provider });
      return orchestrator.run(input, target, {
        provider,
        maxIterations: 4,
        rubric,
        tabId,
        sessionId: sessions[tabId]?.sessionId,
      }).then((result) => {
        const latestRun = result.llmRuns[result.llmRuns.length - 1];
        if (latestRun) {
          void broadcastPanelEvent(tabId, 'LLM_RESULT', {
            taskType: latestRun.taskType,
            provider: latestRun.primary.provider,
            latencyMs: latestRun.primary.latencyMs,
            fallbackUsed: Boolean(latestRun.fallback),
          }, latestRun.traceId);
        }
        return { ok: true, result };
      });
    }

    if (message.type === 'PANEL_SAVE_GRAPH') {
      const tabId = Number(message.tabId ?? 0);
      const graph: GraphSnapshot = {
        version: GRAPH_SNAPSHOT_VERSION,
        provider: (message.provider as LLMProviderKind) || 'openai',
        smallTags: Array.isArray(message.smallTags) ? (message.smallTags as TagNode[]) : [],
        macroTags: Array.isArray(message.macroTags) ? (message.macroTags as TagNode[]) : [],
        prompt: String(message.prompt ?? ''),
        evalHistory: Array.isArray(message.evalHistory) ? message.evalHistory : [],
        riskFlags: Array.isArray(message.riskFlags) ? message.riskFlags as string[] : [],
        updatedAt: Date.now(),
      };
      const key = tabId ? `prompt-graph:${tabId}` : 'prompt-graph:global';
      return browser.storage.local.set({ [key]: graph }).then(() => ({ ok: true, key }));
    }

    if (message.type === 'PANEL_LOAD_GRAPH') {
      const tabId = Number(message.tabId ?? 0);
      const key = tabId ? `prompt-graph:${tabId}` : 'prompt-graph:global';
      return browser.storage.local.get(key).then((result) => {
        const graph = result[key] as GraphSnapshot | undefined;
        if (!graph) return { ok: true, graph: null };
        return {
          ok: true,
          graph: {
            version: graph.version ?? 0,
            provider: graph.provider ?? 'openai',
            smallTags: graph.smallTags ?? [],
            macroTags: graph.macroTags ?? [],
            prompt: graph.prompt ?? '',
            evalHistory: graph.evalHistory ?? [],
            riskFlags: graph.riskFlags ?? [],
            updatedAt: graph.updatedAt ?? Date.now(),
          } as GraphSnapshot,
        };
      });
    }

    return undefined;
  });
});
