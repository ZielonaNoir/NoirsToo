<template>
  <main class="panel-root">
    <header class="panel-header">
      <div>
        <h1>Prompt Graph</h1>
        <p>Tab {{ inspectedTabId }} · state: <strong>{{ session.state }}</strong> · provider: <strong>{{ provider }}</strong></p>
      </div>
      <div class="actions">
        <button
          :disabled="!inspectedTabId || session.state === 'picking'"
          @click="startPick"
        >
          Start Pick
        </button>
        <button
          :disabled="!inspectedTabId || session.state !== 'picking'"
          @click="stopPick"
        >
          Stop
        </button>
        <button
          :class="{ active: inspectSyncEnabled }"
          :disabled="!hasDevtoolsApi"
          @click="toggleInspectSync"
        >
          Inspect Sync {{ inspectSyncEnabled ? 'On' : 'Off' }}
        </button>
        <button
          :disabled="!hasDevtoolsApi"
          @click="importCurrentSelection"
        >
          Import $0
        </button>
      </div>
    </header>

    <section class="card">
      <h2>Provider</h2>
      <div class="provider-row">
        <button
          :class="{ active: provider === 'openai' }"
          @click="provider = 'openai'"
        >
          OpenAI
        </button>
        <button
          :class="{ active: provider === 'gemini' }"
          @click="provider = 'gemini'"
        >
          Gemini
        </button>
        <button
          :class="{ active: provider === 'heuristic' }"
          @click="provider = 'heuristic'"
        >
          Heuristic
        </button>
      </div>
      <p class="muted">
        OpenAI primary, Gemini fallback, heuristic final fallback.
      </p>
    </section>

    <section class="card">
      <h2>Picker Result</h2>
      <p
        v-if="session.lastError"
        class="error"
      >
        {{ session.lastError }}
      </p>
      <p
        v-if="injectSummary"
        class="ok"
      >
        {{ injectSummary }}
      </p>
      <p
        v-if="riskSummary"
        class="warn"
      >
        {{ riskSummary }}
      </p>
      <div v-if="session.targetNode">
        <p><strong>Selector:</strong> {{ session.targetNode.selector }}</p>
        <p><strong>XPath:</strong> {{ session.targetNode.xpath }}</p>
        <p><strong>Fields:</strong> {{ session.targetNode.fields.length }}</p>
        <ul class="field-list">
          <li
            v-for="field in session.targetNode.fields"
            :key="field.selector"
          >
            <span>{{ field.label || field.name || field.id || field.selector }}</span>
            <code>{{ field.type }}</code>
          </li>
        </ul>
      </div>
      <p v-else>
        No container selected.
      </p>

      <div class="row">
        <button
          :disabled="!canInject"
          @click="inject('empty-only')"
        >
          Inject Empty
        </button>
        <button
          :disabled="!canInject"
          class="danger"
          @click="inject('force')"
        >
          Inject Force
        </button>
      </div>

      <div
        v-if="selectionHistory.length > 0"
        class="history"
      >
        <h3>Selection History</h3>
        <div class="chips">
          <button
            v-for="node in selectionHistory"
            :key="`${node.selector}-${node.xpath}`"
            class="chip history-chip"
            @click="restoreHistory(node)"
          >
            {{ node.selector.slice(0, 60) }}
          </button>
        </div>
      </div>

      <div
        v-if="isQaMode"
        class="qa-box"
      >
        <h3>QA Fixture Controls</h3>
        <button @click="mockSelectTarget">
          Mock Select Target
        </button>
        <div class="qa-row">
          <label>Email</label>
          <input
            id="qa-email"
            v-model="qaFixture.email"
            placeholder="email"
          >
        </div>
        <div class="qa-row">
          <label>Name</label>
          <input
            id="qa-name"
            v-model="qaFixture.name"
            placeholder="name"
          >
        </div>
        <div class="qa-row">
          <label>City</label>
          <input
            id="qa-city"
            v-model="qaFixture.city"
            placeholder="city"
          >
        </div>
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Unstructured Input</h2>
        <textarea
          v-model="rawInput"
          placeholder="Paste unstructured text to extract small tags"
        />
        <textarea
          v-model="targetOutput"
          placeholder="Target output sample or rubric"
        />
        <input
          v-model="requiredTerms"
          placeholder="Required terms (comma separated)"
        >
        <input
          v-model="bannedTerms"
          placeholder="Banned terms (comma separated)"
        >
        <input
          v-model="requiredSections"
          placeholder="Required sections (comma separated)"
        >
        <div class="row">
          <button
            :disabled="rawInput.trim().length === 0"
            @click="extractTags"
          >
            Extract Tags
          </button>
          <button
            :disabled="rawInput.trim().length === 0 || targetOutput.trim().length === 0"
            @click="runOrchestrate"
          >
            Full Orchestrate
          </button>
          <button
            :disabled="smallTags.length === 0"
            @click="saveGraph"
          >
            Save
          </button>
          <button @click="loadGraph">
            Load
          </button>
        </div>
      </article>

      <article class="card">
        <h2>Bubble Graph</h2>
        <div class="row">
          <input
            v-model="tagSearch"
            placeholder="Filter tags"
          >
          <button @click="runLayout">
            Auto Layout
          </button>
          <button
            :disabled="undoStack.length === 0"
            @click="undo"
          >
            Undo
          </button>
          <button
            :disabled="redoStack.length === 0"
            @click="redo"
          >
            Redo
          </button>
        </div>

        <div class="bubble-board">
          <button
            v-for="tag in filteredTags"
            :key="tag.id"
            class="bubble"
            :class="[tag.level, { off: !tag.enabled }]"
            :style="bubbleStyle(tag)"
            @mousedown="startDrag(tag, $event)"
            @click="toggleTag(tag.id)"
          >
            {{ tag.label }}
          </button>
        </div>

        <div class="row top-gap">
          <input
            v-model="macroName"
            placeholder="Macro tag name"
          >
          <button
            :disabled="selectedSmallTagIds.length < 2 || macroName.trim().length === 0"
            @click="createMacroTag"
          >
            Fuse
          </button>
        </div>

        <p class="muted">
          Macro tags
        </p>
        <div class="chips">
          <label
            v-for="tag in macroTags"
            :key="tag.id"
            class="chip macro"
            :class="{ off: !tag.enabled }"
          >
            <input
              v-model="tag.enabled"
              type="checkbox"
            >
            <span>{{ tag.label }} ({{ tag.children.length }})</span>
          </label>
        </div>
      </article>
    </section>

    <section class="card">
      <h2>Prompt Atoms</h2>
      <div class="atoms">
        <div
          v-for="atom in promptAtoms"
          :key="atom.id"
          class="atom"
        >
          <small>{{ atom.layer }}</small>
          <p>{{ atom.text }}</p>
        </div>
      </div>
      <textarea
        v-model="basePrompt"
        placeholder="Base prompt generated from tags"
      />
      <div class="row">
        <button
          :disabled="basePrompt.trim().length === 0 || targetOutput.trim().length === 0"
          @click="runOptimize"
        >
          Optimize Prompt
        </button>
      </div>
      <div
        v-if="optimizationRun"
        class="opt-block"
      >
        <p><strong>Best score:</strong> {{ optimizationRun.score.toFixed(3) }}</p>
        <p><strong>Best prompt:</strong></p>
        <pre>{{ optimizationRun.bestPrompt }}</pre>
      </div>

      <div
        v-if="evalHistory.length > 0"
        class="eval-box"
      >
        <h3>Eval History</h3>
        <ul class="eval-list">
          <li
            v-for="evalRun in evalHistory"
            :key="evalRun.evalId"
          >
            score={{ evalRun.overallScore.toFixed(3) }} · semantic={{ evalRun.semanticScore.toFixed(3) }} · structure={{ evalRun.structureScore.toFixed(3) }} · constraints={{ evalRun.constraintScore.toFixed(3) }}
          </li>
        </ul>
      </div>
    </section>

    <section class="card">
      <h2>Telemetry</h2>
      <ul class="telemetry-list">
        <li
          v-for="event in telemetry.slice(-12).reverse()"
          :key="event.id"
        >
          {{ event.timestamp }} · {{ event.event }} · {{ event.state }}
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { runForceLayout } from '../../lib/prompt-graph/layout';
import type {
  EvalRubric,
  EvalRun,
  GraphSnapshot,
  InjectResultPayload,
  OptimizationRun,
  PickSession,
  PromptAtom,
  TagNode,
  TargetNode,
  LLMProviderKind,
} from '../../types/prompt-graph';

