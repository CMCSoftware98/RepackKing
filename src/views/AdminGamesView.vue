<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { gamesApi, uploadApi, steamApi, genresApi, formatSize, getImageUrl, type Game, type GameInput, type Genre } from '@/services/api'

const games = ref<Game[]>([])
const allGenres = ref<Genre[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const pagination = ref({ page: 1, limit: 30, total: 0, totalPages: 0 })

// Search state
const searchQuery = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Time period filter
const timePeriod = ref<'all' | '30d' | '7d' | '24h'>('all')
const timePeriodOptions = [
  { title: 'All Time', value: 'all' },
  { title: 'Last 30 Days', value: '30d' },
  { title: 'Last 7 Days', value: '7d' },
  { title: 'Last 24 Hours', value: '24h' }
]

// Sorting state
type SortKey = 'title' | 'version' | 'size_bytes' | 'created_at' | 'views' | 'downloads'
const sortBy = ref<SortKey>('created_at')
const sortDesc = ref(true)

// Dialog state
const dialog = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingGame = ref<Game | null>(null)
const saving = ref(false)

// Steam import state
const steamUrl = ref('')
const steamLoading = ref(false)
const steamError = ref<string | null>(null)
const steamImported = ref(false)

// Form state
const form = ref<GameInput>({
  title: '',
  description: '',
  cover_image: '',
  size_bytes: 0,
  magnet_uri: '',
  version: '',
  genres: [],
  screenshots: [],
  min_cpu: '',
  min_gpu: '',
  min_ram: '',
  min_storage: '',
  min_os: '',
  rec_cpu: '',
  rec_gpu: '',
  rec_ram: '',
  rec_storage: '',
  rec_os: ''
})

// Size input helpers
const sizeValue = ref(0)
const sizeUnit = ref<'MB' | 'GB'>('GB')

// Delete dialog
const deleteDialog = ref(false)
const gameToDelete = ref<Game | null>(null)

// Image upload
const uploading = ref(false)

// Tabs for requirements
const requirementsTab = ref('minimum')

async function loadGames() {
  loading.value = true
  error.value = null
  try {
    const response = await gamesApi.list({ 
      page: pagination.value.page, 
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
      period: timePeriod.value
    })
    let fetchedGames = response.data.games
    
    // Apply client-side sorting
    fetchedGames = sortGames(fetchedGames)
    
    games.value = fetchedGames
    pagination.value = response.data.pagination
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load games'
  } finally {
    loading.value = false
  }
}

// Sort games client-side
function sortGames(gamesToSort: Game[]): Game[] {
  return [...gamesToSort].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy.value) {
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'version':
        comparison = (a.version || '').localeCompare(b.version || '')
        break
      case 'size_bytes':
        comparison = a.size_bytes - b.size_bytes
        break
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'views':
        comparison = (a.analytics?.views || 0) - (b.analytics?.views || 0)
        break
      case 'downloads':
        comparison = (a.analytics?.downloads || 0) - (b.analytics?.downloads || 0)
        break
    }
    
    return sortDesc.value ? -comparison : comparison
  })
}

// Handle column header click for sorting
function toggleSort(column: SortKey) {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = column
    sortDesc.value = true
  }
  // Re-sort current games
  games.value = sortGames(games.value)
}

// Get sort icon for column header
function getSortIcon(column: SortKey): string {
  if (sortBy.value !== column) return 'mdi-unfold-more-horizontal'
  return sortDesc.value ? 'mdi-chevron-down' : 'mdi-chevron-up'
}

// Debounced search
function handleSearch() {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  searchTimeout.value = setTimeout(() => {
    pagination.value.page = 1 // Reset to first page on search
    loadGames()
  }, 300)
}

// Clear search
function clearSearch() {
  searchQuery.value = ''
  pagination.value.page = 1
  loadGames()
}

// Watch for search changes
watch(searchQuery, handleSearch)

// Watch for time period changes
watch(timePeriod, () => {
  pagination.value.page = 1
  loadGames()
})

