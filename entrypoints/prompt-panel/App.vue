<template>
  <main class="panel-root">
    <header class="panel-header">
      <div>
        <h1>Prompt Graph</h1>
        <p>Tab {{ inspectedTabId }} · state: <strong>{{ session.state }}</strong></p>
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
    </header>

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
        <div class="row">
          <button
            :disabled="rawInput.trim().length === 0"
            @click="extractTags"
          >
            Extract Tags
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
        <p class="muted">
          Small tags
        </p>
        <div class="chips">
          <label
            v-for="tag in smallTags"
            :key="tag.id"
            class="chip"
            :class="{ off: !tag.enabled }"
          >
            <input
              v-model="tag.enabled"
              type="checkbox"
            >
            <span>{{ tag.label }}</span>
          </label>
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
      <textarea
        v-model="targetOutput"
        placeholder="Target output sample or rubric"
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
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import type { GraphSnapshot, InjectResultPayload, OptimizationRun, PickSession, PromptAtom, TagNode } from '../../types/prompt-graph';

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

const session = reactive<PickSession>({
  sessionId: '',
  tabId: inspectedTabId,
  state: 'idle',
  updatedAt: Date.now(),
});

const qaFixture = reactive({
  email: 'already@filled.dev',
  name: '',
  city: '',
});

const injectSummary = ref('');
const rawInput = ref('');
const macroName = ref('');
const smallTags = ref<TagNode[]>([]);
const macroTags = ref<TagNode[]>([]);
const promptAtoms = ref<PromptAtom[]>([]);
const basePrompt = ref('');
const targetOutput = ref('');
const optimizationRun = ref<OptimizationRun | null>(null);

const selectedSmallTagIds = computed(() => smallTags.value.filter((tag) => tag.enabled).map((tag) => tag.id));
const canInject = computed(() => inspectedTabId > 0 && !!session.targetNode && (session.state === 'selected' || session.state === 'done'));

const createQaBridge = (): RuntimeBridge => {
  const listeners = new Set<RuntimeListener>();
  const qaStore: GraphSnapshot = {
    version: 1,
    smallTags: [],
    macroTags: [],
    prompt: '',
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

      if (type === 'PANEL_PICK_START') {
        session.state = 'picking';
        notify('PICK_START', { source: 'qa-bridge' });
        notify('PICK_HOVER', { selector: '#qa-target', width: 320, height: 180 });
        return { ok: true };
      }

      if (type === 'PANEL_PICK_STOP') {
        session.state = 'idle';
        notify('PICK_STOP', { source: 'qa-bridge' });
        return { ok: true };
      }

      if (type === 'PANEL_INJECT') {
        if (!session.targetNode) return { ok: false, error: 'No selected target' };
        const mode = String(message.mode ?? 'empty-only') === 'force' ? 'force' : 'empty-only';
        const startedAt = performance.now();

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
          durationMs: Math.round(performance.now() - startedAt),
        } satisfies InjectResultPayload);

        return { ok: true };
      }

      if (type === 'PANEL_EXTRACT_TAGS') {
        const text = String(message.input ?? '');
        const tokens = text
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
          .split(/\s+/)
          .filter((word) => word.length > 2)
          .slice(0, 12);

        const tags: TagNode[] = tokens.map((token, index) => ({
          id: `small-${index + 1}`,
          level: 'small',
          label: token,
          type: index % 2 === 0 ? 'entity' : 'intent',
          weight: 0.8,
          confidence: 0.8,
          enabled: true,
          children: [],
        }));

        return { ok: true, smallTags: tags, atoms: [] };
      }

      if (type === 'PANEL_OPTIMIZE_PROMPT') {
        const prompt = String(message.prompt ?? '');
        const target = String(message.target ?? '');
        const bestPrompt = `${prompt}\n\nTarget alignment: ${target.slice(0, 80)}`;
        return {
          ok: true,
          run: {
            runId: `qa-${Date.now()}`,
            input: prompt,
            target,
            iterations: [{ index: 1, prompt: bestPrompt, score: 0.7, reason: 'QA optimized' }],
            bestPrompt,
            score: 0.7,
          },
        };
      }

      if (type === 'PANEL_SAVE_GRAPH') {
        qaStore.version = 1;
        qaStore.smallTags = (message.smallTags as TagNode[]) ?? [];
        qaStore.macroTags = (message.macroTags as TagNode[]) ?? [];
        qaStore.prompt = String(message.prompt ?? '');
        qaStore.updatedAt = Date.now();
        return { ok: true, key: `prompt-graph:${inspectedTabId}` };
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

  const atoms: PromptAtom[] = enabledTags.map((tag, index) => {
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
    } as PromptAtom;
  });

  promptAtoms.value = atoms;
  basePrompt.value = [
    'You are a prompt process engine.',
    ...atoms.map((atom) => `[${atom.layer}] ${atom.text}`),
    'Return output in a deterministic structure and include rationale for key decisions.',
  ].join('\n');
};