type RuntimeMessage = Record<string, unknown>;
type RuntimeListener = (message: RuntimeMessage) => void;

type RuntimeBridge = {
  sendMessage: (message: RuntimeMessage) => Promise<any>;
  addListener: (listener: RuntimeListener) => void;
  removeListener: (listener: RuntimeListener) => void;
};

const isQaMode = new URLSearchParams(window.location.search).get('qa') === '1';
const extensionTabId = Number((window as any).browser?.devtools?.inspectedWindow?.tabId ?? 0);
const inspectedTabId = extensionTabId || 999;
const hasDevtoolsApi = Boolean((window as any).browser?.devtools?.inspectedWindow?.eval);

const session = reactive<PickSession>({
  sessionId: '',
  tabId: inspectedTabId,
  state: 'idle',
  updatedAt: Date.now(),
  selectionHistory: [],
});

const provider = ref<LLMProviderKind>('openai');
const inspectSyncEnabled = ref(false);
const inspectTimer = ref<number | null>(null);

const qaFixture = reactive({
  email: 'already@filled.dev',
  name: '',
  city: '',
});

const injectSummary = ref('');
const riskSummary = ref('');
const telemetry = ref<Array<{ id: string; event: string; timestamp: string; state: string }>>([]);

const rawInput = ref('');
const macroName = ref('');
const tagSearch = ref('');
const smallTags = ref<TagNode[]>([]);
const macroTags = ref<TagNode[]>([]);
const promptAtoms = ref<PromptAtom[]>([]);
const basePrompt = ref('');
const targetOutput = ref('');
const optimizationRun = ref<OptimizationRun | null>(null);
const evalHistory = ref<EvalRun[]>([]);

