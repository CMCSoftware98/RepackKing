<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gamesApi, getImageUrl, formatSize, type Game } from '@/services/api'
import GameCardSkeleton from '@/components/common/GameCardSkeleton.vue'
import ScrollReveal from '@/components/common/ScrollReveal.vue'

const router = useRouter()
const games = ref<Game[]>([])
const isLoading = ref(true)
const imageLoaded = ref<Record<number, boolean>>({})

function onImageLoad(gameId: number) {
  imageLoaded.value[gameId] = true
}

function navigateToGame(slug: string) {
  router.push(`/game/${slug}`)
}

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return '#4caf50'
  if (rating >= 4.0) return '#8bc34a'
  if (rating >= 3.5) return '#ffc107'
  if (rating >= 3.0) return '#ff9800'
  return '#f44336'
}

onMounted(async () => {
  try {
    const response = await gamesApi.list({ page: 1, limit: 10 })
    games.value = response.data.games
  } catch (error) {
    console.error('Failed to load recent games:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="recent-games section">
    <v-container style="max-width: 1400px;">
      <ScrollReveal animation="fade-up">
        <div class="section-header">
          <div class="section-title-wrapper">
            <v-icon class="section-icon" size="32">mdi-clock-outline</v-icon>
            <h2 class="section-title">Recently Added</h2>
          </div>
          <p class="section-subtitle">The latest additions to our collection</p>
        </div>
      </ScrollReveal>

      <!-- Games Grid -->
      <div class="games-grid">
        <template v-if="isLoading">
          <GameCardSkeleton v-for="n in 10" :key="n" />
        </template>
        
        <template v-else-if="games.length === 0">
          <div class="empty-state">
            <v-icon size="64" color="grey">mdi-gamepad-variant-outline</v-icon>
            <p class="mt-4 text-medium-emphasis">No games added yet</p>
          </div>
        </template>

        <template v-else>
          <ScrollReveal
            v-for="(game, index) in games"
            :key="game.id"
            animation="fade-up"
            :delay="index * 80"
          >
            <article 
              class="game-card"
              @click="navigateToGame(game.slug)"
            >
              <!-- Image Container -->
              <div class="game-card__image-container">
                <div v-if="!imageLoaded[game.id]" class="game-card__image-skeleton skeleton-shimmer"></div>
                <img 
                  :src="getImageUrl(game.cover_image)" 
                  :alt="game.title"
                  class="game-card__image"
                  :class="{ 'is-loaded': imageLoaded[game.id] }"
                  loading="lazy"
                  @load="onImageLoad(game.id)"
                />
                
                <!-- Rating Badge -->
                <div 
                  v-if="game.rating && game.rating.count > 0" 
                  class="game-card__rating" 
                  :style="{ backgroundColor: getRatingColor(game.rating.average) }"
                >
                  <v-icon size="12" class="mr-1">mdi-star</v-icon>
                  {{ game.rating.average.toFixed(1) }}
                </div>
                
                <!-- Overlay -->
                <div class="game-card__overlay">
                  <v-btn
                    class="game-card__play-btn"
                    icon
                    size="large"
                    color="primary"
                  >
                    <v-icon size="28">mdi-play</v-icon>
                  </v-btn>
                </div>
              </div>

              <!-- Content -->
              <div class="game-card__content">
                <h3 class="game-card__title">{{ game.title }}</h3>
                
                <!-- Genres -->
                <div v-if="game.genres && game.genres.length > 0" class="game-card__genres">
                  <v-chip
                    v-for="genre in game.genres.slice(0, 2)"
                    :key="genre"
                    size="x-small"
                    class="game-card__genre"
                  >
                    {{ genre }}
                  </v-chip>
                </div>

                <!-- Footer -->
                <div class="game-card__footer">
                  <div v-if="game.version" class="game-card__version">
                    <v-icon size="14" class="mr-1">mdi-tag</v-icon>
                    v{{ game.version }}
                  </div>
                  <div class="game-card__size">
                    <v-icon size="14" class="mr-1">mdi-download</v-icon>
                    {{ formatSize(game.size_bytes) }}
                  </div>
                </div>
              </div>

              <!-- Hover glow effect -->
              <div class="game-card__glow"></div>
            </article>
          </ScrollReveal>
        </template>
      </div>

      <!-- View All Button -->
      <ScrollReveal v-if="games.length > 0" animation="fade-up" :delay="600">
        <div class="load-more-wrapper">
          <v-btn
            variant="tonal"
            color="primary"
            size="large"
            class="load-more-btn"
            :to="{ name: 'browse' }"
          >
            <v-icon class="mr-2">mdi-view-grid</v-icon>
            View All Games
          </v-btn>
        </div>
      </ScrollReveal>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
.recent-games {
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
  color: #00b4d8;
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.load-more-wrapper {
  display: flex;
  justify-content: center;
}

.load-more-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
}

// Game Card Styles
.game-card {
  position: relative;
  background: rgba(13, 33, 55, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(72, 202, 228, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-8px);
    border-color: rgba(72, 202, 228, 0.3);
  }

  &__image-container {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
    background: #0a1929;
    flex-shrink: 0;
  }

  &__image-skeleton {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.05);
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: transform 0.5s ease, opacity 0.3s ease;
    opacity: 0;

    &.is-loaded {
      opacity: 1;
    }
  }

  &:hover &__image {
    transform: scale(1.08);
  }

  &__rating {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fff;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(10, 25, 41, 0.4) 60%,
      rgba(10, 25, 41, 0.9) 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover &__overlay {
    opacity: 1;
  }

  &__play-btn {
    transform: scale(0.8);
    opacity: 0;
    transition: all 0.3s ease 0.1s;
  }

  &:hover &__play-btn {
    transform: scale(1);
    opacity: 1;
  }

  &__content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  &__title {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
    min-height: 2.6em;
    transition: color 0.3s ease;
  }

  &:hover &__title {
    color: #48cae4;
  }

  &__genres {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 0.75rem;
    min-height: 24px;
  }

  &__genre {
    background: rgba(72, 202, 228, 0.15) !important;
    color: #48cae4 !important;
    font-size: 0.65rem !important;
    font-weight: 500;
    border: 1px solid rgba(72, 202, 228, 0.2);
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
  }

  &__version {
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
  }

  &__size {
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.75rem;
  }

  &__glow {
    position: absolute;
    inset: -1px;
    background: linear-gradient(135deg, #0077b6, #48cae4);
    border-radius: 17px;
    opacity: 0;
    filter: blur(16px);
    transition: opacity 0.4s ease;
    z-index: -1;
  }

  &:hover &__glow {
    opacity: 0.15;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
