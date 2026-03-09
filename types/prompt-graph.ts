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

export type LLMProviderKind = 'openai' | 'gemini' | 'heuristic';

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
  tokensIn?: number;
  tokensOut?: number;
  latencyMs: number;
  traceId: string;
  fallbackUsed?: boolean;
}

export interface LLMRun {
  traceId: string;
  taskType: LLMTaskType;
  startedAt: number;
  completedAt: number;
  primary: ProviderResult;
  fallback?: ProviderResult;
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
}

export interface PromptOrchestratorResult {
  smallTags: TagNode[];
  atoms: PromptAtom[];
  optimization: OptimizationRun;
  evalHistory: EvalRun[];
  llmRuns: LLMRun[];
}