const requiredTerms = ref('');
const bannedTerms = ref('');
const requiredSections = ref('');

const undoStack = ref<Array<{ smallTags: TagNode[]; macroTags: TagNode[] }>>([]);
const redoStack = ref<Array<{ smallTags: TagNode[]; macroTags: TagNode[] }>>([]);

const selectedSmallTagIds = computed(() => smallTags.value.filter((tag) => tag.enabled).map((tag) => tag.id));
const canInject = computed(() => inspectedTabId > 0 && !!session.targetNode && (session.state === 'selected' || session.state === 'done'));
const selectionHistory = computed(() => session.selectionHistory ?? []);

const filteredTags = computed(() => {
  const all = [...smallTags.value, ...macroTags.value];
  if (!tagSearch.value.trim()) return all;
  const query = tagSearch.value.toLowerCase();
  return all.filter((tag) => tag.label.toLowerCase().includes(query));
});

const createQaBridge = (): RuntimeBridge => {
  const listeners = new Set<RuntimeListener>();
  const qaStore: GraphSnapshot = {
    version: 2,
    provider: 'heuristic',
    smallTags: [],
    macroTags: [],
    prompt: '',
    evalHistory: [],
    riskFlags: [],
    updatedAt: Date.now(),
  };

  const notify = (event: string, payload?: unknown) => {
    const message = {
      type: 'PANEL_EVENT',
      tabId: inspectedTabId,
      event,
      payload: {
        ...(payload && typeof payload === 'object' ? payload as Record<string, unknown> : { value: payload }),
        timestamp: Date.now(),
      },
      session: { ...session, updatedAt: Date.now() },
    };
    listeners.forEach((listener) => listener(message));
  };

  return {
    async sendMessage(message: RuntimeMessage) {
      const type = String(message.type ?? '');

      if (type === 'PANEL_GET_STATE') {
        return { ok: true, session: { ...session } };
      }

      if (type === 'PANEL_GET_SELECTION_HISTORY') {
        return { ok: true, history: session.selectionHistory ?? [] };
      }

      if (type === 'PANEL_PICK_START') {
        session.state = 'picking';
        notify('PICK_START', { source: 'qa-bridge' });
        return { ok: true };
      }

      if (type === 'PANEL_PICK_STOP') {
        session.state = 'idle';
        notify('PICK_STOP', { source: 'qa-bridge' });
        return { ok: true };
      }

      if (type === 'PANEL_IMPORT_SELECTED_NODE') {
        const targetNode = message.targetNode as TargetNode;
        if (!targetNode) return { ok: false, error: 'missing targetNode' };
        session.targetNode = targetNode;
        session.state = 'selected';
        session.selectionHistory = [...(session.selectionHistory ?? []), targetNode].slice(-20);
        notify('PICK_SELECT', targetNode);
        return { ok: true };
      }

      if (type === 'PANEL_INJECT') {
        if (!session.targetNode) return { ok: false, error: 'No selected target' };
        const mode = String(message.mode ?? 'empty-only') === 'force' ? 'force' : 'empty-only';

        let filled = 0;
        let skipped = 0;
        if (mode === 'force' || qaFixture.email.length === 0) {
          qaFixture.email = 'chaos@example.com';
          filled += 1;
        } else {
          skipped += 1;
        }
        if (mode === 'force' || qaFixture.name.length === 0) {
          qaFixture.name = 'Dragon Operator';
          filled += 1;
        } else {
          skipped += 1;
        }
        if (mode === 'force' || qaFixture.city.length === 0) {
          qaFixture.city = 'Neon Harbor';
          filled += 1;
        } else {
          skipped += 1;
        }

        session.state = 'done';
        notify('INJECT_RESULT', {
          mode,
          filled,
          skipped,
          total: 3,
          durationMs: 1,
          riskFlags: [],
        } satisfies InjectResultPayload);
        return { ok: true };
      }

      if (type === 'PANEL_EXTRACT_TAGS') {
        const text = String(message.input ?? '');
        const terms = text.split(/[\s_,.-]+/).filter((token) => token.length > 2).slice(0, 8);
        const tags = terms.map((term, index) => ({
          id: `small-${index + 1}`,
          level: 'small',
          label: term,
          type: index % 2 === 0 ? 'entity' : 'intent',
          weight: 0.8,
          confidence: 0.8,
          enabled: true,
          children: [],
          x: 80 + (index % 4) * 130,
          y: 80 + Math.floor(index / 4) * 90,
        } as TagNode));
        return {
          ok: true,
          smallTags: tags,
          llmRun: {
            traceId: `qa-${Date.now()}`,
            taskType: 'extract',
            startedAt: Date.now(),
            completedAt: Date.now(),
            primary: { provider: 'heuristic', taskType: 'extract', output: JSON.stringify(tags), json: tags, latencyMs: 1, traceId: `qa-${Date.now()}` },
          },
        };
      }

      if (type === 'PANEL_OPTIMIZE_PROMPT') {
        const prompt = String(message.prompt ?? '');
        const target = String(message.target ?? '');
        return {
          ok: true,
          run: {
            runId: `qa-${Date.now()}`,
            input: prompt,
            target,
            iterations: [{ index: 1, prompt: `${prompt}\n\nTarget alignment: ${target}`, score: 0.72, reason: 'qa-run' }],
            bestPrompt: `${prompt}\n\nTarget alignment: ${target}`,
            score: 0.72,
          },
          evalHistory: [
            {
              evalId: `eval-${Date.now()}`,
              candidate: prompt,
              target,
              structureScore: 0.7,
              semanticScore: 0.73,
              constraintScore: 0.72,
              overallScore: 0.72,
              reasons: ['qa-mode'],
              createdAt: Date.now(),
            },
          ],
        };
      }

      if (type === 'PANEL_ORCHESTRATE') {
        return {
          ok: true,
          result: {
            smallTags: smallTags.value,
            atoms: promptAtoms.value,
            optimization: optimizationRun.value,
            evalHistory: evalHistory.value,
            llmRuns: [],
          },
        };
      }

      if (type === 'PANEL_SAVE_GRAPH') {
        qaStore.provider = (message.provider as LLMProviderKind) ?? 'heuristic';
        qaStore.smallTags = (message.smallTags as TagNode[]) ?? [];
        qaStore.macroTags = (message.macroTags as TagNode[]) ?? [];
        qaStore.prompt = String(message.prompt ?? '');
        qaStore.evalHistory = (message.evalHistory as EvalRun[]) ?? [];
        qaStore.riskFlags = (message.riskFlags as string[]) ?? [];
        qaStore.updatedAt = Date.now();
        return { ok: true };
      }

      if (type === 'PANEL_LOAD_GRAPH') {
        return { ok: true, graph: { ...qaStore } };
      }

      return { ok: false, error: `Unsupported message type: ${type}` };
    },
    addListener(listener: RuntimeListener) {
      listeners.add(listener);
    },
    removeListener(listener: RuntimeListener) {
      listeners.delete(listener);
    },
  };
};

