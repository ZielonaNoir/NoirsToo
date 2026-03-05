<template>
  <div class="fixed inset-0 w-full h-full overflow-hidden bg-ether-dark -z-10">
    <!-- 动态光斑层 -->
    <div class="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
    <div class="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
    <div class="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
    
    <!-- 噪点纹理层 (SVG Filter) -->
    <div class="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay filter contrast-150 brightness-150">
      <svg class="w-full h-full">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
    
    <!-- 玻璃态遮罩 -->
    <div class="absolute inset-0 backdrop-blur-[100px]"></div>
  </div>
</template>

<style scoped>
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
