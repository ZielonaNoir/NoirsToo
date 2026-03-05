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