const bridge: RuntimeBridge = (() => {
  const runtime = (window as any).browser?.runtime;
  if (!isQaMode && runtime?.sendMessage && runtime?.onMessage) {
    return {
      sendMessage: (message) => runtime.sendMessage(message),
      addListener: (listener) => runtime.onMessage.addListener(listener),
      removeListener: (listener) => runtime.onMessage.removeListener(listener),
    };
  }

  return createQaBridge();
})();

const cloneTags = (tags: TagNode[]) => tags.map((tag) => ({ ...tag, children: [...tag.children] }));

const snapshotState = () => {
  undoStack.value.push({
    smallTags: cloneTags(smallTags.value),
    macroTags: cloneTags(macroTags.value),
  });
  if (undoStack.value.length > 40) undoStack.value.shift();
  redoStack.value = [];
};

const restoreState = (state: { smallTags: TagNode[]; macroTags: TagNode[] }) => {
  smallTags.value = cloneTags(state.smallTags);
  macroTags.value = cloneTags(state.macroTags);
};

const undo = () => {
  const previous = undoStack.value.pop();
  if (!previous) return;
  redoStack.value.push({
    smallTags: cloneTags(smallTags.value),
    macroTags: cloneTags(macroTags.value),
  });
  restoreState(previous);
};

const redo = () => {
  const next = redoStack.value.pop();
  if (!next) return;
  undoStack.value.push({
    smallTags: cloneTags(smallTags.value),
    macroTags: cloneTags(macroTags.value),
  });
  restoreState(next);
};

