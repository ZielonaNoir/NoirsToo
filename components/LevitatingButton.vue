<template>
  <button
    ref="btnRef"
    :disabled="disabled"
    class="relative group w-full py-4 rounded-xl overflow-hidden transition-all duration-300 ease-out transform"
    :class="[
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
    ]"
    :style="buttonStyle"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- 背景层 -->
    <div class="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-colors duration-300" />
    
    <!-- 悬停光效 -->
    <div 
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shine"
    />

    <!-- 内容层 -->
    <div class="relative z-10 flex items-center justify-center gap-2 text-white/90 font-light tracking-widest text-sm uppercase">
      <slot />
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { gsap } from 'gsap';

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits(['click']);
const btnRef = ref<HTMLElement | null>(null);

// 磁性效果状态
const tx = ref(0);
const ty = ref(0);

const buttonStyle = computed(() => ({
  transform: `translate(${tx.value}px, ${ty.value}px)`
}));

const handleMouseMove = (e: MouseEvent) => {
  if (props.disabled || !btnRef.value) return;
  
  const rect = btnRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  
  // 磁力强度
  const strength = 15;
  
  gsap.to(tx, { value: x / strength, duration: 0.3 });
  gsap.to(ty, { value: y / strength, duration: 0.3 });
};

const handleMouseLeave = () => {
  gsap.to(tx, { value: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
  gsap.to(ty, { value: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
};

const handleClick = (e: MouseEvent) => {
  if (props.disabled) return;
  emit('click', e);
  
  // 点击涟漪效果（简化版：缩放回弹）
  gsap.fromTo(btnRef.value, 
    { scale: 0.95 }, 
    { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
  );
};
</script>
