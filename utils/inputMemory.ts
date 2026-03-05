import type { InputMemoryItem } from '../types';

const STORAGE_KEY = 'dragonfill_recent_inputs';
const MAX_ITEMS = 5;

/**
 * 保存输入到记忆
 */
export const saveToMemory = (content: string, type: 'text' | 'vision' = 'text'): void => {
  const item: InputMemoryItem = {
    id: Date.now().toString(),
    content,
    timestamp: Date.now(),
    type,
    preview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
  };
  
  const existing = getRecentInputs();
  const updated = [item, ...existing].slice(0, MAX_ITEMS);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

/**
 * 获取最近的输入记录
 */
export const getRecentInputs = (): InputMemoryItem[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

/**
 * 清空记忆
 */
export const clearMemory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