const rebuildAtoms = () => {
  const tagIndex = new Map<string, TagNode>();
  [...smallTags.value, ...macroTags.value].forEach((tag) => tagIndex.set(tag.id, tag));

  const enabledTags = [...smallTags.value, ...macroTags.value].filter((tag) => {
    if (!tag.enabled) return false;
    if (tag.level === 'small') {
      const linkedMacros = macroTags.value.filter((macro) => macro.children.includes(tag.id) && macro.enabled);
      return linkedMacros.length === 0;
    }
    return true;
  });

  promptAtoms.value = enabledTags.map((tag, index) => {
    const layer = tag.type === 'intent'
      ? 'task'
      : tag.type === 'constraint' || tag.type === 'risk'
        ? 'constraints'
        : tag.type === 'style' || tag.type === 'tone'
          ? 'style'
          : 'context';

    const childrenText = tag.children
      .map((childId) => tagIndex.get(childId)?.label)
      .filter((value): value is string => Boolean(value))
      .join(', ');

    return {
      id: `atom-${index + 1}`,
      layer,
      text: tag.level === 'macro' && childrenText ? `${tag.label}: ${childrenText}` : tag.label,
      tagRefs: [tag.id, ...tag.children],
      enabled: true,
    };
  });

  basePrompt.value = [
    'You are a prompt process engine.',
    ...promptAtoms.value.map((atom) => `[${atom.layer}] ${atom.text}`),
    'Return output in deterministic JSON with rationale.',
  ].join('\n');
};

