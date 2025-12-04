<script setup lang="ts">
interface Props {
  size?: number
  animate?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 48,
  animate: true
})
</script>

<template>
  <div 
    class="crown-logo" 
    :class="{ 'crown-logo--animated': animate }"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg 
      viewBox="0 0 64 64" 
      :width="size" 
      :height="size"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0077b6"/>
          <stop offset="50%" stop-color="#00b4d8"/>
          <stop offset="100%" stop-color="#48cae4"/>
        </linearGradient>
        <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#005f8a"/>
          <stop offset="50%" stop-color="#0077b6"/>
          <stop offset="100%" stop-color="#005f8a"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Crown Base -->
      <path 
        class="crown-body"
        d="M12 44 L16 20 L24 32 L32 14 L40 32 L48 20 L52 44 Z" 
        fill="url(#crownGrad)" 
        stroke="#48cae4" 
        stroke-width="1"
      />
      
      <!-- Crown Jewels -->
      <circle class="jewel jewel-center" cx="32" cy="12" r="3" fill="#48cae4"/>
      <circle class="jewel jewel-left" cx="16" cy="18" r="2.5" fill="#00b4d8"/>
      <circle class="jewel jewel-right" cx="48" cy="18" r="2.5" fill="#00b4d8"/>
      
      <!-- Decorative dots -->
      <circle cx="24" cy="30" r="1.5" fill="#90e0ef"/>
      <circle cx="32" cy="26" r="1.5" fill="#90e0ef"/>
      <circle cx="40" cy="30" r="1.5" fill="#90e0ef"/>
      
      <!-- Wrapped Ribbon -->
      <path 
        class="ribbon ribbon-top"
        d="M8 42 Q12 38, 20 40 T32 38 T44 40 T56 42" 
        fill="none" 
        stroke="url(#ribbonGrad)" 
        stroke-width="4"
        stroke-linecap="round"
      />
      
      <!-- Ribbon Cross -->
      <path 
        class="ribbon ribbon-bottom"
        d="M10 48 Q18 44, 26 48 T42 44 T54 48" 
        fill="none" 
        stroke="url(#ribbonGrad)" 
        stroke-width="3"
        stroke-linecap="round"
      />
      
      <!-- Crown Base Band -->
      <rect x="12" y="44" width="40" height="6" rx="2" fill="url(#ribbonGrad)"/>
      
      <!-- Ribbon ends -->
      <path class="ribbon-end ribbon-end-left" d="M10 50 L6 58 L12 54 L14 50" fill="#0077b6"/>
      <path class="ribbon-end ribbon-end-right" d="M54 50 L58 58 L52 54 L50 50" fill="#0077b6"/>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.crown-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--animated {
    svg {
      filter: url(#glow);
      animation: crown-glow 2s ease-in-out infinite;
    }

    .jewel {
      animation: jewel-sparkle 1.5s ease-in-out infinite;
    }

    .jewel-center {
      animation-delay: 0s;
    }

    .jewel-left {
      animation-delay: 0.5s;
    }

    .jewel-right {
      animation-delay: 1s;
    }

    .ribbon-end {
      animation: ribbon-sway 3s ease-in-out infinite;
    }

    .ribbon-end-left {
      transform-origin: 14px 50px;
      animation-delay: 0s;
    }

    .ribbon-end-right {
      transform-origin: 50px 50px;
      animation-delay: 0.2s;
    }
  }
}

@keyframes crown-glow {
  0%, 100% {
    filter: drop-shadow(0 0 6px rgba(0, 119, 182, 0.6));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(72, 202, 228, 0.9));
  }
}

@keyframes jewel-sparkle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

@keyframes ribbon-sway {
  0%, 100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(3deg);
  }
}
</style>
