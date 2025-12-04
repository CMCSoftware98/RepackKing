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
          <svg viewBox="0 0 64 64" width="80" height="80" class="crown-spinner">
            <defs>
              <linearGradient id="loadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0077b6"/>
                <stop offset="50%" stop-color="#00b4d8"/>
                <stop offset="100%" stop-color="#48cae4"/>
              </linearGradient>
            </defs>
            <path 
              d="M12 44 L16 20 L24 32 L32 14 L40 32 L48 20 L52 44 Z" 
              fill="url(#loadGradient)"
            />
            <circle cx="32" cy="12" r="3" fill="#48cae4"/>
            <circle cx="16" cy="18" r="2.5" fill="#00b4d8"/>
            <circle cx="48" cy="18" r="2.5" fill="#00b4d8"/>
            <rect x="12" y="44" width="40" height="6" rx="2" fill="#0077b6"/>
          </svg>
        </div>
        <p class="loading-text">Loading RepackKing...</p>
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
  background: #0a1929 !important;
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
  background: #0a1929;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-logo {
  margin-bottom: 1.5rem;
}

.crown-spinner {
  animation: pulse-scale 1.5s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(0, 119, 182, 0.5));
}

@keyframes pulse-scale {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 20px rgba(0, 119, 182, 0.5));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 30px rgba(72, 202, 228, 0.7));
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
