import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isTestEnv = Boolean((import.meta as ImportMeta & { vitest?: unknown }).vitest) || import.meta.env.MODE === 'test';

const hasChromeStorage = typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);

if (!supabaseUrl || !supabaseAnonKey || isTestEnv) {
  console.warn('Supabase credentials not configured. Some features may be disabled.');
}

// 创建 Supabase 客户端
export const supabase = !isTestEnv && supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'dragonfill_auth',
        storage: hasChromeStorage
          ? {
              getItem: async (key: string) => {
                const result = await chrome.storage.local.get(key);
                return (result[key] as string) || null;
              },
              setItem: async (key: string, value: string) => {
                await chrome.storage.local.set({ [key]: value });
              },
              removeItem: async (key: string) => {
                await chrome.storage.local.remove(key);
              },
            }
          : undefined,
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;

// 用户订阅信息管理
export interface UserSubscription {
  tier: 'scale' | 'claw' | 'heart';
  energy_stones: number;
  unlimited: boolean;
}

export const getUserSubscription = async (): Promise<UserSubscription> => {
  if (!supabase) {
    // 未配置时返回默认免费版
    return {
      tier: 'scale',
      energy_stones: 5,
      unlimited: false,
    };
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      tier: 'scale',
      energy_stones: 5,
      unlimited: false,
    };
  }
  
  // TODO: 从数据库查询用户订阅信息
  // const { data, error } = await supabase
  //   .from('subscriptions')
  //   .select('*')
  //   .eq('user_id', user.id)
  //   .single();
  
  return {
    tier: 'scale',
    energy_stones: 5,
    unlimited: false,
  };
};

export const consumeEnergyStone = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // TODO: 实现能量石消耗逻辑
  // const { error } = await supabase.rpc('consume_energy_stone', { user_id: user.id });
  // return !error;
  
  return true;
};