watch([smallTags, macroTags], rebuildAtoms, { deep: true });

const pushTelemetry = (event: string, state: string) => {
  telemetry.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    event,
    state,
    timestamp: new Date().toISOString(),
  });
  if (telemetry.value.length > 100) telemetry.value.shift();
};

const startPick = async () => {
  await bridge.sendMessage({ type: 'PANEL_PICK_START', tabId: inspectedTabId });
};

const stopPick = async () => {
  await bridge.sendMessage({ type: 'PANEL_PICK_STOP', tabId: inspectedTabId });
};

const evalRubric = computed<EvalRubric>(() => ({
  requiredTerms: requiredTerms.value.split(',').map((v) => v.trim()).filter(Boolean),
  bannedTerms: bannedTerms.value.split(',').map((v) => v.trim()).filter(Boolean),
  mustContainSections: requiredSections.value.split(',').map((v) => v.trim()).filter(Boolean),
}));

const importCurrentSelection = async () => {
  const devtools = (window as any).browser?.devtools?.inspectedWindow;
  if (!devtools?.eval) return;

  const script = `(() => {
    const n = window.$0;
    if (!n) return null;
    const r = n.getBoundingClientRect();
    const fields = Array.from(n.querySelectorAll('input, textarea, select, [contenteditable="true"]')).slice(0, 80).map((el) => ({
      selector: el.id ? '#' + CSS.escape(el.id) : (el.tagName.toLowerCase()),
      type: el.type || el.tagName.toLowerCase(),
      name: el.name || undefined,
      id: el.id || undefined,
      label: el.getAttribute('aria-label') || undefined,
      placeholder: el.placeholder || undefined,
      value: 'value' in el ? String(el.value || '') : (el.textContent || '').trim(),
    }));
    return {
      selector: n.id ? '#' + CSS.escape(n.id) : n.tagName.toLowerCase(),
      xpath: n.id ? '//*[@id="' + n.id + '"]' : '/' + n.tagName.toLowerCase(),
      domPath: [n.tagName.toLowerCase()],
      boundingBox: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
      tagName: n.tagName.toLowerCase(),
      fields,
    };
  })()`;

  await new Promise<void>((resolve) => {
    devtools.eval(script, async (result: TargetNode | null, exception: unknown) => {
      if (exception || !result) {
        session.lastError = 'Import $0 failed; select an element in Elements panel first.';
        resolve();
        return;
      }
      await bridge.sendMessage({ type: 'PANEL_IMPORT_SELECTED_NODE', tabId: inspectedTabId, targetNode: result });
      resolve();
    });
  });
};

const toggleInspectSync = () => {
  inspectSyncEnabled.value = !inspectSyncEnabled.value;
  if (!inspectSyncEnabled.value && inspectTimer.value) {
    clearInterval(inspectTimer.value);
    inspectTimer.value = null;
    return;
  }

  if (inspectSyncEnabled.value) {
    inspectTimer.value = window.setInterval(() => {
      void importCurrentSelection();
    }, 800);
  }
};

const restoreHistory = async (node: TargetNode) => {
  await bridge.sendMessage({ type: 'PANEL_IMPORT_SELECTED_NODE', tabId: inspectedTabId, targetNode: node });
};

