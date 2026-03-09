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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { OptimizationRun, PickSession, PromptAtom, TagNode } from '../../types/prompt-graph';

const inspectedTabId = Number(browser.devtools?.inspectedWindow?.tabId ?? 0);

const session = reactive<PickSession>({
  sessionId: '',
  tabId: inspectedTabId,
  state: 'idle',
  updatedAt: Date.now(),
});

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
  await browser.runtime.sendMessage({ type: 'PANEL_PICK_START', tabId: inspectedTabId });
};

const stopPick = async () => {
  await browser.runtime.sendMessage({ type: 'PANEL_PICK_STOP', tabId: inspectedTabId });
};

const inject = async (mode: 'empty-only' | 'force') => {
  await browser.runtime.sendMessage({ type: 'PANEL_INJECT', tabId: inspectedTabId, mode });
};

const extractTags = async () => {
  const response = await browser.runtime.sendMessage({
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
  const response = await browser.runtime.sendMessage({
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
  await browser.runtime.sendMessage({
    type: 'PANEL_SAVE_GRAPH',
    tabId: inspectedTabId,
    smallTags: smallTags.value,
    macroTags: macroTags.value,
    prompt: basePrompt.value,
  });
};

const loadGraph = async () => {
  const response = await browser.runtime.sendMessage({ type: 'PANEL_LOAD_GRAPH', tabId: inspectedTabId });
  if (!response?.ok || !response.graph) return;
  smallTags.value = response.graph.smallTags || [];
  macroTags.value = response.graph.macroTags || [];
  basePrompt.value = response.graph.prompt || '';
  rebuildAtoms();
};

onMounted(async () => {
  const state = await browser.runtime.sendMessage({ type: 'PANEL_GET_STATE', tabId: inspectedTabId });
  if (state?.ok && state.session) Object.assign(session, state.session);

  browser.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== 'PANEL_EVENT' || Number(message.tabId) !== inspectedTabId) return;
    if (message.session) Object.assign(session, message.session);

    if (message.event === 'INJECT_RESULT' && message.payload) {
      const payload = message.payload as { filled: number; skipped: number; total: number };
      session.lastError = `Injected ${payload.filled}/${payload.total}, skipped ${payload.skipped}`;
    }

    if (message.event === 'ERROR' && message.payload) {
      session.lastError = String((message.payload as { message?: string }).message ?? 'Unknown error');
    }
  });
});
</script>
