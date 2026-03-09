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
}

export interface TagNode {
  id: string;
  level: 'small' | 'macro';
  label: string;
  type: 'entity' | 'intent' | 'constraint' | 'style' | 'tone' | 'risk';
  weight: number;
  confidence: number;
  sourceSpan?: string;
  enabled: boolean;
  children: string[];
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

export interface RuntimeEventMessage {
  type: 'PICK_EVENT';
  tabId: number;
  event:
    | 'PICK_START'
    | 'PICK_HOVER'
    | 'PICK_SELECT'
    | 'PICK_STOP'
    | 'INJECT_REQUEST'
    | 'INJECT_RESULT'
    | 'ERROR';
  payload?: unknown;
}
