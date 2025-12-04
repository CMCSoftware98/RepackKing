<script setup lang="ts">
import { ref, watch } from 'vue'
import { gamesApi, reportsApi, type Game, type GameReportInput } from '@/services/api'

// Form state
const form = ref<Partial<GameReportInput>>({
  report_type: 'broken_link',
  description: '',
  email: ''
})

// Game search state
const gameSearch = ref('')
const gameSearchResults = ref<Game[]>([])
const selectedGame = ref<Game | null>(null)
const gameSearchLoading = ref(false)
const gameSearchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Submission state
const submitting = ref(false)
const submitted = ref(false)
const submitError = ref<string | null>(null)
const trackingId = ref<string | null>(null)

// Form validation
const formValid = ref(false)
const rules = {
  required: (v: string) => !!v || 'This field is required',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email format'
}

// Report types
const reportTypes = [
  { value: 'broken_link', title: 'Broken/Dead Link', icon: 'mdi-link-off', description: 'Download link is not working' },
  { value: 'wrong_info', title: 'Wrong Information', icon: 'mdi-information-off', description: 'Game info is incorrect' },
  { value: 'malware', title: 'Malware/Virus', icon: 'mdi-virus', description: 'File contains malicious software' },
  { value: 'other', title: 'Other Issue', icon: 'mdi-help-circle', description: 'Any other problem' }
]

// Search for games
async function searchGames() {
  if (!gameSearch.value || gameSearch.value.length < 2) {
    gameSearchResults.value = []
    return
  }

  gameSearchLoading.value = true
  try {
    const response = await gamesApi.list({ search: gameSearch.value, limit: 10 })
    gameSearchResults.value = response.data.games
  } catch (error) {
    console.error('Failed to search games:', error)
    gameSearchResults.value = []
  } finally {
    gameSearchLoading.value = false
  }
}

// Debounced game search
watch(gameSearch, () => {
  if (gameSearchTimeout.value) {
    clearTimeout(gameSearchTimeout.value)
  }
  gameSearchTimeout.value = setTimeout(searchGames, 300)
})

// Select a game from search results
function selectGame(game: Game) {
  selectedGame.value = game
  gameSearch.value = ''
  gameSearchResults.value = []
}

// Clear selected game
function clearSelectedGame() {
  selectedGame.value = null
}

// Submit report
async function handleSubmit() {
  if (!formValid.value || !selectedGame.value) return

  submitting.value = true
  submitError.value = null

  try {
    const response = await reportsApi.submit({
      game_id: selectedGame.value.id,
      report_type: form.value.report_type as GameReportInput['report_type'],
      description: form.value.description!,
      email: form.value.email!
    })
    trackingId.value = response.data.tracking_id
    submitted.value = true
  } catch (error: any) {
    submitError.value = error.response?.data?.error || 'Failed to submit report. Please try again.'
  } finally {
    submitting.value = false
  }
}

// Reset form for new submission
function resetForm() {
  form.value = {
    report_type: 'broken_link',
    description: '',
    email: ''
  }
  selectedGame.value = null
  gameSearch.value = ''
  gameSearchResults.value = []
  submitted.value = false
  submitError.value = null
  trackingId.value = null
}

// Copy tracking ID to clipboard
function copyTrackingId() {
  if (trackingId.value) {
    navigator.clipboard.writeText(trackingId.value)
  }
}

// Get full tracking URL
function getTrackingUrl(): string {
  return `${window.location.origin}/status/${trackingId.value}`
}

// Copy full tracking URL to clipboard
function copyTrackingUrl() {
  navigator.clipboard.writeText(getTrackingUrl())
}
</script>

