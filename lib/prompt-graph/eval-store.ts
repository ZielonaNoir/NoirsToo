import { supabase } from '../supabase';
import type { EvalRun, LLMProviderKind, PromptDatasetItem, PromptEvalRecord } from '../../types/prompt-graph';

const LOCAL_DATASET_KEY = 'prompt-graph:datasets';
const LOCAL_EVAL_KEY = 'prompt-graph:eval-runs';

const canUseBrowserStorage = () => typeof browser !== 'undefined' && Boolean(browser.storage?.local);

export const upsertDatasetItem = async (item: PromptDatasetItem) => {
  if (supabase) {
    await supabase.from('prompt_graph_datasets').upsert({
      dataset: item.dataset,
      input: item.input,
      target: item.target,
      rubric: item.rubric ?? {},
      version: item.version,
    });
  }

  if (canUseBrowserStorage()) {
    const state = await browser.storage.local.get(LOCAL_DATASET_KEY);
    const existing = Array.isArray(state[LOCAL_DATASET_KEY]) ? (state[LOCAL_DATASET_KEY] as PromptDatasetItem[]) : [];
    const merged = [...existing.filter((entry) => !(entry.dataset === item.dataset && entry.version === item.version)), item];
    await browser.storage.local.set({ [LOCAL_DATASET_KEY]: merged.slice(-200) });
  }
};

export const persistEvalRun = async (
  run: EvalRun,
  meta: { runId: string; dataset: string; provider: LLMProviderKind; prompt: string; traceId: string; tabId?: number; sessionId?: string },
) => {
  const row: PromptEvalRecord = {
    runId: meta.runId,
    dataset: meta.dataset,
    provider: meta.provider,
    prompt: meta.prompt,
    score: run.overallScore,
    traceId: meta.traceId,
    tabId: meta.tabId,
    sessionId: meta.sessionId,
  };

  if (supabase) {
    await supabase.from('prompt_graph_eval_runs').insert({
      run_id: row.runId,
      dataset: row.dataset,
      provider: row.provider,
      prompt: row.prompt,
      score: row.score,
      trace_id: row.traceId,
      tab_id: row.tabId ?? null,
      session_id: row.sessionId ?? null,
      eval_payload: run,
    });
  }

  if (canUseBrowserStorage()) {
    const state = await browser.storage.local.get(LOCAL_EVAL_KEY);
    const existing = Array.isArray(state[LOCAL_EVAL_KEY]) ? (state[LOCAL_EVAL_KEY] as Array<PromptEvalRecord & { eval: EvalRun }>) : [];
    existing.push({ ...row, eval: run });
    await browser.storage.local.set({ [LOCAL_EVAL_KEY]: existing.slice(-500) });
  }
};
