export type PickState = 'idle' | 'picking' | 'selected' | 'injecting' | 'done' | 'error';

export interface PickedField {
  selector: string;
  type: string;
  name?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  value?: string;
}

export interface TargetNode {
  selector: string;
  xpath: string;
  domPath: string[];
  boundingBox: { x: number; y: number; width: number; height: number };
  tagName: string;
  fields: PickedField[];
}

export interface PickSession {
  sessionId: string;
  tabId: number;
  state: PickState;
  targetNode?: TargetNode;
  lastError?: string;
  updatedAt: number;
  selectionHistory?: TargetNode[];
}

export type TagType = 'entity' | 'intent' | 'constraint' | 'style' | 'tone' | 'risk';

export interface TagNode {
  id: string;
  level: 'small' | 'macro';
  label: string;
  type: TagType;
  weight: number;
  confidence: number;
  sourceSpan?: string;
  enabled: boolean;
  children: string[];
  x?: number;
  y?: number;
}

export interface PromptAtom {
  id: string;
  layer: 'context' | 'task' | 'constraints' | 'style' | 'output_schema';
  text: string;
  tagRefs: string[];
  enabled: boolean;
}

export interface OptimizationIteration {
  index: number;
  prompt: string;
  score: number;
  reason: string;
}

export interface OptimizationRun {
  runId: string;
  input: string;
  target: string;
  iterations: OptimizationIteration[];
  bestPrompt: string;
  score: number;
}

export type RuntimeEventType =
  | 'PICK_START'
  | 'PICK_HOVER'
  | 'PICK_SELECT'
  | 'PICK_STOP'
  | 'INJECT_REQUEST'
  | 'INJECT_RESULT'
  | 'LLM_REQUEST'
  | 'LLM_RESULT'
  | 'EVAL_RUN'
  | 'EVAL_RESULT'
  | 'RISK_BLOCKED'
  | 'AUDIT_LOGGED'
  | 'ERROR';

export interface RuntimeEventMessage {
  type: 'PICK_EVENT';
  tabId: number;
  event: RuntimeEventType;
  payload?: unknown;
  timestamp?: number;
  state?: PickState;
  traceId?: string;
}

export interface InjectResultPayload {
  mode: 'empty-only' | 'force';
  filled: number;
  skipped: number;
  total: number;
  durationMs: number;
  riskFlags?: string[];
}

export interface GraphSnapshot {
  version: number;
  provider?: LLMProviderKind;
  smallTags: TagNode[];
  macroTags: TagNode[];
  prompt: string;
  evalHistory?: EvalRun[];
  riskFlags?: string[];
  updatedAt: number;
}

export type LLMTaskType = 'extract' | 'merge' | 'atomize' | 'optimize';

export type LLMProviderKind = 'openai' | 'gemini' | 'heuristic' | 'qwen';

export interface LLMTaskPayload {
  input: string;
  target?: string;
  tags?: TagNode[];
  prompt?: string;
  constraints?: string[];
}

export interface ProviderResult {
  provider: LLMProviderKind;
  taskType: LLMTaskType;
  output: string;
  json?: unknown;
  error?: string;
  recoverable?: boolean;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs: number;
  traceId: string;
  fallbackUsed?: boolean;
  attempt?: number;
}

export interface LLMRun {
  traceId: string;
  taskType: LLMTaskType;
  startedAt: number;
  completedAt: number;
  primary: ProviderResult;
  fallback?: ProviderResult;
  attempts?: number;
}

export interface EvalRubric {
  requiredTerms?: string[];
  bannedTerms?: string[];
  mustContainSections?: string[];
}

export interface EvalRun {
  evalId: string;
  candidate: string;
  target: string;
  rubric?: EvalRubric;
  structureScore: number;
  semanticScore: number;
  constraintScore: number;
  overallScore: number;
  reasons: string[];
  createdAt: number;
}

export interface RiskCheckResult {
  blocked: boolean;
  reason?: string;
  fieldSelector?: string;
  confidence: number;
  riskFlags: string[];
}

export interface PromptRunOptions {
  maxIterations?: number;
  provider?: LLMProviderKind;
  rubric?: EvalRubric;
  sessionId?: string;
  tabId?: number;
}

export interface PromptOrchestratorResult {
  smallTags: TagNode[];
  atoms: PromptAtom[];
  optimization: OptimizationRun;
  evalHistory: EvalRun[];
  llmRuns: LLMRun[];
}

export interface LLMBudgetSnapshot {
  minuteWindowKey: string;
  requests: number;
  maxRequestsPerMinute: number;
  estimatedCostUsd: number;
  maxCostUsdPerMinute: number;
  blocked: boolean;
}

export type AuditEventType =
  | 'tabs_import'
  | 'pick_start'
  | 'pick_select'
  | 'inject_request'
  | 'inject_result'
  | 'llm_request'
  | 'llm_result'
  | 'eval_result'
  | 'risk_blocked'
  | 'error';

export interface AuditLogEvent {
  eventType: AuditEventType;
  tabId?: number;
  sessionId?: string;
  traceId?: string;
  state?: PickState;
  provider?: LLMProviderKind;
  latencyMs?: number;
  costUsd?: number;
  payload?: Record<string, unknown>;
  riskFlags?: string[];
  createdAt: number;
}

export interface PromptDatasetItem {
  id?: string;
  dataset: string;
  input: string;
  target: string;
  rubric?: EvalRubric;
  version: string;
  createdAt?: string;
}

export interface PromptEvalRecord {
  id?: string;
  runId: string;
  dataset: string;
  provider: LLMProviderKind;
  prompt: string;
  score: number;
  traceId: string;
  tabId?: number;
  sessionId?: string;
  createdAt?: string;
}