<template>
  <div class="report-view">
    <v-container style="max-width: 900px;">
      <v-btn variant="text" to="/" class="mb-4">
        <v-icon start>mdi-arrow-left</v-icon>
        Back to Home
      </v-btn>

      <v-card class="report-card pa-6 pa-md-8" elevation="0">
        <div class="text-center mb-6">
          <v-icon size="64" color="warning" class="mb-4">mdi-alert-circle-outline</v-icon>
          <h1 class="report-title">Report a Problem</h1>
        </div>

        <div class="report-content">
          <p class="mb-4">
            If you encounter any issues with a game on our website, please let us know using the form below. 
            We take all reports seriously and will investigate promptly.
          </p>

          <!-- Success Message -->
          <v-card v-if="submitted" class="pa-6 mb-6" color="success" variant="tonal">
            <div class="text-center mb-6">
              <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
              <h3 class="text-h5 mb-2">Report Submitted Successfully</h3>
              <p class="text-medium-emphasis">
                Thank you for your report. We will review it and take action within 24-48 hours.
              </p>
            </div>

            <!-- Tracking Information -->
            <v-card variant="outlined" class="pa-4 mb-4 tracking-card">
              <p class="text-subtitle-2 text-warning mb-3">
                <v-icon size="18" class="mr-1">mdi-alert</v-icon>
                Important: Save Your Tracking ID
              </p>
              <p class="text-body-2 text-medium-emphasis mb-3">
                Keep this tracking ID to check the status of your report. You won't be able to retrieve it later.
              </p>
              
              <v-text-field
                :model-value="trackingId"
                label="Your Tracking ID"
                variant="outlined"
                readonly
                density="compact"
                class="mb-3"
              >
                <template #append-inner>
                  <v-btn icon variant="text" size="small" @click="copyTrackingId">
                    <v-icon size="18">mdi-content-copy</v-icon>
                    <v-tooltip activator="parent" location="top">Copy ID</v-tooltip>
                  </v-btn>
                </template>
              </v-text-field>

              <p class="text-subtitle-2 mb-2">Direct Link to Check Status:</p>
              <v-text-field
                :model-value="getTrackingUrl()"
                variant="outlined"
                readonly
                density="compact"
                class="mb-3"
              >
                <template #append-inner>
                  <v-btn icon variant="text" size="small" @click="copyTrackingUrl">
                    <v-icon size="18">mdi-content-copy</v-icon>
                    <v-tooltip activator="parent" location="top">Copy Link</v-tooltip>
                  </v-btn>
                </template>
              </v-text-field>

              <v-btn
                :to="`/status/${trackingId}`"
                color="primary"
                variant="outlined"
                block
              >
                <v-icon start>mdi-open-in-new</v-icon>
                Check Status Now
              </v-btn>
            </v-card>

            <div class="text-center">
              <v-btn color="primary" @click="resetForm">Submit Another Report</v-btn>
            </div>
          </v-card>

          <!-- Report Form -->
          <template v-else>
            <v-form v-model="formValid" @submit.prevent="handleSubmit">
              <!-- Game Search -->
              <v-card variant="outlined" class="pa-4 mb-4 game-search-card">
                <p class="text-subtitle-2 mb-3">
                  <v-icon size="18" class="mr-1">mdi-gamepad-variant</v-icon>
                  Select the Game *
                </p>
                
                <template v-if="selectedGame">
                  <v-chip
                    size="large"
                    closable
                    color="primary"
                    class="mb-2"
                    @click:close="clearSelectedGame"
                  >
                    <v-icon start>mdi-gamepad-variant</v-icon>
                    {{ selectedGame.title }}
                  </v-chip>
                  <p class="text-caption text-success">
                    <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
                    Game selected
                  </p>
                </template>

                <template v-else>
                  <v-text-field
                    v-model="gameSearch"
                    placeholder="Search for the game you want to report..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    prepend-inner-icon="mdi-magnify"
                    :loading="gameSearchLoading"
                  />
                  
                  <v-list v-if="gameSearchResults.length > 0" class="game-search-results mt-2" density="compact">
                    <v-list-item
                      v-for="game in gameSearchResults"
                      :key="game.id"
                      @click="selectGame(game)"
                    >
                      <template #prepend>
                        <v-avatar size="40" rounded="sm">
                          <v-img :src="game.cover_image ? `http://localhost:3001${game.cover_image}` : '/placeholder-game.svg'" />
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ game.title }}</v-list-item-title>
                      <v-list-item-subtitle>{{ game.genres?.join(', ') || 'No genres' }}</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                  
                  <p v-if="gameSearch && gameSearch.length >= 2 && !gameSearchLoading && gameSearchResults.length === 0" class="text-caption text-warning mt-2">
                    <v-icon size="14" class="mr-1">mdi-alert</v-icon>
                    No games found matching "{{ gameSearch }}". Please try a different search term.
                  </p>
                  
                  <p v-if="!gameSearch" class="text-caption text-medium-emphasis mt-2">
                    Start typing to search for a game on our site.
                  </p>
                </template>
              </v-card>

              <v-row>
                <!-- Report Type -->
                <v-col cols="12">
                  <p class="text-subtitle-2 mb-3">Issue Type *</p>
                  <v-radio-group v-model="form.report_type" :rules="[rules.required]">
                    <v-radio
                      v-for="type in reportTypes"
                      :key="type.value"
                      :value="type.value"
                      class="report-type-radio mb-2"
                    >
                      <template #label>
                        <div class="d-flex align-center">
                          <v-icon :icon="type.icon" size="20" class="mr-2" />
                          <div>
                            <span class="font-weight-medium">{{ type.title }}</span>
                            <br>
                            <span class="text-caption text-medium-emphasis">{{ type.description }}</span>
                          </div>
                        </div>
                      </template>
                    </v-radio>
                  </v-radio-group>
                </v-col>

                <!-- Description -->
                <v-col cols="12">
                  <v-textarea
                    v-model="form.description"
                    label="Description *"
                    variant="outlined"
                    rows="4"
                    :rules="[rules.required]"
                    placeholder="Please describe the problem in detail..."
                  />
                </v-col>

                <!-- Email -->
                <v-col cols="12">
                  <v-text-field
                    v-model="form.email"
                    label="Email Address *"
                    variant="outlined"
                    type="email"
                    :rules="[rules.required, rules.email]"
                    placeholder="your@email.com"
                    hint="We'll contact you if we need more information"
                    persistent-hint
                  />
                </v-col>
              </v-row>

              <!-- Error Message -->
              <v-alert v-if="submitError" type="error" variant="tonal" class="mb-4">
                {{ submitError }}
              </v-alert>

              <!-- Submit Button -->
              <div class="d-flex justify-end">
                <v-btn
                  type="submit"
                  color="warning"
                  size="large"
                  :loading="submitting"
                  :disabled="!formValid || !selectedGame"
                >
                  <v-icon start>mdi-send</v-icon>
                  Submit Report
                </v-btn>
              </div>
              
              <p v-if="formValid && !selectedGame" class="text-caption text-warning text-right mt-2">
                <v-icon size="14" class="mr-1">mdi-alert</v-icon>
                Please select a game above to submit the report.
              </p>
            </v-form>
          </template>

          <v-divider class="my-6" />

          <!-- Response Time -->
          <v-card variant="outlined" class="pa-4 mb-6 response-card">
            <div class="d-flex align-center">
              <v-icon size="48" color="info" class="mr-4">mdi-clock-outline</v-icon>
              <div>
                <p class="text-h6 mb-1">Response Time</p>
                <p class="text-medium-emphasis mb-0">
                  We typically review and respond to reports within 24-48 hours.
                </p>
              </div>
            </div>
          </v-card>

          <v-alert type="info" variant="tonal">
            For copyright-related concerns, please visit our <router-link to="/dmca" class="text-primary">DMCA page</router-link>.
          </v-alert>
        </div>
      </v-card>
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.report-view {
  min-height: calc(100vh - 72px);
  padding: 2rem 0 4rem;
}

.report-card {
  background: rgba(13, 33, 55, 0.8) !important;
  border: 1px solid rgba(72, 202, 228, 0.1);
  border-radius: 16px;
}

.report-title {
  font-family: 'Montserrat', sans-serif;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, #48cae4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.report-content {
  h3 {
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
    color: #48cae4;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.7;
  }
}

.game-search-card {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(72, 202, 228, 0.2) !important;
}

.game-search-results {
  background: rgba(13, 33, 55, 0.95);
  border-radius: 8px;
  max-height: 250px;
  overflow-y: auto;
  
  :deep(.v-list-item) {
    cursor: pointer;
    
    &:hover {
      background: rgba(72, 202, 228, 0.1);
    }
  }
}

.report-type-radio {
  :deep(.v-label) {
    opacity: 1;
  }
}

.response-card {
  border-color: rgba(72, 202, 228, 0.3) !important;
  background: rgba(0, 0, 0, 0.2);
}

.tracking-card {
  background: rgba(0, 0, 0, 0.3) !important;
  border-color: rgba(255, 193, 7, 0.3) !important;
}
</style>
