<template>
  <div class="relative flex flex-col items-center justify-center p-4">
    <!-- 情绪光球 -->
    <div 
      class="relative w-16 h-16 rounded-full transition-all duration-1000 ease-in-out"
      :class="orbClasses"
    >
      <!-- 核心光亮 -->
      <div 
        class="absolute inset-0 rounded-full blur-md opacity-80"
        :class="coreClasses"
      />
      
      <!-- 内部脉冲 -->
      <div 
        class="absolute inset-2 rounded-full blur-sm opacity-90 animate-pulse-slow bg-white"
        style="mix-blend-mode: overlay;"
      />
      
      <!-- 状态图标 (Iconify) -->
      <div class="absolute inset-0 flex items-center justify-center text-white/90 z-10 transition-transform duration-500">
        <Icon
          :icon="currentIcon"
          width="24"
        />
      </div>
    </div>
    
    <!-- 状态文字 -->
    <div 
      class="mt-4 text-xs tracking-[0.2em] uppercase font-light text-white/50 transition-opacity duration-500"
    >
      {{ label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  status: 'idle' | 'processing' | 'success' | 'error';
}>();

// 状态配置映射
const statusConfig = {
  idle: {
    orb: 'bg-mood-calm shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] animate-float',
    core: 'bg-indigo-300',
    icon: 'ph:sparkle-thin',
    label: 'Awaiting Input'
  },
  processing: {
    orb: 'bg-mood-active shadow-[0_0_50px_-10px_rgba(139,92,246,0.8)] animate-spin [animation-duration:3s]',
    core: 'bg-violet-300',
    icon: 'ph:circle-notch-light',
    label: 'Synthesizing'
  },
  success: {
    orb: 'bg-mood-success shadow-[0_0_40px_-5px_rgba(16,185,129,0.7)] animate-bounce',
    core: 'bg-emerald-300',
    icon: 'ph:check-thin',
    label: 'Harmonized'
  },
  error: {
    orb: 'bg-mood-error shadow-[0_0_40px_-5px_rgba(244,63,94,0.7)] animate-pulse',
    core: 'bg-rose-300',
    icon: 'ph:warning-thin',
    label: 'Dissonance'
  }
};

const currentConfig = computed(() => statusConfig[props.status]);
const orbClasses = computed(() => currentConfig.value.orb);
const coreClasses = computed(() => currentConfig.value.core);
const currentIcon = computed(() => currentConfig.value.icon);
const label = computed(() => currentConfig.value.label);
</script>
