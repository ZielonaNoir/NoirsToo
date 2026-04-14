export interface MappingResult {
  field: string;           // DOM selector or element reference
  value: string;           // Value to fill
  confidence: number;      // AI confidence score (0-1)
  reasoning?: string;      // AI's explanation for the mapping
}

export interface FormField {
  selector: string;        // CSS selector
  label?: string;          // Associated label text
  placeholder?: string;    // Placeholder text
  type: string;            // Input type (text, email, tel, etc.)
  name?: string;           // Name attribute
  id?: string;             // ID attribute
  required: boolean;       // If field is required
}

export interface FormSchema {
  url: string;             // Page URL
  fields: FormField[];     // All detected form fields
  framework?: 'react' | 'vue' | 'native' | 'unknown';
}

export interface UserSubscription {
  tier: 'scale' | 'claw' | 'heart';  // Membership level
  energy_stones: number;              // Remaining credits
  unlimited: boolean;                 // If unlimited usage
}

export interface InputMemoryItem {
  id: string;
  content: string;
  timestamp: number;
  type: 'text' | 'vision';
  preview?: string;        // Truncated preview for UI
}

export interface VortexAnimationConfig {
  duration: number;
  particles: number;
  centerX: number;
  centerY: number;
}

export interface BreathingConfig {
  frequency: number;       // Hz (default 0.5 = 2s period)
  minScale: number;        // Minimum scale factor
  maxScale: number;        // Maximum scale factor
}

export type ImportedTabCategory =
  | 'ai'
  | 'code'
  | 'docs'
  | 'research'
  | 'productivity'
  | 'communication'
  | 'design'
  | 'shopping'
  | 'video'
  | 'social'
  | 'general';

export interface BrowserTabCandidate {
  id?: number;
  index?: number;
  windowId?: number;
  title?: string;
  url?: string;
  active?: boolean;
  pinned?: boolean;
  audible?: boolean;
  discarded?: boolean;
  favIconUrl?: string;
}

export interface ImportedEdgeTab {
  id: number;
  index: number;
  windowId: number;
  title: string;
  url: string;
  cleanUrl: string;
  domain: string;
  path: string;
  category: ImportedTabCategory;
  keywords: string[];
  active: boolean;
  pinned: boolean;
  audible: boolean;
  duplicateCount: number;
  summary: string;
}

export interface EdgeTabImportSummary {
  importedAt: number;
  sourceBrowser: 'edge';
  totalTabs: number;
  cleanedTabs: number;
  duplicateTabs: number;
  activeTabId?: number;
  digest: string;
  categories: Array<{ category: ImportedTabCategory; count: number }>;
  domains: Array<{ domain: string; count: number }>;
  tabs: ImportedEdgeTab[];
}
