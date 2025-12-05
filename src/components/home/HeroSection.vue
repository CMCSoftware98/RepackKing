<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import TorrentLogo from '@/components/common/TorrentLogo.vue'
import SearchBar from './SearchBar.vue'
import { analyticsApi, type PublicStats } from '@/services/api'

const router = useRouter()
const searchQuery = ref('')
const isLoaded = ref(false)

// Stats
const stats = ref<PublicStats | null>(null)
const displayedGames = ref(0)
const displayedGenres = ref(0)
const displayedDownloads = ref(0)
const STATIC_DOWNLOADS = 100000 // Static download count

const handleSearch = (query: string) => {
  if (query.trim()) {
    router.push({ name: 'browse', query: { search: query } })
  }
}

// Animate number counting up
function animateNumber(
  target: number,
  setter: (val: number) => void,
  duration: number = 2000
) {
  const startTime = performance.now()
  const startValue = 0

  function update(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Easing function (ease-out cubic)
    const easeOut = 1 - Math.pow(1 - progress, 3)
    const current = Math.floor(startValue + (target - startValue) * easeOut)
    
    setter(current)
    
    if (progress < 1) {
      requestAnimationFrame(update)
    }
  }
  
  requestAnimationFrame(update)
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K'
  }
  return num.toLocaleString()
}

async function loadStats() {
  try {
    const response = await analyticsApi.getPublicStats()
    stats.value = response.data
    
    // Animate the numbers after a short delay
    setTimeout(() => {
      animateNumber(stats.value!.totalGames, (val) => displayedGames.value = val, 1500)
      animateNumber(stats.value!.totalGenres, (val) => displayedGenres.value = val, 1200)
      animateNumber(STATIC_DOWNLOADS, (val) => displayedDownloads.value = val, 1800)
    }, 600)
  } catch (error) {
    console.error('Failed to load stats:', error)
    // Set fallback values but still animate downloads
    displayedGames.value = 0
    displayedGenres.value = 0
    setTimeout(() => {
      animateNumber(STATIC_DOWNLOADS, (val) => displayedDownloads.value = val, 1800)
    }, 600)
  }
}

onMounted(() => {
  // Trigger entrance animations
  setTimeout(() => {
    isLoaded.value = true
  }, 100)
  
  loadStats()
})
</script>

<template>
  <section class="hero-section">
    <!-- Animated Wave Background -->
    <div class="hero-waves">
      <div class="wave wave-1"></div>
      <div class="wave wave-2"></div>
      <div class="wave wave-3"></div>
    </div>

    <!-- Floating particles -->
    <div class="hero-particles">
      <div v-for="n in 20" :key="n" class="particle" :style="{
        '--delay': `${Math.random() * 5}s`,
        '--duration': `${10 + Math.random() * 10}s`,
        '--x': `${Math.random() * 100}%`,
        '--size': `${2 + Math.random() * 4}px`
      }"></div>
    </div>

    <!-- Content -->
    <v-container class="hero-content" style="max-width: 1400px;">
      <div class="hero-inner" :class="{ 'is-loaded': isLoaded }">
        <!-- Animated Logo -->
        <div class="hero-logo">
          <TorrentLogo :size="80" :animate="true" />
        </div>

        <!-- Title -->
        <h1 class="hero-title">
          <span class="title-discover">Discover Your Next</span>
          <span class="title-adventure gradient-text">Gaming Adventure</span>
        </h1>

        <!-- Subtitle -->
        <p class="hero-subtitle">
          Search through thousands of games. Find your perfect match.
        </p>

        <!-- Search Bar -->
        <div class="hero-search">
          <SearchBar
            v-model="searchQuery"
            size="large"
            placeholder="Search for your favorite games..."
            @search="handleSearch"
          />
        </div>

        <!-- Quick Stats -->
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-value">{{ formatNumber(displayedGames) }}</span>
            <span class="stat-label">Games</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-value">{{ displayedGenres }}</span>
            <span class="stat-label">Genres</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-value">{{ formatNumber(displayedDownloads) }}+</span>
            <span class="stat-label">Downloads</span>
          </div>
        </div>
      </div>
    </v-container>

    <!-- Scroll indicator -->
    <div class="scroll-indicator" :class="{ 'is-visible': isLoaded }">
      <v-icon class="scroll-icon">mdi-chevron-double-down</v-icon>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 6rem 0 4rem;
}

// Animated Wave Background
.hero-waves {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.wave {
  position: absolute;
  width: 200%;
  height: 100%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 255, 135, 0.03) 50%,
    rgba(96, 239, 255, 0.05) 100%
  );
  border-radius: 40%;

  &.wave-1 {
    bottom: -60%;
    left: -50%;
    animation: wave 15s linear infinite;
    opacity: 0.5;
  }

  &.wave-2 {
    bottom: -70%;
    left: -50%;
    animation: wave 20s linear infinite reverse;
    opacity: 0.3;
  }

  &.wave-3 {
    bottom: -80%;
    left: -50%;
    animation: wave 25s linear infinite;
    opacity: 0.2;
  }
}

@keyframes wave {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

// Floating particles
.hero-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.particle {
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: radial-gradient(circle, #00ff87 0%, transparent 70%);
  border-radius: 50%;
  left: var(--x);
  bottom: -10px;
  animation: float-up var(--duration) linear infinite;
  animation-delay: var(--delay);
  opacity: 0.4;
}

@keyframes float-up {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.4;
  }
  90% {
    opacity: 0.4;
  }
  100% {
    transform: translateY(-100vh) scale(0.5);
    opacity: 0;
  }
}

// Content
.hero-content {
  position: relative;
  z-index: 1;
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  
  > * {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &.is-loaded > * {
    opacity: 1;
    transform: translateY(0);

    @for $i from 1 through 6 {
      &:nth-child(#{$i}) {
        transition-delay: #{$i * 0.1}s;
      }
    }
  }
}

.hero-logo {
  margin-bottom: 1.5rem;
}

.hero-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;

  .title-discover {
    display: block;
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 0.25rem;
  }

  .title-adventure {
    display: block;
    font-size: clamp(2.5rem, 7vw, 4.5rem);
  }
}

.hero-subtitle {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: rgba(255, 255, 255, 0.7);
  max-width: 500px;
  margin-bottom: 2.5rem;
}

.hero-search {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 3rem;
  padding: 0 1rem;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 480px) {
    gap: 1rem;
  }
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;

  &-value {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(1.25rem, 3vw, 1.75rem);
    font-weight: 700;
    color: #00ff87;
    min-width: 60px;
  }

  &-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  &-divider {
    width: 1px;
    height: 40px;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(0, 255, 135, 0.4) 50%,
      transparent 100%
    );
  }
}

// Scroll indicator
.scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.6s ease 1s;

  &.is-visible {
    opacity: 1;
  }
}

.scroll-icon {
  color: rgba(255, 255, 255, 0.4);
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(8px);
  }
  60% {
    transform: translateY(4px);
  }
}
</style>