async function loadGenres() {
  try {
    const response = await genresApi.list()
    allGenres.value = response.data
  } catch (err) {
    console.error('Failed to load genres:', err)
  }
}

function openCreateDialog() {
  dialogMode.value = 'create'
  editingGame.value = null
  resetForm()
  steamUrl.value = ''
  steamError.value = null
  steamImported.value = false
  requirementsTab.value = 'minimum'
  dialog.value = true
}

function openEditDialog(game: Game) {
  dialogMode.value = 'edit'
  editingGame.value = game
  steamUrl.value = ''
  steamError.value = null
  steamImported.value = false
  requirementsTab.value = 'minimum'
  form.value = {
    title: game.title,
    description: game.description || '',
    cover_image: game.cover_image || '',
    size_bytes: game.size_bytes,
    magnet_uri: game.magnet_uri || '',
    version: game.version || '',
    genres: game.genres || [],
    screenshots: game.screenshots || [],
    min_cpu: game.min_cpu || '',
    min_gpu: game.min_gpu || '',
    min_ram: game.min_ram || '',
    min_storage: game.min_storage || '',
    min_os: game.min_os || '',
    rec_cpu: game.rec_cpu || '',
    rec_gpu: game.rec_gpu || '',
    rec_ram: game.rec_ram || '',
    rec_storage: game.rec_storage || '',
    rec_os: game.rec_os || ''
  }
  // Convert bytes to display value
  if (game.size_bytes >= 1024 * 1024 * 1024) {
    sizeValue.value = Math.round(game.size_bytes / (1024 * 1024 * 1024) * 100) / 100
    sizeUnit.value = 'GB'
  } else {
    sizeValue.value = Math.round(game.size_bytes / (1024 * 1024) * 100) / 100
    sizeUnit.value = 'MB'
  }
  dialog.value = true
}

function resetForm() {
  form.value = {
    title: '',
    description: '',
    cover_image: '',
    size_bytes: 0,
    magnet_uri: '',
    version: '',
    genres: [],
    screenshots: [],
    min_cpu: '',
    min_gpu: '',
    min_ram: '',
    min_storage: '',
    min_os: '',
    rec_cpu: '',
    rec_gpu: '',
    rec_ram: '',
    rec_storage: '',
    rec_os: ''
  }
  sizeValue.value = 0
  sizeUnit.value = 'GB'
}

async function fetchFromSteam() {
  if (!steamUrl.value.trim()) {
    steamError.value = 'Please enter a Steam URL'
    return
  }

  steamLoading.value = true
  steamError.value = null

  try {
    const response = await steamApi.fetch(steamUrl.value.trim())
    const data = response.data

    // Populate form with Steam data
    form.value.title = data.title
    form.value.description = data.description
    form.value.cover_image = data.cover_image || ''
    form.value.genres = data.genres || []
    form.value.screenshots = data.screenshots || []
    form.value.min_os = data.min_os || ''
    form.value.min_cpu = data.min_cpu || ''
    form.value.min_gpu = data.min_gpu || ''
    form.value.min_ram = data.min_ram || ''
    form.value.min_storage = data.min_storage || ''
    form.value.rec_os = data.rec_os || ''
    form.value.rec_cpu = data.rec_cpu || ''
    form.value.rec_gpu = data.rec_gpu || ''
    form.value.rec_ram = data.rec_ram || ''
    form.value.rec_storage = data.rec_storage || ''

    steamImported.value = true
    
    // Reload genres in case new ones were created
    loadGenres()
  } catch (err: any) {
    steamError.value = err.response?.data?.error || 'Failed to fetch from Steam'
  } finally {
    steamLoading.value = false
  }
}

function calculateSizeBytes() {
  const multiplier = sizeUnit.value === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024
  form.value.size_bytes = Math.round(sizeValue.value * multiplier)
}

