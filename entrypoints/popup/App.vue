<template>
  <div class="w-[400px] h-[560px] relative overflow-hidden font-sans text-white select-none">
    <FluidBackground />

    <div class="relative z-10 flex flex-col h-full p-6 gap-4">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-[10px] uppercase tracking-[0.35em] text-white/35">
            Edge Tab Import
          </p>
          <h1 class="mt-2 text-2xl font-light tracking-[0.08em] text-white/90">
            Window Digest
          </h1>
          <p class="mt-2 text-xs text-white/45 max-w-[220px] leading-relaxed">
            Auto-import current Edge window tabs, clean noise, classify, and extract metadata.
          </p>
        </div>
        <EmotionalStatus :status="currentStatus" />
      </div>

      <section class="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[11px] uppercase tracking-[0.28em] text-white/30">
              Snapshot
            </p>
            <p class="mt-1 text-sm text-white/75">
              {{ statusLine }}
            </p>
          </div>
          <button
            class="text-xs uppercase tracking-[0.2em] text-cyan-200/80 hover:text-cyan-100 transition-colors"
            @click="copyDigest"
          >
            Copy Digest
          </button>
        </div>

        <p
          v-if="errorMessage"
          class="mt-3 text-xs text-rose-200/80"
        >
          {{ errorMessage }}
        </p>

        <div class="mt-4 grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-white/5 px-3 py-2">
            <p class="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Visible
            </p>
            <p class="mt-1 text-lg font-light text-white/90">
              {{ tabSummary?.totalTabs ?? 0 }}
            </p>
          </div>
          <div class="rounded-xl bg-white/5 px-3 py-2">
            <p class="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Cleaned
            </p>
            <p class="mt-1 text-lg font-light text-white/90">
              {{ tabSummary?.cleanedTabs ?? 0 }}
            </p>
          </div>
          <div class="rounded-xl bg-white/5 px-3 py-2">
            <p class="text-[10px] uppercase tracking-[0.18em] text-white/35">
              Domains
            </p>
            <p class="mt-1 text-lg font-light text-white/90">
              {{ tabSummary?.domains.length ?? 0 }}
            </p>
          </div>
        </div>

        <div
          v-if="tabSummary?.categories.length"
          class="mt-4 flex flex-wrap gap-2"
        >
          <span
            v-for="item in tabSummary.categories"
            :key="item.category"
            class="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
            :class="categoryChipClass(item.category)"
          >
            {{ item.category }} · {{ item.count }}
          </span>
        </div>
      </section>

      <section class="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl px-4 py-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-[11px] uppercase tracking-[0.28em] text-white/35">
            Digest Prompt Seed
          </p>
          <span class="text-[10px] uppercase tracking-[0.18em] text-white/25">
            {{ tabSummary?.sourceBrowser ?? 'edge' }}
          </span>
        </div>
        <MoodInput
          v-model="inputData"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
      </section>

      <section class="flex-1 min-h-0 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl px-4 py-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-[11px] uppercase tracking-[0.28em] text-white/35">
            Cleaned Tabs
          </p>
          <span class="text-[10px] uppercase tracking-[0.18em] text-white/25">
            top {{ visibleTabs.length }}
          </span>
        </div>

        <div class="space-y-2 overflow-y-auto max-h-[172px] pr-1">
          <article
            v-for="tab in visibleTabs"
            :key="tab.cleanUrl"
            class="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-light text-white/88">
                  {{ tab.title }}
                </p>
                <p class="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/28">
                  {{ tab.domain }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.16em]"
                :class="categoryChipClass(tab.category)"
              >
                {{ tab.category }}
              </span>
            </div>

            <p class="mt-2 text-[11px] leading-relaxed text-white/55">
              {{ tab.summary }}
            </p>

            <div class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="keyword in tab.keywords"
                :key="`${tab.cleanUrl}-${keyword}`"
                class="rounded-full bg-white/6 px-2 py-1 text-[10px] text-white/50"
              >
                {{ keyword }}
              </span>
            </div>
          </article>

          <p
            v-if="visibleTabs.length === 0"
            class="text-sm text-white/45"
          >
            No importable tabs in the current Edge window.
          </p>
        </div>
      </section>

      <div class="space-y-3 pt-1">
        <LevitatingButton
          :disabled="currentStatus === 'processing'"
          @click="refreshTabs"
        >
          <span v-if="currentStatus === 'processing'">Syncing Edge Tabs...</span>
          <span v-else>Refresh Edge Snapshot</span>
        </LevitatingButton>

        <div class="flex justify-between items-center px-2 opacity-45 hover:opacity-85 transition-opacity duration-500 text-[10px] tracking-widest uppercase">
          <span>DragonFill v0.2</span>
          <button
            class="hover:text-cyan-100 transition-colors"
            @click="onConfigClick"
          >
            Prompt Graph
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import FluidBackground from '../../components/FluidBackground.vue';
import EmotionalStatus from '../../components/EmotionalStatus.vue';
import MoodInput from '../../components/MoodInput.vue';
import LevitatingButton from '../../components/LevitatingButton.vue';
import { createDemoEdgeTabSummary } from '../../lib/edge-tab-intel';
import type { EdgeTabImportSummary, ImportedEdgeTab, ImportedTabCategory } from '../../types';

