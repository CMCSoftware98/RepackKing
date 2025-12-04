<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { genresApi, type Genre } from '@/services/api'
import ScrollReveal from '@/components/common/ScrollReveal.vue'

const router = useRouter()
const allGenres = ref<Genre[]>([])
const genreSearch = ref('')
const loading = ref(true)
const displayedCounts = ref<Record<number, number>>({})

// Filter genres based on search
const filteredGenres = computed(() => {
  if (!genreSearch.value.trim()) {
    // Show top 8 when no search
    return allGenres.value
      .sort((a, b) => (b.game_count || 0) - (a.game_count || 0))
      .slice(0, 8)
  }
  
  const search = genreSearch.value.toLowerCase().trim()
  return allGenres.value
    .filter(g => g.name.toLowerCase().includes(search))
    .sort((a, b) => (b.game_count || 0) - (a.game_count || 0))
})

// Genre icon mapping
const genreIcons: Record<string, string> = {
  'action': 'mdi-sword-cross',
  'adventure': 'mdi-compass',
  'rpg': 'mdi-shield-sword',
  'strategy': 'mdi-chess-queen',
  'simulation': 'mdi-airplane',
  'sports': 'mdi-soccer',
  'racing': 'mdi-car-sports',
  'puzzle': 'mdi-puzzle',
  'horror': 'mdi-ghost',
  'shooter': 'mdi-pistol',
  'platformer': 'mdi-run',
  'fighting': 'mdi-boxing-glove',
  'survival': 'mdi-campfire',
  'sandbox': 'mdi-cube-outline',
  'open-world': 'mdi-earth',
  'stealth': 'mdi-eye-off',
  'indie': 'mdi-star-four-points',
  'casual': 'mdi-gamepad-variant',
  'mmo': 'mdi-account-group',
  'multiplayer': 'mdi-account-multiple',
  'singleplayer': 'mdi-account',
  'co-op': 'mdi-handshake',
  'free-to-play': 'mdi-currency-usd-off',
  'early-access': 'mdi-clock-fast',
  'vr': 'mdi-virtual-reality',
  'default': 'mdi-gamepad-square'
}

function getGenreIcon(slug: string): string {
  // Check for exact match
  if (genreIcons[slug]) return genreIcons[slug]
  
  // Check for partial match
  for (const [key, icon] of Object.entries(genreIcons)) {
    if (slug.includes(key) || key.includes(slug)) {
      return icon
    }
  }
  
  return genreIcons['default']
}

// Navigate to browse with genre filter
function navigateToGenre(genre: Genre) {
  router.push({ name: 'browse', query: { genre: genre.slug } })
}

// Animate number counting up
function animateNumber(
  genreId: number,
  target: number,
  delay: number = 0
) {
  setTimeout(() => {
    const duration = 800
    const startTime = performance.now()

    function update(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(target * easeOut)
      
      displayedCounts.value[genreId] = current
      
      if (progress < 1) {
        requestAnimationFrame(update)
      }
    }
    
    requestAnimationFrame(update)
  }, delay)
}