async function handleSubmit() {
  calculateSizeBytes()
  saving.value = true
  
  try {
    if (dialogMode.value === 'create') {
      await gamesApi.create(form.value)
    } else if (editingGame.value) {
      await gamesApi.update(editingGame.value.id, form.value)
    }
    dialog.value = false
    loadGames()
    loadGenres()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to save game'
  } finally {
    saving.value = false
  }
}

function confirmDelete(game: Game) {
  gameToDelete.value = game
  deleteDialog.value = true
}

async function handleDelete() {
  if (!gameToDelete.value) return
  
  try {
    await gamesApi.delete(gameToDelete.value.id)
    deleteDialog.value = false
    gameToDelete.value = null
    loadGames()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to delete game'
  }
}

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  const file = input.files[0]
  uploading.value = true
  
  try {
    const response = await uploadApi.uploadImage(file)
    form.value.cover_image = response.data.url
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to upload image'
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  loadGames()
  loadGenres()
})
</script>

<template>
  <div class="admin-games">
    <v-container style="max-width: 1400px;">
      <!-- Header -->
      <header class="admin-header d-flex justify-space-between align-center flex-wrap ga-4 mb-6">
        <div>
          <v-btn variant="text" :to="{ name: 'admin-dashboard' }" class="mb-2">
            <v-icon start>mdi-arrow-left</v-icon>
            Back to Dashboard
          </v-btn>
          <h1 class="admin-title">Manage Games</h1>
        </div>
        <v-btn color="primary" size="large" @click="openCreateDialog">
          <v-icon start>mdi-plus</v-icon>
          Add Game
        </v-btn>
      </header>

      <!-- Error Alert -->
      <v-alert v-if="error" type="error" variant="tonal" class="mb-6" closable @click:close="error = null">
        {{ error }}
      </v-alert>

      <!-- Search & Filter Bar -->
      <v-card class="search-card mb-4 pa-4" elevation="0">
        <v-row align="center">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="searchQuery"
              placeholder="Search games by title..."
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
              @click:clear="clearSearch"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-btn-toggle
              v-model="timePeriod"
              mandatory
              density="compact"
              color="primary"
              class="time-filter-toggle"
            >
              <v-btn
                v-for="option in timePeriodOptions"
                :key="option.value"
                :value="option.value"
                size="small"
              >
                {{ option.title }}
              </v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" md="3" class="d-flex justify-md-end align-center">
            <span class="text-medium-emphasis text-body-2">
              {{ pagination.total }} game{{ pagination.total !== 1 ? 's' : '' }} found
            </span>
          </v-col>
        </v-row>
      </v-card>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" />
      </div>

      <!-- Games Table -->
      <v-card v-else class="games-table-card" elevation="0">
        <v-table>
          <thead>
            <tr>
              <th>Image</th>
              <th class="sortable-header" @click="toggleSort('title')">
                <div class="d-flex align-center">
                  Title
                  <v-icon size="18" class="ml-1">{{ getSortIcon('title') }}</v-icon>
                </div>
              </th>
              <th class="sortable-header" @click="toggleSort('version')">
                <div class="d-flex align-center">
                  Version
                  <v-icon size="18" class="ml-1">{{ getSortIcon('version') }}</v-icon>
                </div>
              </th>
              <th class="sortable-header" @click="toggleSort('views')">
                <div class="d-flex align-center">
                  <v-icon size="16" class="mr-1">mdi-eye</v-icon>
                  Views
                  <v-icon size="18" class="ml-1">{{ getSortIcon('views') }}</v-icon>
                </div>
              </th>
              <th class="sortable-header" @click="toggleSort('downloads')">
                <div class="d-flex align-center">
                  <v-icon size="16" class="mr-1">mdi-download</v-icon>
                  Downloads
                  <v-icon size="18" class="ml-1">{{ getSortIcon('downloads') }}</v-icon>
                </div>
              </th>
              <th class="sortable-header" @click="toggleSort('size_bytes')">
                <div class="d-flex align-center">
                  Size
                  <v-icon size="18" class="ml-1">{{ getSortIcon('size_bytes') }}</v-icon>
                </div>
              </th>
              <th>Magnet</th>
              <th class="sortable-header" @click="toggleSort('created_at')">
                <div class="d-flex align-center">
                  Created
                  <v-icon size="18" class="ml-1">{{ getSortIcon('created_at') }}</v-icon>
                </div>
              </th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="game in games" :key="game.id">
              <td style="width: 80px;">
                <v-img
                  :src="getImageUrl(game.cover_image)"
                  :alt="game.title"
                  width="60"
                  height="80"
                  cover
                  class="rounded"
                />
              </td>
              <td>
                <strong>{{ game.title }}</strong>
                <br>
                <small class="text-medium-emphasis">/game/{{ game.slug }}</small>
              </td>
              <td>
                <v-chip v-if="game.version" size="small" variant="tonal" color="secondary">
                  v{{ game.version }}
                </v-chip>
                <span v-else class="text-medium-emphasis">-</span>
              </td>
              <td>
                <span class="analytics-value">
                  {{ game.analytics?.views?.toLocaleString() || 0 }}
                </span>
              </td>
              <td>
                <span class="analytics-value analytics-downloads">
                  {{ game.analytics?.downloads?.toLocaleString() || 0 }}
                </span>
              </td>
              <td>{{ formatSize(game.size_bytes) }}</td>
              <td>
                <v-chip :color="game.magnet_uri ? 'success' : 'grey'" size="small" variant="tonal">
                  {{ game.magnet_uri ? 'Yes' : 'No' }}
                </v-chip>
              </td>
              <td class="text-medium-emphasis">
                {{ new Date(game.created_at).toLocaleDateString() }}
              </td>
              <td class="text-right">
                <v-btn icon variant="text" size="small" @click="openEditDialog(game)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon variant="text" size="small" color="error" @click="confirmDelete(game)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
            <tr v-if="games.length === 0">
              <td colspan="9" class="text-center py-8 text-medium-emphasis">
                <template v-if="searchQuery">
                  No games found matching "{{ searchQuery }}".
                  <v-btn variant="text" color="primary" size="small" @click="clearSearch">
                    Clear search
                  </v-btn>
                </template>
                <template v-else>
                  No games yet. Click "Add Game" to create one.
                </template>
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 0" class="pa-4 d-flex justify-space-between align-center flex-wrap">
          <span class="text-medium-emphasis text-body-2">
            Showing {{ (pagination.page - 1) * pagination.limit + 1 }} - 
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
            of {{ pagination.total }}
          </span>
          <v-pagination
            v-if="pagination.totalPages > 1"
            v-model="pagination.page"
            :length="pagination.totalPages"
            :total-visible="7"
            density="comfortable"
            @update:model-value="loadGames"
          />
        </div>
      </v-card>

      <!-- Create/Edit Dialog -->
      <v-dialog v-model="dialog" max-width="900" persistent scrollable>
        <v-card class="pa-4">
          <v-card-title class="text-h5">
            {{ dialogMode === 'create' ? 'Add New Game' : 'Edit Game' }}
          </v-card-title>
          
          <v-card-text style="max-height: 70vh;">
            <v-form @submit.prevent="handleSubmit">
              <!-- Steam Import Section -->
              <v-card 
                class="steam-import-card mb-6 pa-4" 
                variant="outlined"
              >
                <div class="d-flex align-center mb-3">
                  <v-icon color="info" class="mr-2">mdi-steam</v-icon>
                  <span class="text-subtitle-1 font-weight-medium">Import from Steam</span>
                </div>
                
                <div class="d-flex ga-2">
                  <v-text-field
                    v-model="steamUrl"
                    placeholder="https://store.steampowered.com/app/123456/Game_Name/"
                    variant="outlined"
                    density="compact"
                    hide-details
                    :disabled="steamLoading"
                    class="flex-grow-1"
                  />
                  <v-btn
                    color="info"
                    :loading="steamLoading"
                    :disabled="!steamUrl.trim()"
                    @click="fetchFromSteam"
                  >
                    <v-icon start>mdi-download</v-icon>
                    Fetch
                  </v-btn>
                </div>

                <v-alert 
                  v-if="steamError" 
                  type="error" 
                  variant="tonal" 
                  density="compact"
                  class="mt-3"
                >
                  {{ steamError }}
                </v-alert>

                <v-alert 
                  v-if="steamImported" 
                  type="success" 
                  variant="tonal" 
                  density="compact"
                  class="mt-3"
                >
                  Game details imported from Steam! Genres and system requirements have been populated.
                </v-alert>
              </v-card>

              <v-row>
                <!-- Basic Info -->
                <v-col cols="12">
                  <v-text-field
                    v-model="form.title"
                    label="Title *"
                    variant="outlined"
                    :rules="[v => !!v || 'Title is required']"
                  />
                </v-col>

                <v-col cols="12">
                  <v-textarea
                    v-model="form.description"
                    label="Description"
                    variant="outlined"
                    rows="3"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="form.version"
                    label="Version"
                    variant="outlined"
                    placeholder="1.0.0"
                    hint="Game version (e.g., 1.0.0, 2.1)"
                    persistent-hint
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="sizeValue"
                    label="Size"
                    variant="outlined"
                    type="number"
                    step="0.01"
                  >
                    <template #append-inner>
                      <v-btn-toggle v-model="sizeUnit" mandatory density="compact">
                        <v-btn value="MB" size="small">MB</v-btn>
                        <v-btn value="GB" size="small">GB</v-btn>
                      </v-btn-toggle>
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="form.magnet_uri"
                    label="Magnet URI"
                    variant="outlined"
                    placeholder="magnet:?xt=urn:btih:..."
                  />
                </v-col>

                <!-- Genres -->
                <v-col cols="12">
                  <v-combobox
                    v-model="form.genres"
                    :items="allGenres.map(g => g.name)"
                    label="Genres"
                    variant="outlined"
                    multiple
                    chips
                    closable-chips
                    hint="Select existing genres or type new ones"
                    persistent-hint
                  />
                </v-col>

                <!-- Cover Image -->
                <v-col cols="12">
                  <v-text-field
                    v-model="form.cover_image"
                    label="Cover Image URL"
                    variant="outlined"
                    placeholder="/uploads/image.jpg or https://..."
                  >
                    <template #append>
                      <v-btn variant="tonal" :loading="uploading" @click="($refs.fileInput as HTMLInputElement).click()">
                        Upload
                      </v-btn>
                      <input
                        ref="fileInput"
                        type="file"
                        accept="image/*"
                        style="display: none"
                        @change="handleImageUpload"
                      />
                    </template>
                  </v-text-field>
                  <v-img
                    v-if="form.cover_image"
                    :src="getImageUrl(form.cover_image)"
                    max-width="200"
                    max-height="120"
                    class="mt-2 rounded"
                  />
                </v-col>

                <!-- Screenshots Preview -->
                <v-col v-if="form.screenshots && form.screenshots.length > 0" cols="12">
                  <p class="text-subtitle-2 mb-2">Screenshots ({{ form.screenshots.length }})</p>
                  <div class="screenshots-preview">
                    <div
                      v-for="(screenshot, index) in form.screenshots"
                      :key="index"
                      class="screenshot-preview-item"
                    >
                      <v-img
                        :src="getImageUrl(screenshot)"
                        width="150"
                        height="84"
                        cover
                        class="rounded"
                      />
                      <v-btn
                        icon
                        size="x-small"
                        color="error"
                        class="screenshot-remove-btn"
                        @click="form.screenshots?.splice(index, 1)"
                      >
                        <v-icon size="14">mdi-close</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </v-col>

                <!-- System Requirements Tabs -->
                <v-col cols="12">
                  <v-divider class="my-2" />
                  <p class="text-subtitle-2 mb-3">System Requirements</p>
                  
                  <v-tabs v-model="requirementsTab" color="primary" class="mb-4">
                    <v-tab value="minimum">Minimum</v-tab>
                    <v-tab value="recommended">Recommended</v-tab>
                  </v-tabs>

                  <v-window v-model="requirementsTab">
                    <!-- Minimum Requirements -->
                    <v-window-item value="minimum">
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.min_os"
                            label="Operating System"
                            variant="outlined"
                            placeholder="Windows 10 64-bit"
                            density="compact"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.min_cpu"
                            label="CPU"
                            variant="outlined"
                            placeholder="Intel Core i5-4460"
                            density="compact"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.min_gpu"
                            label="GPU"
                            variant="outlined"
                            placeholder="NVIDIA GTX 760"
                            density="compact"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.min_ram"
                            label="RAM"
                            variant="outlined"
                            placeholder="8 GB"
                            density="compact"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.min_storage"
                            label="Storage"
                            variant="outlined"
                            placeholder="50 GB"
                            density="compact"
                          />
                        </v-col>
                      </v-row>
                    </v-window-item>

                    <!-- Recommended Requirements -->
                    <v-window-item value="recommended">
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.rec_os"
                            label="Operating System"
                            variant="outlined"
                            placeholder="Windows 10/11 64-bit"
                            density="compact"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.rec_cpu"
                            label="CPU"
                            variant="outlined"
                            placeholder="Intel Core i7-8700"
                            density="compact"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.rec_gpu"
                            label="GPU"
                            variant="outlined"
                            placeholder="NVIDIA RTX 2060"
                            density="compact"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.rec_ram"
                            label="RAM"
                            variant="outlined"
                            placeholder="16 GB"
                            density="compact"
                          />
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="form.rec_storage"
                            label="Storage"
                            variant="outlined"
                            placeholder="100 GB SSD"
                            density="compact"
                          />
                        </v-col>
                      </v-row>
                    </v-window-item>
                  </v-window>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
            <v-btn
              color="primary"
              :loading="saving"
              :disabled="!form.title"
              @click="handleSubmit"
            >
              {{ dialogMode === 'create' ? 'Create' : 'Save' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Confirmation Dialog -->
      <v-dialog v-model="deleteDialog" max-width="400">
        <v-card>
          <v-card-title>Confirm Delete</v-card-title>
          <v-card-text>
            Are you sure you want to delete "{{ gameToDelete?.title }}"? This action cannot be undone.
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
            <v-btn color="error" @click="handleDelete">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.admin-games {
  min-height: calc(100vh - 72px);
  padding: 2rem 0;
}

.admin-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, #48cae4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.search-card {
  background: rgba(13, 33, 55, 0.8) !important;
  border: 1px solid rgba(72, 202, 228, 0.1);
  border-radius: 12px;
}

.games-table-card {
  background: rgba(13, 33, 55, 0.8) !important;
  border: 1px solid rgba(72, 202, 228, 0.1);
  border-radius: 12px;

  :deep(.v-table) {
    background: transparent !important;
  }

  :deep(th) {
    font-weight: 600 !important;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
  }
  
  :deep(.sortable-header) {
    cursor: pointer;
    user-select: none;
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(72, 202, 228, 0.1);
    }
    
    .v-icon {
      opacity: 0.5;
      transition: opacity 0.2s ease;
    }
    
    &:hover .v-icon {
      opacity: 1;
    }
  }
}

.steam-import-card {
  background: rgba(0, 119, 182, 0.1) !important;
  border-color: rgba(0, 119, 182, 0.3) !important;
}

.screenshots-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.screenshot-preview-item {
  position: relative;
  
  .screenshot-remove-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    background: rgb(var(--v-theme-error)) !important;
  }
}

.time-filter-toggle {
  border: 1px solid rgba(72, 202, 228, 0.2);
  border-radius: 8px;
  
  .v-btn {
    text-transform: none;
    font-size: 0.8rem;
    letter-spacing: 0;
  }
}

.analytics-value {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
}

.analytics-downloads {
  color: #48cae4;
}
</style>
