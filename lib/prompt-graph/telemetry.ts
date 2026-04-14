import { supabase } from '../supabase';
import type { AuditLogEvent } from '../../types/prompt-graph';

const LOCAL_AUDIT_KEY = 'prompt-graph:audit-log';
const LOCAL_AUDIT_MAX = 300;

const canUseBrowserStorage = () => typeof browser !== 'undefined' && Boolean(browser.storage?.local);

const toSafePayload = (payload: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!payload) return undefined;

  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string' && value.length > 600) {
      clone[key] = `${value.slice(0, 600)}...[truncated]`;
      continue;
    }
    clone[key] = value;
  }
  return clone;
};

export const maskSensitiveText = (input: string): string => {
  if (!input) return input;
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted_email]')
    .replace(/\b\d{12,19}\b/g, '[redacted_card]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted_ssn]')
    .replace(/\b(?:\+?\d{1,3})?[-. (]*\d{3}[-. )]*\d{3}[-. ]*\d{4}\b/g, '[redacted_phone]');
};

const persistLocalAudit = async (event: AuditLogEvent) => {
  if (!canUseBrowserStorage()) return;
  const stored = await browser.storage.local.get(LOCAL_AUDIT_KEY);
  const existing = Array.isArray(stored[LOCAL_AUDIT_KEY]) ? (stored[LOCAL_AUDIT_KEY] as AuditLogEvent[]) : [];
  const merged = [...existing, event].slice(-LOCAL_AUDIT_MAX);
  await browser.storage.local.set({ [LOCAL_AUDIT_KEY]: merged });
};

const persistSupabaseAudit = async (event: AuditLogEvent) => {
  if (!supabase) return;
  const row = {
    event_type: event.eventType,
    tab_id: event.tabId ?? null,
    session_id: event.sessionId ?? null,
    trace_id: event.traceId ?? null,
    state: event.state ?? null,
    provider: event.provider ?? null,
    latency_ms: event.latencyMs ?? null,
    cost_usd: event.costUsd ?? null,
    risk_flags: event.riskFlags ?? [],
    payload: toSafePayload(event.payload),
    created_at: new Date(event.createdAt).toISOString(),
  };

  await supabase.from('prompt_graph_audit_logs').insert(row);
};

export const logAuditEvent = async (event: AuditLogEvent) => {
  try {
    await persistLocalAudit(event);
  } catch (error) {
    console.warn('[PromptGraph:audit] local persistence failed', error);
  }

  try {
    await persistSupabaseAudit(event);
  } catch (error) {
    console.warn('[PromptGraph:audit] supabase persistence failed', error);
  }
};

export const readRecentAuditEvents = async (): Promise<AuditLogEvent[]> => {
  if (!canUseBrowserStorage()) return [];
  const stored = await browser.storage.local.get(LOCAL_AUDIT_KEY);
  return Array.isArray(stored[LOCAL_AUDIT_KEY]) ? (stored[LOCAL_AUDIT_KEY] as AuditLogEvent[]) : [];
};
