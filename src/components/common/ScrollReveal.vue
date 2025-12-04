<script setup lang="ts">
import { useScrollAnimation } from '@/composables/useScrollAnimation'

interface Props {
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale'
  delay?: number
  duration?: number
  threshold?: number
  once?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  animation: 'fade-up',
  delay: 0,
  duration: 500,
  threshold: 0.1,
  once: true
})

const { elementRef, isVisible } = useScrollAnimation({
  threshold: props.threshold,
  once: props.once
})

const animationClass = {
  'fade-up': 'reveal-fade-up',
  'fade-down': 'reveal-fade-down',
  'fade-left': 'reveal-fade-left',
  'fade-right': 'reveal-fade-right',
  'scale': 'reveal-scale'
}
</script>

<template>
  <div 
    ref="elementRef"
    class="scroll-reveal"
    :class="[animationClass[animation], { 'is-visible': isVisible }]"
    :style="{
      transitionDelay: `${delay}ms`,
      transitionDuration: `${duration}ms`
    }"
  >
    <slot />
  </div>
</template>

<style scoped lang="scss">
.scroll-reveal {
  transition-property: opacity, transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.reveal-fade-up {
  opacity: 0;
  transform: translateY(30px);

  &.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.reveal-fade-down {
  opacity: 0;
  transform: translateY(-30px);

  &.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.reveal-fade-left {
  opacity: 0;
  transform: translateX(30px);

  &.is-visible {
    opacity: 1;
    transform: translateX(0);
  }
}

.reveal-fade-right {
  opacity: 0;
  transform: translateX(-30px);

  &.is-visible {
    opacity: 1;
    transform: translateX(0);
  }
}

.reveal-scale {
  opacity: 0;
  transform: scale(0.9);

  &.is-visible {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
