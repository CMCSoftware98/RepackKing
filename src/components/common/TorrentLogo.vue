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
    class="torrent-logo" 
    :class="{ 'torrent-logo--animated': animate }"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg 
      viewBox="0 0 64 64" 
      :width="size" 
      :height="size"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="torrentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00ff87"/>
          <stop offset="50%" stop-color="#00d4aa"/>
          <stop offset="100%" stop-color="#60efff"/>
        </linearGradient>
        <linearGradient id="torrentGradDark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00b36b"/>
          <stop offset="50%" stop-color="#00ff87"/>
          <stop offset="100%" stop-color="#00b36b"/>
        </linearGradient>
        <filter id="torrentGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- Arrow pattern for torrent effect -->
        <clipPath id="tShape">
          <path d="M8 8 L56 8 L56 18 L37 18 L37 56 L27 56 L27 18 L8 18 Z"/>
        </clipPath>
      </defs>
      
      <!-- Background circle with glow -->
      <circle 
        class="logo-bg"
        cx="32" 
        cy="32" 
        r="30" 
        fill="rgba(0, 255, 135, 0.1)"
        stroke="url(#torrentGrad)"
        stroke-width="2"
      />
      
      <!-- Main T letter with torrent styling -->
      <g class="t-letter">
        <!-- T base shape -->
        <path 
          class="t-body"
          d="M12 10 L52 10 L52 20 L37 20 L37 54 L27 54 L27 20 L12 20 Z" 
          fill="url(#torrentGrad)"
        />
        
        <!-- Download arrows inside T (torrent symbol) -->
        <g class="torrent-arrows">
          <!-- Top arrow -->
          <path 
            class="arrow arrow-1"
            d="M32 24 L38 32 L34 32 L34 38 L30 38 L30 32 L26 32 Z" 
            fill="#0a1a14"
            opacity="0.8"
          />
          <!-- Bottom arrow -->
          <path 
            class="arrow arrow-2"
            d="M32 40 L36 46 L33 46 L33 50 L31 50 L31 46 L28 46 Z" 
            fill="#0a1a14"
            opacity="0.6"
          />
        </g>
      </g>
      
      <!-- Orbiting data particles -->
      <g class="data-particles">
        <circle class="particle p1" cx="32" cy="4" r="2" fill="#00ff87"/>
        <circle class="particle p2" cx="58" cy="32" r="2" fill="#60efff"/>
        <circle class="particle p3" cx="32" cy="60" r="2" fill="#00d4aa"/>
        <circle class="particle p4" cx="6" cy="32" r="2" fill="#00ff87"/>
      </g>
      
      <!-- Speed lines -->
      <g class="speed-lines" opacity="0.4">
        <line x1="4" y1="12" x2="10" y2="12" stroke="#00ff87" stroke-width="1"/>
        <line x1="2" y1="16" x2="8" y2="16" stroke="#60efff" stroke-width="1"/>
        <line x1="54" y1="48" x2="60" y2="48" stroke="#00ff87" stroke-width="1"/>
        <line x1="56" y1="52" x2="62" y2="52" stroke="#60efff" stroke-width="1"/>
      </g>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.torrent-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--animated {
    svg {
      filter: url(#torrentGlow);
      animation: torrent-glow 2s ease-in-out infinite;
    }

    .particle {
      animation: orbit 3s linear infinite;
    }

    .p1 { animation-delay: 0s; }
    .p2 { animation-delay: 0.75s; }
    .p3 { animation-delay: 1.5s; }
    .p4 { animation-delay: 2.25s; }

    .arrow {
      animation: arrow-pulse 1.5s ease-in-out infinite;
    }

    .arrow-1 {
      animation-delay: 0s;
    }

    .arrow-2 {
      animation-delay: 0.3s;
    }

    .speed-lines {
      animation: speed-flash 2s ease-in-out infinite;
    }

    .logo-bg {
      animation: bg-pulse 2s ease-in-out infinite;
    }
  }
}

@keyframes torrent-glow {
  0%, 100% {
    filter: drop-shadow(0 0 6px rgba(0, 255, 135, 0.6));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(96, 239, 255, 0.9));
  }
}

@keyframes orbit {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes arrow-pulse {
  0%, 100% {
    opacity: 0.8;
    transform: translateY(0);
  }
  50% {
    opacity: 0.4;
    transform: translateY(2px);
  }
}

@keyframes speed-flash {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes bg-pulse {
  0%, 100% {
    fill: rgba(0, 255, 135, 0.1);
  }
  50% {
    fill: rgba(0, 255, 135, 0.15);
  }
}
</style>
