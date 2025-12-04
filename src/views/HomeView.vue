<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HeroSection from '@/components/home/HeroSection.vue'
import FeaturedGames from '@/components/home/FeaturedGames.vue'
import CategoryGrid from '@/components/home/CategoryGrid.vue'
import RecentGames from '@/components/home/RecentGames.vue'

const isPageLoaded = ref(false)

onMounted(() => {
  isPageLoaded.value = true
})
</script>

<template>
  <div class="home-view" :class="{ 'is-loaded': isPageLoaded }">
    <!-- Hero Section with Search -->
    <HeroSection />

    <!-- Featured Games -->
    <FeaturedGames />

    <!-- Categories Grid -->
    <CategoryGrid />

    <!-- Recent Games -->
    <RecentGames />
  </div>
</template>

<style scoped lang="scss">
.home-view {
  min-height: 100vh;
  opacity: 0;
  transition: opacity 0.5s ease;

  &.is-loaded {
    opacity: 1;
  }
}
</style>