const mockSelectTarget = () => {
  if (!isQaMode) return;
  const node: TargetNode = {
    selector: '#qa-target',
    xpath: '/html/body/div[1]',
    domPath: ['html', 'body', 'div'],
    boundingBox: { x: 12, y: 12, width: 320, height: 180 },
    tagName: 'div',
    fields: [
      { selector: '#qa-email', type: 'email', label: 'Email' },
      { selector: '#qa-name', type: 'text', label: 'Name' },
      { selector: '#qa-city', type: 'text', label: 'City' },
    ],
  };
  session.targetNode = node;
  session.state = 'selected';
  session.selectionHistory = [...(session.selectionHistory ?? []), node].slice(-20);
};

const inject = async (mode: 'empty-only' | 'force') => {
  await bridge.sendMessage({ type: 'PANEL_INJECT', tabId: inspectedTabId, mode });
};

const extractTags = async () => {
  snapshotState();
  const response = await bridge.sendMessage({
    type: 'PANEL_EXTRACT_TAGS',
    tabId: inspectedTabId,
    input: rawInput.value,
    provider: provider.value,
  });

  if (!response?.ok) return;
  smallTags.value = (response.smallTags || []).map((tag: TagNode, index: number) => ({
    ...tag,
    x: tag.x ?? 80 + (index % 8) * 110,
    y: tag.y ?? 80 + Math.floor(index / 8) * 90,
  }));
  macroTags.value = [];
  rebuildAtoms();
};

const runOrchestrate = async () => {
  snapshotState();
  const response = await bridge.sendMessage({
    type: 'PANEL_ORCHESTRATE',
    tabId: inspectedTabId,
    input: rawInput.value,
    target: targetOutput.value,
    provider: provider.value,
    rubric: evalRubric.value,
  });

  if (!response?.ok || !response.result) return;
  const result = response.result;
  smallTags.value = result.smallTags || [];
  promptAtoms.value = result.atoms || [];
  optimizationRun.value = result.optimization || null;
  basePrompt.value = result.optimization?.bestPrompt || basePrompt.value;
  evalHistory.value = result.evalHistory || [];
};

const createMacroTag = () => {
  snapshotState();
  const selected = smallTags.value.filter((tag) => tag.enabled).slice(0, 12);
  if (selected.length < 2) return;

  const macro: TagNode = {
    id: `macro-${Date.now()}`,
    level: 'macro',
    label: macroName.value.trim(),
    type: 'intent',
    weight: Number((selected.reduce((sum, tag) => sum + tag.weight, 0) / selected.length).toFixed(2)),
    confidence: Number((selected.reduce((sum, tag) => sum + tag.confidence, 0) / selected.length).toFixed(2)),
    enabled: true,
    children: selected.map((tag) => tag.id),
    x: 100,
    y: 80,
  };

  macroTags.value.push(macro);
  macroName.value = '';
  runLayout();
  rebuildAtoms();
};

const runOptimize = async () => {
  const response = await bridge.sendMessage({
    type: 'PANEL_OPTIMIZE_PROMPT',
    tabId: inspectedTabId,
    provider: provider.value,
    prompt: basePrompt.value,
    target: targetOutput.value,
    maxIterations: 4,
    rubric: evalRubric.value,
  });

  if (!response?.ok) return;
  optimizationRun.value = response.run;
  basePrompt.value = response.run.bestPrompt;
  evalHistory.value = response.evalHistory || [];
};

const saveGraph = async () => {
  await bridge.sendMessage({
    type: 'PANEL_SAVE_GRAPH',
    tabId: inspectedTabId,
    provider: provider.value,
    smallTags: smallTags.value,
    macroTags: macroTags.value,
    prompt: basePrompt.value,
    evalHistory: evalHistory.value,
    riskFlags: riskSummary.value ? [riskSummary.value] : [],
  });
};

const loadGraph = async () => {
  const response = await bridge.sendMessage({ type: 'PANEL_LOAD_GRAPH', tabId: inspectedTabId });
  if (!response?.ok || !response.graph) return;
  provider.value = response.graph.provider || 'openai';
  smallTags.value = response.graph.smallTags || [];
  macroTags.value = response.graph.macroTags || [];
  basePrompt.value = response.graph.prompt || '';
  evalHistory.value = response.graph.evalHistory || [];
  rebuildAtoms();
};

