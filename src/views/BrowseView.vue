<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGamesStore } from '@/stores/games'
import { genresApi, type Genre } from '@/services/api'
import GameGridCard from '@/components/browse/GameGridCard.vue'
import Pagination from '@/components/browse/Pagination.vue'

const route = useRoute()
const router = useRouter()
const gamesStore = useGamesStore()

const searchQuery = ref('')
const selectedGenre = ref<string | null>(null)
const genres = ref<Genre[]>([])
const currentPage = ref(1)
const itemsPerPage = ref(30)
const searchTimeout = ref<number | null>(null)

// Computed for display
const selectedGenreName = computed(() => {
  if (!selectedGenre.value) return null
  const genre = genres.value.find(g => g.slug === selectedGenre.value)
  return genre?.name || null
})

async function loadGenres() {
  try {
    const response = await genresApi.list()
    genres.value = response.data
  } catch (error) {
    console.error('Failed to load genres:', error)
  }
}

async function loadGames() {
  await gamesStore.fetchGames({
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: searchQuery.value || undefined,
    genre: selectedGenre.value || undefined
  })
}

function handleSearch() {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  searchTimeout.value = window.setTimeout(() => {
    currentPage.value = 1
    updateUrl()
    loadGames()
  }, 300)
}

function handleGenreChange() {
  currentPage.value = 1
  updateUrl()
  loadGames()
}

function clearGenre() {
  selectedGenre.value = null
  handleGenreChange()
}

function updateUrl() {
  const query: Record<string, string> = {}
  if (searchQuery.value) query.search = searchQuery.value
  if (selectedGenre.value) query.genre = selectedGenre.value
  router.replace({ query })
}

// Read URL params on mount
function readUrlParams() {
  if (route.query.search) {
    searchQuery.value = route.query.search as string
  }
  if (route.query.genre) {
    selectedGenre.value = route.query.genre as string
  }
}

watch(currentPage, loadGames)
watch(itemsPerPage, () => {
  currentPage.value = 1
  loadGames()
})

// Watch for route changes (when navigating from category links)
watch(() => route.query, () => {
  readUrlParams()
  loadGames()
}, { deep: true })

onMounted(async () => {
  await loadGenres()
  readUrlParams()
  loadGames()
})
</script>

<template>
  <div class="browse-view">
    <v-container style="max-width: 1400px;">
      <!-- Header -->
      <header class="browse-header">
        <h1 class="browse-title">Browse Games</h1>
        <p class="browse-subtitle text-medium-emphasis">
          Discover and download your next gaming adventure
        </p>
      </header>

      <!-- Search and Filter Bar -->
      <div class="browse-filters">
        <v-text-field
          v-model="searchQuery"
          placeholder="Search games..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          class="browse-filters__search"
          @input="handleSearch"
          @click:clear="handleSearch"
        />

        <v-select
          v-model="selectedGenre"
          :items="genres"
          item-title="name"
          item-value="slug"
          label="Genre"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          class="browse-filters__genre"
          @update:model-value="handleGenreChange"
        >
          <template #item="{ item, props }">
            <v-list-item v-bind="props">
              <template #append>
                <v-chip size="x-small" variant="tonal">
                  {{ item.raw.game_count }}
                </v-chip>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </div>

      <!-- Active Filters -->
      <div v-if="selectedGenre || searchQuery" class="browse-active-filters">
        <span class="text-medium-emphasis mr-2">Filters:</span>
        <v-chip
          v-if="searchQuery"
          closable
          size="small"
          variant="tonal"
          class="mr-2"
          @click:close="searchQuery = ''; handleSearch()"
        >
          Search: {{ searchQuery }}
        </v-chip>
        <v-chip
          v-if="selectedGenre"
          closable
          size="small"
          variant="tonal"
          color="info"
          @click:close="clearGenre"
        >
          Genre: {{ selectedGenreName }}
        </v-chip>
      </div>

      <!-- Loading State -->
      <div v-if="gamesStore.loading" class="browse-loading">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-medium-emphasis">Loading games...</p>
      </div>

      <!-- Error State -->
      <v-alert
        v-else-if="gamesStore.error"
        type="error"
        variant="tonal"
        class="mb-6"
      >
        {{ gamesStore.error }}
      </v-alert>

      <!-- Empty State -->
      <div v-else-if="gamesStore.games.length === 0" class="browse-empty">
        <v-icon size="80" color="grey">mdi-gamepad-variant-outline</v-icon>
        <h3 class="mt-4">No games found</h3>
        <p class="text-medium-emphasis">
          {{ searchQuery || selectedGenre ? 'Try different filters' : 'Games will appear here once added' }}
        </p>
        <v-btn
          v-if="searchQuery || selectedGenre"
          variant="tonal"
          color="primary"
          class="mt-4"
          @click="searchQuery = ''; selectedGenre = null; handleGenreChange()"
        >
          Clear Filters
        </v-btn>
      </div>

      <!-- Games Grid -->
      <template v-else>
        <!-- Results Count -->
        <p class="browse-results-count text-medium-emphasis mb-4">
          Showing {{ gamesStore.games.length }} of {{ gamesStore.pagination.total }} games
        </p>

        <div class="games-grid">
          <GameGridCard
            v-for="game in gamesStore.games"
            :key="game.id"
            :game="game"
          />
        </div>

        <!-- Pagination -->
        <Pagination
          v-model:page="currentPage"
          v-model:limit="itemsPerPage"
          :total-pages="gamesStore.pagination.totalPages"
          :total="gamesStore.pagination.total"
        />
      </template>
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.browse-view {
  min-height: calc(100vh - 72px);
  padding: 2rem 0 4rem;
}

.browse-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 2rem;
}

.browse-title {
  font-family: 'Montserrat', sans-serif;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, #48cae4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.browse-subtitle {
  font-size: 1.1rem;
}

.browse-filters {
  display: flex;
  gap: 1rem;
  max-width: 800px;
  margin: 0 auto 1.5rem;
  
  @media (max-width: 600px) {
    flex-direction: column;
  }

  &__search {
    flex: 2;
    
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

  &__genre {
    flex: 1;
    min-width: 180px;
    
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
}

.browse-active-filters {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.browse-results-count {
  text-align: center;
}

.browse-loading,
.browse-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 600px) {
  .games-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}
</style>
