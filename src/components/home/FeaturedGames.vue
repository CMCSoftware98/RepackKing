<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Game } from '@/types/game'
import { getFeaturedGames } from '@/data/mockGames'
import GameCard from './GameCard.vue'
import GameCardSkeleton from '@/components/common/GameCardSkeleton.vue'
import ScrollReveal from '@/components/common/ScrollReveal.vue'

const featuredGames = ref<Game[]>([])
const isLoading = ref(true)

onMounted(async () => {
  // Simulate loading
  await new Promise(resolve => setTimeout(resolve, 800))
  featuredGames.value = getFeaturedGames()
  isLoading.value = false
})
</script>

<template>
  <section class="featured-games section">
    <v-container style="max-width: 1400px;">
      <ScrollReveal animation="fade-up">
        <div class="section-header">
          <div class="section-title-wrapper">
            <v-icon class="section-icon" size="32">mdi-star-shooting</v-icon>
            <h2 class="section-title">Featured Games</h2>
          </div>
          <p class="section-subtitle">Handpicked titles we think you'll love</p>
        </div>
      </ScrollReveal>

      <!-- Games Grid -->
      <div class="games-grid">
        <template v-if="isLoading">
          <GameCardSkeleton v-for="n in 5" :key="n" />
        </template>
        
        <template v-else>
          <ScrollReveal
            v-for="(game, index) in featuredGames"
            :key="game.id"
            animation="fade-up"
            :delay="index * 100"
          >
            <GameCard :game="game" :index="index" />
          </ScrollReveal>
        </template>
      </div>

      <!-- View All Button -->
      <ScrollReveal animation="fade-up" :delay="500">
        <div class="view-all-wrapper">
          <v-btn
            variant="outlined"
            color="primary"
            size="large"
            class="view-all-btn"
            to="/browse"
          >
            View All Games
            <v-icon class="ml-2">mdi-arrow-right</v-icon>
          </v-btn>
        </div>
      </ScrollReveal>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
.featured-games {
  position: relative;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.section-icon {
  color: #ffc107;
}

.section-title {
  font-family: 'Montserrat', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  color: #ffffff;
}

.section-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
}

.view-all-wrapper {
  display: flex;
  justify-content: center;
}

.view-all-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
  border-width: 2px;

  &:hover {
    background: rgba(0, 119, 182, 0.1);
  }
}
</style>