async function loadGenres() {
  try {
    const response = await genresApi.list()
    allGenres.value = response.data
    
    // Initialize display counts to 0
    allGenres.value.forEach(g => {
      displayedCounts.value[g.id] = 0
    })
    
    // Animate each count with staggered delay
    setTimeout(() => {
      allGenres.value.forEach((g, index) => {
        animateNumber(g.id, g.game_count || 0, index * 50)
      })
    }, 300)
  } catch (error) {
    console.error('Failed to load genres:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadGenres()
})
</script>

<template>
  <section class="category-grid section">
    <v-container style="max-width: 1400px;">
      <ScrollReveal animation="fade-up">
        <div class="section-header">
          <div class="section-title-wrapper">
            <v-icon class="section-icon" size="32">mdi-shape</v-icon>
            <h2 class="section-title">Browse by Genre</h2>
          </div>
          <p class="section-subtitle">Find games in your favorite genres</p>
        </div>
      </ScrollReveal>

      <!-- Genre Search Box -->
      <ScrollReveal animation="fade-up" :delay="100">
        <div class="genre-search-wrapper">
          <v-text-field
            v-model="genreSearch"
            placeholder="Search genres..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            class="genre-search-input"
          />
        </div>
      </ScrollReveal>

      <!-- Loading State -->
      <div v-if="loading" class="categories-loading">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredGenres.length === 0" class="categories-empty">
        <v-icon size="48" color="grey" class="mb-2">mdi-folder-search-outline</v-icon>
        <p class="text-medium-emphasis">
          {{ genreSearch ? `No genres matching "${genreSearch}"` : 'No genres available yet' }}
        </p>
        <v-btn 
          v-if="genreSearch" 
          variant="text" 
          color="primary" 
          size="small"
          class="mt-2"
          @click="genreSearch = ''"
        >
          Clear Search
        </v-btn>
      </div>

      <!-- Genres Grid -->
      <div v-else class="categories-container">
        <ScrollReveal
          v-for="(genre, index) in filteredGenres"
          :key="genre.id"
          animation="scale"
          :delay="index * 75"
        >
          <div
            class="category-card"
            @click="navigateToGenre(genre)"
          >
            <div class="category-card__icon-wrapper">
              <v-icon class="category-card__icon" size="36">{{ getGenreIcon(genre.slug) }}</v-icon>
            </div>
            <div class="category-card__content">
              <h3 class="category-card__name">{{ genre.name }}</h3>
              <span class="category-card__count">{{ displayedCounts[genre.id] || 0 }} games</span>
            </div>
            <v-icon class="category-card__arrow">mdi-chevron-right</v-icon>
          </div>
        </ScrollReveal>
      </div>

      <!-- View All Link -->
      <ScrollReveal v-if="allGenres.length > 8 && !genreSearch" animation="fade-up" :delay="700">
        <div class="view-all-wrapper">
          <v-btn
            variant="text"
            color="primary"
            @click="genreSearch = ' '"
          >
            View All {{ allGenres.length }} Genres
            <v-icon size="18" class="ml-1">mdi-arrow-right</v-icon>
          </v-btn>
        </div>
      </ScrollReveal>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
.category-grid {
  position: relative;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(13, 33, 55, 0.5) 50%,
    transparent 100%
  );
}

.section-header {
  text-align: center;
  margin-bottom: 2rem;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.section-icon {
  color: #48cae4;
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

.genre-search-wrapper {
  max-width: 400px;
  margin: 0 auto 2rem;
}

.genre-search-input {
  :deep(.v-field) {
    background: rgba(13, 33, 55, 0.8);
    border-radius: 12px;
    
    &:hover {
      background: rgba(13, 33, 55, 0.9);
    }
  }
  
  :deep(.v-field--focused) {
    background: rgba(13, 33, 55, 1);
  }
}

.categories-loading,
.categories-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  text-align: center;
}

.categories-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.category-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(13, 33, 55, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(72, 202, 228, 0.1);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    background: rgba(13, 33, 55, 0.9);
    border-color: rgba(72, 202, 228, 0.3);
    transform: translateX(4px);

    .category-card__icon-wrapper {
      background: rgba(72, 202, 228, 0.2);
      border-color: rgba(72, 202, 228, 0.4);
    }

    .category-card__icon {
      color: #48cae4;
      transform: scale(1.1);
    }

    .category-card__arrow {
      opacity: 1;
      transform: translateX(0);
    }
  }

  &__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: rgba(72, 202, 228, 0.1);
    border: 1px solid rgba(72, 202, 228, 0.2);
    border-radius: 12px;
    flex-shrink: 0;
    transition: all 0.3s ease;
  }

  &__icon {
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.3s ease;
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 0.125rem;
  }

  &__count {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
  }

  &__arrow {
    color: #48cae4;
    opacity: 0;
    transform: translateX(-8px);
    transition: all 0.3s ease;
    flex-shrink: 0;
  }
}

.view-all-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}
</style>
