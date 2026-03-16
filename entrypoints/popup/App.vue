<template>
  <div class="w-[400px] min-h-[500px] relative overflow-hidden font-sans text-white select-none">
    <!-- 流体背景 -->
    <FluidBackground />
    
    <div class="relative z-10 flex flex-col h-full p-8 space-y-8">
      <!-- 顶部：情绪状态指示器 -->
      <div class="flex-none flex justify-center pt-4">
        <EmotionalStatus :status="currentStatus" />
      </div>

      <!-- 中部：呼吸输入区 -->
      <div class="flex-1 min-h-[140px] flex flex-col justify-center">
        <div 
          class="transition-all duration-700 delay-100 transform"
          :class="currentStatus === 'processing' ? 'scale-95 opacity-50 blur-sm' : 'scale-100 opacity-100'"
        >
          <MoodInput 
            v-model="inputData" 
            @focus="isFocused = true"
            @blur="isFocused = false"
          />
        </div>
      </div>

      <!-- 底部：悬浮操作区 -->
      <div class="flex-none space-y-4 pb-4">
        <LevitatingButton 
          :disabled="!isValid || currentStatus === 'processing'"
          @click="handleAction"
        >
          <span v-if="currentStatus === 'processing'">Synthesizing...</span>
          <span v-else-if="currentStatus === 'success'">Harmony Restored</span>
          <span v-else>Initiate Fusion</span>
        </LevitatingButton>
        
        <!-- 隐形页脚 -->
        <div class="flex justify-between items-center px-2 opacity-30 hover:opacity-80 transition-opacity duration-500 text-[10px] tracking-widest uppercase">
          <span>DragonFill v0.1</span>
          <button class="hover:text-mood-active transition-colors" @click="onConfigClick">
            Config
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FluidBackground from '../../components/FluidBackground.vue';
import EmotionalStatus from '../../components/EmotionalStatus.vue';
import MoodInput from '../../components/MoodInput.vue';
import LevitatingButton from '../../components/LevitatingButton.vue';

// 状态管理
const inputData = ref('');
const currentStatus = ref<'idle' | 'processing' | 'success' | 'error'>('idle');
const isFocused = ref(false);

const isValid = computed(() => inputData.value.length > 0);

// 模拟处理逻辑
const handleAction = async () => {
  if (!isValid.value) return;

  // #region agent log
  const hasSendMessage = typeof (window as any).browser?.runtime?.sendMessage === 'function';
  const payloadA = {sessionId:'bbfbad',hypothesisId:'A',location:'popup/App.vue:handleAction',message:'Initiate Fusion clicked',data:{inputLen:inputData.value.length,sendMessageCalled:false,hasRuntimeSendMessage:hasSendMessage},timestamp:Date.now()};
  console.log('[debug-bbfbad]', payloadA);
  fetch('http://127.0.0.1:7935/ingest/e6b84f40-6e4b-456c-b127-22dda23138dc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bbfbad'},body:JSON.stringify(payloadA)}).catch(()=>{});
  // #endregion

  currentStatus.value = 'processing';
  
  // 模拟 AI 思考延迟
  setTimeout(() => {
    // 随机成功/失败演示
    if (Math.random() > 0.1) {
      currentStatus.value = 'success';
    } else {
      currentStatus.value = 'error';
    }

    // 自动重置
    setTimeout(() => {
      currentStatus.value = 'idle';
      inputData.value = '';
    }, 3000);
  }, 2000);
};

// #region agent log
const onConfigClick = () => {
  const payloadB = {sessionId:'bbfbad',hypothesisId:'B',location:'popup/App.vue:Config',message:'Config clicked (no other handler)',data:{hasConfigRoute:false},timestamp:Date.now()};
  console.log('[debug-bbfbad]', payloadB);
  fetch('http://127.0.0.1:7935/ingest/e6b84f40-6e4b-456c-b127-22dda23138dc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bbfbad'},body:JSON.stringify(payloadB)}).catch(()=>{});
};
// #endregion
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;400;600&display=swap');

body {
  font-family: 'Outfit', sans-serif;
  margin: 0;
  width: 400px;
  height: 500px;
}
</style>