const runLayout = () => {
  snapshotState();
  const all = runForceLayout([...smallTags.value, ...macroTags.value], {
    width: 980,
    height: 340,
    iterations: smallTags.value.length > 300 ? 24 : 70,
  });

  const small = all.filter((node) => node.level === 'small');
  const macro = all.filter((node) => node.level === 'macro');
  smallTags.value = small;
  macroTags.value = macro;
};

const toggleTag = (tagId: string) => {
  const updateNode = (node: TagNode) => (node.id === tagId ? { ...node, enabled: !node.enabled } : node);
  smallTags.value = smallTags.value.map(updateNode);
  macroTags.value = macroTags.value.map(updateNode);
};

const dragState = reactive({
  activeId: '',
  startX: 0,
  startY: 0,
  nodeX: 0,
  nodeY: 0,
});

const startDrag = (tag: TagNode, event: MouseEvent) => {
  dragState.activeId = tag.id;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.nodeX = tag.x ?? 0;
  dragState.nodeY = tag.y ?? 0;

  const onMove = (moveEvent: MouseEvent) => {
    const dx = moveEvent.clientX - dragState.startX;
    const dy = moveEvent.clientY - dragState.startY;
    const apply = (node: TagNode) => {
      if (node.id !== dragState.activeId) return node;
      return { ...node, x: Math.max(20, Math.min(940, dragState.nodeX + dx)), y: Math.max(20, Math.min(320, dragState.nodeY + dy)) };
    };
    smallTags.value = smallTags.value.map(apply);
    macroTags.value = macroTags.value.map(apply);
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    dragState.activeId = '';
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

const bubbleStyle = (tag: TagNode) => ({
  left: `${tag.x ?? 40}px`,
  top: `${tag.y ?? 40}px`,
  transform: 'translate(-50%, -50%)',
  transition: dragState.activeId === tag.id ? 'none' : 'transform 180ms ease, box-shadow 180ms ease',
});

const panelEventListener: RuntimeListener = (message) => {
  if (!message || message.type !== 'PANEL_EVENT' || Number(message.tabId) !== inspectedTabId) return;
  if (message.session) Object.assign(session, message.session as Partial<PickSession>);

  pushTelemetry(String(message.event ?? 'UNKNOWN'), String((message.session as any)?.state ?? session.state));

  if (message.event === 'INJECT_RESULT' && message.payload) {
    const payload = message.payload as InjectResultPayload & { riskFlags?: string[] };
    injectSummary.value = `Injected ${payload.filled}/${payload.total}, skipped ${payload.skipped}, ${payload.durationMs}ms`;
    riskSummary.value = payload.riskFlags?.length ? `Risk flags: ${payload.riskFlags.join(', ')}` : '';
  }

  if (message.event === 'RISK_BLOCKED' && message.payload) {
    riskSummary.value = String((message.payload as { message?: string }).message ?? 'Risk policy blocked a field fill.');
  }

  if (message.event === 'ERROR' && message.payload) {
    session.lastError = String((message.payload as { message?: string }).message ?? 'Unknown error');
  }
};

onMounted(async () => {
  const state = await bridge.sendMessage({ type: 'PANEL_GET_STATE', tabId: inspectedTabId });
  if (state?.ok && state.session) Object.assign(session, state.session);

  const historyResponse = await bridge.sendMessage({ type: 'PANEL_GET_SELECTION_HISTORY', tabId: inspectedTabId });
  if (historyResponse?.ok && Array.isArray(historyResponse.history)) {
    session.selectionHistory = historyResponse.history;
  }

  bridge.removeListener(panelEventListener);
  bridge.addListener(panelEventListener);

  if (isQaMode) {
    mockSelectTarget();
  }
});

onUnmounted(() => {
  bridge.removeListener(panelEventListener);
  if (inspectTimer.value) {
    clearInterval(inspectTimer.value);
    inspectTimer.value = null;
  }
});
</script>