type PopupRuntime = {
  runtime?: {
    sendMessage?: (message: Record<string, unknown>) => Promise<unknown>;
    getURL?: (path: string) => string;
  };
  tabs?: {
    create?: (createProperties: { url: string }) => Promise<unknown>;
  };
};

const runtime = typeof window !== 'undefined'
  ? (window as typeof window & { browser?: PopupRuntime }).browser
  : undefined;

const inputData = ref('');
const currentStatus = ref<'idle' | 'processing' | 'success' | 'error'>('idle');
const isFocused = ref(false);
const tabSummary = ref<EdgeTabImportSummary | null>(null);
const errorMessage = ref('');

const hasRuntime = computed(() => typeof runtime?.runtime?.sendMessage === 'function');

const visibleTabs = computed<ImportedEdgeTab[]>(() => tabSummary.value?.tabs.slice(0, 8) ?? []);

const statusLine = computed(() => {
  if (currentStatus.value === 'processing') return 'Importing current Edge window...';
  if (errorMessage.value) return errorMessage.value;
  if (!tabSummary.value) return 'Waiting for first tab import.';
  return `${tabSummary.value.cleanedTabs} cleaned tabs · ${tabSummary.value.duplicateTabs} duplicates collapsed`;
});

const categoryChipClass = (category: ImportedTabCategory) => {
  const palette: Record<ImportedTabCategory, string> = {
    ai: 'border-fuchsia-300/40 bg-fuchsia-400/10 text-fuchsia-100',
    code: 'border-cyan-300/40 bg-cyan-400/10 text-cyan-100',
    docs: 'border-sky-300/40 bg-sky-400/10 text-sky-100',
    research: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100',
    productivity: 'border-teal-300/40 bg-teal-400/10 text-teal-100',
    communication: 'border-amber-300/40 bg-amber-400/10 text-amber-100',
    design: 'border-pink-300/40 bg-pink-400/10 text-pink-100',
    shopping: 'border-orange-300/40 bg-orange-400/10 text-orange-100',
    video: 'border-rose-300/40 bg-rose-400/10 text-rose-100',
    social: 'border-violet-300/40 bg-violet-400/10 text-violet-100',
    general: 'border-white/20 bg-white/8 text-white/70',
  };
  return palette[category];
};

const applySummary = (summary: EdgeTabImportSummary) => {
  tabSummary.value = summary;
  inputData.value = summary.digest;
  currentStatus.value = summary.cleanedTabs > 0 ? 'success' : 'error';
  errorMessage.value = summary.cleanedTabs > 0 ? '' : 'No importable tabs were found in this window.';
};

const refreshTabs = async () => {
  currentStatus.value = 'processing';
  errorMessage.value = '';

  if (!hasRuntime.value) {
    applySummary(createDemoEdgeTabSummary());
    return;
  }

  try {
    const response = await runtime?.runtime?.sendMessage?.({ type: 'POPUP_IMPORT_EDGE_TABS' }) as
      | { ok?: boolean; summary?: EdgeTabImportSummary; error?: string }
      | undefined;

    if (!response?.ok || !response.summary) {
      currentStatus.value = 'error';
      errorMessage.value = response?.error ?? 'Edge tab import failed.';
      return;
    }

    applySummary(response.summary);
  } catch (error) {
    currentStatus.value = 'error';
    errorMessage.value = String(error);
  }
};

const onConfigClick = async () => {
  if (!runtime?.runtime?.getURL || !runtime?.tabs?.create) return;
  await runtime.tabs.create({ url: runtime.runtime.getURL('/prompt-panel.html') });
};

const warmStart = async () => {
  if (!hasRuntime.value) {
    applySummary(createDemoEdgeTabSummary());
    return;
  }

  const cached = await runtime?.runtime?.sendMessage?.({ type: 'POPUP_GET_LAST_EDGE_TABS' }) as
    | { ok?: boolean; summary?: EdgeTabImportSummary | null }
    | undefined;
  if (cached?.ok && cached.summary) {
    applySummary(cached.summary);
  }
  await refreshTabs();
};

const copyDigest = async () => {
  if (!inputData.value.trim()) return;
  try {
    await navigator.clipboard.writeText(inputData.value);
  } catch {
    // Clipboard write is a best-effort UX helper.
  }
};

onMounted(() => {
  void warmStart();
});
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;400;600&display=swap');

body {
  font-family: 'Outfit', sans-serif;
  margin: 0;
  width: 400px;
  height: 560px;
}
</style>