watch([smallTags, macroTags], rebuildAtoms, { deep: true });

const startPick = async () => {
  await bridge.sendMessage({ type: 'PANEL_PICK_START', tabId: inspectedTabId });
};

const stopPick = async () => {
  await bridge.sendMessage({ type: 'PANEL_PICK_STOP', tabId: inspectedTabId });
};

const mockSelectTarget = () => {
  if (!isQaMode) return;
  session.targetNode = {
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
  session.state = 'selected';
};

const inject = async (mode: 'empty-only' | 'force') => {
  await bridge.sendMessage({ type: 'PANEL_INJECT', tabId: inspectedTabId, mode });
};

const extractTags = async () => {
  const response = await bridge.sendMessage({
    type: 'PANEL_EXTRACT_TAGS',
    input: rawInput.value,
  });

  if (!response?.ok) return;
  smallTags.value = response.smallTags || [];
  macroTags.value = [];
  rebuildAtoms();
};

const createMacroTag = () => {
  const selected = smallTags.value.filter((tag) => tag.enabled).slice(0, 8);
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
  };

  macroTags.value.push(macro);
  macroName.value = '';
  rebuildAtoms();
};

const runOptimize = async () => {
  const response = await bridge.sendMessage({
    type: 'PANEL_OPTIMIZE_PROMPT',
    prompt: basePrompt.value,
    target: targetOutput.value,
    maxIterations: 4,
  });

  if (!response?.ok) return;
  optimizationRun.value = response.run;
  basePrompt.value = response.run.bestPrompt;
};

const saveGraph = async () => {
  await bridge.sendMessage({
    type: 'PANEL_SAVE_GRAPH',
    tabId: inspectedTabId,
    smallTags: smallTags.value,
    macroTags: macroTags.value,
    prompt: basePrompt.value,
  });
};

const loadGraph = async () => {
  const response = await bridge.sendMessage({ type: 'PANEL_LOAD_GRAPH', tabId: inspectedTabId });
  if (!response?.ok || !response.graph) return;
  smallTags.value = response.graph.smallTags || [];
  macroTags.value = response.graph.macroTags || [];
  basePrompt.value = response.graph.prompt || '';
  rebuildAtoms();
};

const panelEventListener: RuntimeListener = (message) => {
  if (!message || message.type !== 'PANEL_EVENT' || Number(message.tabId) !== inspectedTabId) return;
  if (message.session) Object.assign(session, message.session as Partial<PickSession>);

  if (message.event === 'INJECT_RESULT' && message.payload) {
    const payload = message.payload as InjectResultPayload;
    injectSummary.value = `Injected ${payload.filled}/${payload.total}, skipped ${payload.skipped}, ${payload.durationMs}ms`;
  }

  if (message.event === 'ERROR' && message.payload) {
    session.lastError = String((message.payload as { message?: string }).message ?? 'Unknown error');
  }
};

onMounted(async () => {
  const state = await bridge.sendMessage({ type: 'PANEL_GET_STATE', tabId: inspectedTabId });
  if (state?.ok && state.session) Object.assign(session, state.session);

  bridge.removeListener(panelEventListener);
  bridge.addListener(panelEventListener);

  if (isQaMode) {
    mockSelectTarget();
  }
});

onUnmounted(() => {
  bridge.removeListener(panelEventListener);
});
</script>
