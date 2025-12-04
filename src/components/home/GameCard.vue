<script setup lang="ts">
import { ref } from 'vue'
import type { Game } from '@/types/game'

interface Props {
  game: Game
  index?: number
}

const props = withDefaults(defineProps<Props>(), {
  index: 0
})

const isHovered = ref(false)
const imageLoaded = ref(false)

const getRatingColor = (rating: number): string => {
  if (rating >= 4.5) return '#4caf50'
  if (rating >= 4.0) return '#8bc34a'
  if (rating >= 3.5) return '#ffc107'
  return '#ff9800'
}
</script>

<template>
  <article 
    class="game-card"
    :class="{ 'game-card--hovered': isHovered }"
    :style="{ '--animation-delay': `${index * 100}ms` }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Image Container -->
    <div class="game-card__image-container">
      <div v-if="!imageLoaded" class="game-card__image-skeleton skeleton-shimmer"></div>
      <img 
        :src="game.coverImage" 
        :alt="game.title"
        class="game-card__image"
        :class="{ 'is-loaded': imageLoaded }"
        loading="lazy"
        @load="imageLoaded = true"
      />
      
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

      <!-- Featured Badge -->
      <div v-if="game.isFeatured" class="game-card__badge">
        <v-icon size="14" class="mr-1">mdi-star</v-icon>
        Featured
      </div>
    </div>

    <!-- Content -->
    <div class="game-card__content">
      <h3 class="game-card__title">{{ game.title }}</h3>
      
      <!-- Genres -->
      <div class="game-card__genres">
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
        <div class="game-card__rating">
          <v-icon size="16" :color="getRatingColor(game.rating)">mdi-star</v-icon>
          <span :style="{ color: getRatingColor(game.rating) }">{{ game.rating.toFixed(1) }}</span>
        </div>
        <div class="game-card__size">
          <v-icon size="14" class="mr-1">mdi-download</v-icon>
          {{ game.size }}
        </div>
      </div>
    </div>

    <!-- Hover glow effect -->
    <div class="game-card__glow"></div>
  </article>
</template>

<style scoped lang="scss">
.game-card {
  position: relative;
  background: rgba(13, 33, 55, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(72, 202, 228, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;

  &:hover {
    transform: translateY(-8px);
    border-color: rgba(72, 202, 228, 0.3);
  }

  &__image-container {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
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
    transition: transform 0.5s ease, opacity 0.3s ease;
    opacity: 0;

    &.is-loaded {
      opacity: 1;
    }
  }

  &:hover &__image {
    transform: scale(1.08);
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

  &__badge {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #0077b6, #00b4d8);
    color: #ffffff;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &__content {
    padding: 1rem;
  }

  &__title {
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
  }

  &__rating {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 600;
    font-size: 0.875rem;
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
