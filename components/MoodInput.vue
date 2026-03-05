<template>
  <div class="relative group">
    <!-- 装饰光晕 -->
    <div class="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-0 group-focus-within:opacity-20 transition duration-1000 blur-lg group-focus-within:blur-xl"></div>
    
    <!-- 输入容器 -->
    <div class="relative bg-black/20 backdrop-blur-xl rounded-xl border border-white/5 transition-colors duration-300 group-focus-within:bg-black/40 group-focus-within:border-white/10">
      <textarea
        :value="modelValue"
        @input="handleInput"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
        class="w-full h-32 bg-transparent text-white/90 p-4 text-sm font-light leading-relaxed placeholder-white/20 resize-none outline-none custom-scrollbar"
        placeholder="Drop raw fragments here..."
      ></textarea>
      
      <!-- 字符计数 / 能量指示 -->
      <div class="absolute bottom-2 right-3 text-[10px] text-white/30 tracking-widest font-mono">
        {{ modelValue.length }} CHARS
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

const emit = defineEmits(['update:modelValue', 'focus', 'blur']);

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
</style>
