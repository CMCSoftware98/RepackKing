<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const route = useRoute()
const isAppReady = ref(false)

const hideLayout = computed(() => route.meta.hideLayout === true)

onMounted(() => {
  // Small delay to ensure smooth initial render
  setTimeout(() => {
    isAppReady.value = true
  }, 50)
})
</script>

<template>
  <v-app class="app-root" :class="{ 'is-ready': isAppReady }">
    <!-- Loading Screen -->
    <Transition name="fade">
      <div v-if="!isAppReady" class="loading-screen">
        <div class="loading-logo">
          <svg viewBox="0 0 64 64" width="80" height="80" class="torrent-spinner">
            <defs>
              <linearGradient id="loadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00ff87"/>
                <stop offset="50%" stop-color="#00d4aa"/>
                <stop offset="100%" stop-color="#60efff"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="30" fill="rgba(0, 255, 135, 0.1)" stroke="url(#loadGradient)" stroke-width="2"/>
            <path 
              d="M12 10 L52 10 L52 20 L37 20 L37 54 L27 54 L27 20 L12 20 Z" 
              fill="url(#loadGradient)"
            />
            <path d="M32 24 L38 32 L34 32 L34 38 L30 38 L30 32 L26 32 Z" fill="#0a1a14" opacity="0.8"/>
            <path d="M32 40 L36 46 L33 46 L33 50 L31 50 L31 46 L28 46 Z" fill="#0a1a14" opacity="0.6"/>
          </svg>
        </div>
        <p class="loading-text">Loading TGames...</p>
      </div>
    </Transition>

    <!-- Navigation (hide on login page) -->
    <AppNavbar v-if="!hideLayout" />

    <!-- Main Content -->
    <v-main class="main-content">
      <router-view v-slot="{ Component, route: currentRoute }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="currentRoute.path" />
        </Transition>
      </router-view>
    </v-main>

    <!-- Footer (hide on login page) -->
    <AppFooter v-if="!hideLayout" />
  </v-app>
</template>

<style lang="scss">
.app-root {
  background: #0a1a14 !important;
  min-height: 100vh;
  opacity: 0;
  transition: opacity 0.3s ease;

  &.is-ready {
    opacity: 1;
  }
}

.main-content {
  background: transparent !important;
  display: flex;
  flex-direction: column;
}

// Loading Screen
.loading-screen {
  position: fixed;
  inset: 0;
  background: #0a1a14;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-logo {
  margin-bottom: 1.5rem;
}

.torrent-spinner {
  animation: pulse-scale 1.5s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(0, 255, 135, 0.5));
}

@keyframes pulse-scale {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 20px rgba(0, 255, 135, 0.5));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 30px rgba(96, 239, 255, 0.7));
  }
}

.loading-text {
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  animation: fade-pulse 1.5s ease-in-out infinite;
}

@keyframes fade-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

// Page transitions
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease-out;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

// Fade transition
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
