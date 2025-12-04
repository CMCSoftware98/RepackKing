<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGamesStore } from '@/stores/games'
import { formatSize, getImageUrl, reportsApi, ratingsApi, type RatingStats } from '@/services/api'

const route = useRoute()
const router = useRouter()
const gamesStore = useGamesStore()

const slug = computed(() => route.params.slug as string)
const game = computed(() => gamesStore.currentGame)
const imageUrl = computed(() => getImageUrl(game.value?.cover_image ?? null))
const formattedSize = computed(() => {
  if (!game.value?.size_bytes) return 'Unknown'
  return formatSize(game.value.size_bytes)
})

const hasMinRequirements = computed(() => {
  if (!game.value) return false
  return game.value.min_cpu || game.value.min_gpu || game.value.min_ram || 
         game.value.min_storage || game.value.min_os
})

const hasRecRequirements = computed(() => {
  if (!game.value) return false
  return game.value.rec_cpu || game.value.rec_gpu || game.value.rec_ram || 
         game.value.rec_storage || game.value.rec_os
})

const hasScreenshots = computed(() => {
  return game.value?.screenshots && game.value.screenshots.length > 0
})

// Screenshot gallery state
const screenshotDialog = ref(false)
const currentScreenshotIndex = ref(0)

function openScreenshot(index: number) {
  currentScreenshotIndex.value = index
  screenshotDialog.value = true
}

function nextScreenshot() {
  if (!game.value?.screenshots) return
  currentScreenshotIndex.value = (currentScreenshotIndex.value + 1) % game.value.screenshots.length
}

function prevScreenshot() {
  if (!game.value?.screenshots) return
  currentScreenshotIndex.value = currentScreenshotIndex.value === 0 
    ? game.value.screenshots.length - 1 
    : currentScreenshotIndex.value - 1
}

function handleKeydown(e: KeyboardEvent) {
  if (!screenshotDialog.value) return
  if (e.key === 'ArrowRight') nextScreenshot()
  if (e.key === 'ArrowLeft') prevScreenshot()
  if (e.key === 'Escape') screenshotDialog.value = false
}

// Rating state
const ratingStats = ref<RatingStats | null>(null)
const ratingDialog = ref(false)
const selectedRating = ref(0)
const hoverRating = ref(0)
const ratingSubmitting = ref(false)
const ratingSubmitted = ref(false)

// Report dialog state
const reportDialog = ref(false)
const reportSubmitting = ref(false)
const reportSuccess = ref(false)
const reportError = ref<string | null>(null)
const reportFormValid = ref(false)
const reportForm = ref({
  report_type: 'broken_link' as 'broken_link' | 'wrong_info' | 'malware' | 'other',
  description: '',
  email: ''
})

const reportTypes = [
  { value: 'broken_link', title: 'Broken/Dead Link', icon: 'mdi-link-off' },
  { value: 'wrong_info', title: 'Wrong Information', icon: 'mdi-information-off' },
  { value: 'malware', title: 'Malware/Virus', icon: 'mdi-virus' },
  { value: 'other', title: 'Other Issue', icon: 'mdi-help-circle' }
]

const reportRules = {
  required: (v: string) => !!v || 'This field is required',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email format'
}

const ratingLabels = ['Terrible', 'Poor', 'Average', 'Good', 'Excellent']

async function loadRatingStats() {
  if (!game.value) return
  try {
    const response = await ratingsApi.getStats(game.value.id)
    ratingStats.value = response.data
  } catch (error) {
    console.error('Failed to load rating stats:', error)
  }
}

async function handleDownload() {
  if (!game.value?.magnet_uri) return
  
  // Track download
  await gamesStore.trackDownload(game.value.id)
  
  // Open magnet link (will trigger torrent client)
  window.location.href = game.value.magnet_uri
  
  // Show rating dialog after a short delay
  setTimeout(() => {
    ratingDialog.value = true
  }, 1500)
}

function setHoverRating(star: number) {
  hoverRating.value = star
}

function clearHoverRating() {
  hoverRating.value = 0
}

function setRating(star: number) {
  selectedRating.value = star
}

async function submitRating() {
  if (!game.value || selectedRating.value === 0) return
  
  ratingSubmitting.value = true
  
  try {
    const response = await ratingsApi.submit(game.value.id, selectedRating.value)
    ratingStats.value = response.data.stats
    ratingSubmitted.value = true
    
    setTimeout(() => {
      ratingDialog.value = false
      // Reset for next time
      setTimeout(() => {
        selectedRating.value = 0
        ratingSubmitted.value = false
      }, 300)
    }, 1500)
  } catch (error) {
    console.error('Failed to submit rating:', error)
  } finally {
    ratingSubmitting.value = false
  }
}

function skipRating() {
  ratingDialog.value = false
  selectedRating.value = 0
}

function openReportDialog() {
  reportForm.value = {
    report_type: 'broken_link',
    description: '',
    email: ''
  }
  reportSuccess.value = false
  reportError.value = null
  reportDialog.value = true
}

async function submitReport() {
  if (!game.value || !reportFormValid.value) return
  
  reportSubmitting.value = true
  reportError.value = null
  
  try {
    await reportsApi.submit({
      game_id: game.value.id,
      report_type: reportForm.value.report_type,
      description: reportForm.value.description,
      email: reportForm.value.email
    })
    reportSuccess.value = true
    setTimeout(() => {
      reportDialog.value = false
    }, 2000)
  } catch (err: any) {
    reportError.value = err.response?.data?.error || 'Failed to submit report'
  } finally {
    reportSubmitting.value = false
  }
}

onMounted(async () => {
  await gamesStore.fetchGame(slug.value)
  loadRatingStats()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  gamesStore.clearCurrentGame()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="game-detail">
    <v-container style="max-width: 1200px;">
      <!-- Back Button -->
      <v-btn
        variant="text"
        class="mb-4"
        @click="router.push('/browse')"
      >
        <v-icon start>mdi-arrow-left</v-icon>
        Back to Browse
      </v-btn>

      <!-- Loading State -->
      <div v-if="gamesStore.loading" class="game-detail__loading">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-medium-emphasis">Loading game details...</p>
      </div>

      <!-- Error State -->
      <v-alert
        v-else-if="gamesStore.error"
        type="error"
        variant="tonal"
        class="mb-6"
      >
        {{ gamesStore.error }}
        <template #append>
          <v-btn variant="text" @click="router.push('/browse')">
            Browse Games
          </v-btn>
        </template>
      </v-alert>

      <!-- Game Content -->
      <template v-else-if="game">
        <div class="game-detail__content">
          <!-- Cover Image -->
          <div class="game-detail__image-section">
            <div class="game-detail__image-container">
              <img
                :src="imageUrl"
                :alt="game.title"
                class="game-detail__image"
              />
            </div>
            
            <!-- Download Button (Mobile) -->
            <div class="game-detail__download-mobile d-md-none mt-4">
              <v-btn
                v-if="game.magnet_uri"
                color="primary"
                size="large"
                block
                @click="handleDownload"
              >
                <v-icon start>mdi-magnet</v-icon>
                Download Magnet
              </v-btn>
              <v-btn
                v-else
                color="grey"
                size="large"
                block
                disabled
              >
                <v-icon start>mdi-magnet-on</v-icon>
                No Download Available
              </v-btn>
            </div>
          </div>

          <!-- Info Section -->
          <div class="game-detail__info-section">
            <h1 class="game-detail__title">{{ game.title }}</h1>
            
            <!-- Meta Info -->
            <div class="game-detail__meta">
              <v-chip color="primary" variant="tonal" size="large">
                <v-icon start>mdi-harddisk</v-icon>
                {{ formattedSize }}
              </v-chip>
              <v-chip v-if="game.version" color="secondary" variant="tonal" size="large">
                <v-icon start>mdi-tag</v-icon>
                v{{ game.version }}
              </v-chip>
              <!-- Rating Display -->
              <v-chip 
                v-if="ratingStats && ratingStats.count > 0" 
                color="warning" 
                variant="tonal" 
                size="large"
              >
                <v-icon start>mdi-star</v-icon>
                {{ ratingStats.average.toFixed(1) }}
                <span class="text-caption ml-1">({{ ratingStats.count }})</span>
              </v-chip>
            </div>

            <!-- Genres -->
            <div v-if="game.genres && game.genres.length > 0" class="game-detail__genres">
              <v-chip
                v-for="genre in game.genres"
                :key="genre"
                size="small"
                variant="outlined"
                color="info"
                class="mr-2 mb-2"
              >
                {{ genre }}
              </v-chip>
            </div>

            <!-- Description -->
            <div class="game-detail__description">
              <h3 class="game-detail__section-title">Description</h3>
              <p v-if="game.description" class="text-medium-emphasis">
                {{ game.description }}
              </p>
              <p v-else class="text-medium-emphasis font-italic">
                No description available.
              </p>
            </div>

            <!-- Screenshots Gallery -->
            <div v-if="hasScreenshots" class="game-detail__screenshots">
              <h3 class="game-detail__section-title">Screenshots</h3>
              <div class="screenshots-grid">
                <div
                  v-for="(screenshot, index) in game.screenshots"
                  :key="index"
                  class="screenshot-thumb"
                  @click="openScreenshot(index)"
                >
                  <img
                    :src="getImageUrl(screenshot)"
                    :alt="`Screenshot ${index + 1}`"
                    loading="lazy"
                  />
                  <div class="screenshot-overlay">
                    <v-icon>mdi-magnify-plus</v-icon>
                  </div>
                </div>
              </div>
            </div>

            <!-- System Requirements -->
            <div v-if="hasMinRequirements || hasRecRequirements" class="game-detail__requirements">
              <h3 class="game-detail__section-title">System Requirements</h3>
              
              <v-row>
                <!-- Minimum Requirements -->
                <v-col v-if="hasMinRequirements" cols="12" :md="hasRecRequirements ? 6 : 12">
                  <div class="requirements-card">
                    <h4 class="requirements-title">Minimum</h4>
                    <v-table class="requirements-table" density="compact">
                      <tbody>
                        <tr v-if="game.min_os">
                          <td class="text-medium-emphasis">OS</td>
                          <td>{{ game.min_os }}</td>
                        </tr>
                        <tr v-if="game.min_cpu">
                          <td class="text-medium-emphasis">CPU</td>
                          <td>{{ game.min_cpu }}</td>
                        </tr>
                        <tr v-if="game.min_gpu">
                          <td class="text-medium-emphasis">GPU</td>
                          <td>{{ game.min_gpu }}</td>
                        </tr>
                        <tr v-if="game.min_ram">
                          <td class="text-medium-emphasis">RAM</td>
                          <td>{{ game.min_ram }}</td>
                        </tr>
                        <tr v-if="game.min_storage">
                          <td class="text-medium-emphasis">Storage</td>
                          <td>{{ game.min_storage }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </div>
                </v-col>

                <!-- Recommended Requirements -->
                <v-col v-if="hasRecRequirements" cols="12" :md="hasMinRequirements ? 6 : 12">
                  <div class="requirements-card requirements-card--recommended">
                    <h4 class="requirements-title">Recommended</h4>
                    <v-table class="requirements-table" density="compact">
                      <tbody>
                        <tr v-if="game.rec_os">
                          <td class="text-medium-emphasis">OS</td>
                          <td>{{ game.rec_os }}</td>
                        </tr>
                        <tr v-if="game.rec_cpu">
                          <td class="text-medium-emphasis">CPU</td>
                          <td>{{ game.rec_cpu }}</td>
                        </tr>
                        <tr v-if="game.rec_gpu">
                          <td class="text-medium-emphasis">GPU</td>
                          <td>{{ game.rec_gpu }}</td>
                        </tr>
                        <tr v-if="game.rec_ram">
                          <td class="text-medium-emphasis">RAM</td>
                          <td>{{ game.rec_ram }}</td>
                        </tr>
                        <tr v-if="game.rec_storage">
                          <td class="text-medium-emphasis">Storage</td>
                          <td>{{ game.rec_storage }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </div>
                </v-col>
              </v-row>
            </div>

            <!-- Action Buttons -->
            <div class="game-detail__actions">
              <!-- Download Button (Desktop) -->
              <div class="d-none d-md-block">
                <v-btn
                  v-if="game.magnet_uri"
                  color="primary"
                  size="x-large"
                  @click="handleDownload"
                >
                  <v-icon start>mdi-magnet</v-icon>
                  Download Magnet
                </v-btn>
                <v-btn
                  v-else
                  color="grey"
                  size="x-large"
                  disabled
                >
                  <v-icon start>mdi-magnet-on</v-icon>
                  No Download Available
                </v-btn>
              </div>

              <!-- Report Button -->
              <v-btn
                variant="tonal"
                color="warning"
                @click="openReportDialog"
              >
                <v-icon start>mdi-flag</v-icon>
                Report Issue
              </v-btn>
            </div>
          </div>
        </div>
      </template>
    </v-container>

    <!-- Rating Dialog -->
    <v-dialog v-model="ratingDialog" max-width="400" persistent>
      <v-card class="rating-dialog">
        <v-card-title class="text-center pt-6">
          <v-icon size="48" color="warning" class="mb-2">mdi-star-circle</v-icon>
          <div class="text-h5">Rate This Download</div>
        </v-card-title>
        
        <v-card-text class="text-center">
          <template v-if="!ratingSubmitted">
            <p class="text-medium-emphasis mb-4">
              Did the torrent work well? Help others by rating this download.
            </p>

            <!-- Star Rating -->
            <div class="star-rating mb-2">
              <v-btn
                v-for="star in 5"
                :key="star"
                icon
                variant="text"
                size="x-large"
                @mouseenter="setHoverRating(star)"
                @mouseleave="clearHoverRating"
                @click="setRating(star)"
              >
                <v-icon 
                  size="40"
                  :color="(hoverRating || selectedRating) >= star ? 'warning' : 'grey'"
                >
                  {{ (hoverRating || selectedRating) >= star ? 'mdi-star' : 'mdi-star-outline' }}
                </v-icon>
              </v-btn>
            </div>

            <!-- Rating Label -->
            <p 
              v-if="hoverRating || selectedRating" 
              class="text-subtitle-1 font-weight-medium"
              :class="selectedRating ? 'text-warning' : 'text-medium-emphasis'"
            >
              {{ ratingLabels[(hoverRating || selectedRating) - 1] }}
            </p>
            <p v-else class="text-subtitle-1 text-medium-emphasis">
              Click a star to rate
            </p>
          </template>

          <template v-else>
            <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
            <p class="text-h6">Thank you for your feedback!</p>
          </template>
        </v-card-text>

        <v-card-actions v-if="!ratingSubmitted" class="justify-center pb-6">
          <v-btn variant="text" @click="skipRating">
            Skip
          </v-btn>
          <v-btn
            color="warning"
            :disabled="selectedRating === 0"
            :loading="ratingSubmitting"
            @click="submitRating"
          >
            Submit Rating
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Report Dialog -->
    <v-dialog v-model="reportDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-flag</v-icon>
          Report Issue
        </v-card-title>
        
        <v-card-text>
          <v-alert v-if="reportSuccess" type="success" variant="tonal" class="mb-4">
            Report submitted successfully! Thank you for helping us improve.
          </v-alert>
          
          <v-alert v-if="reportError" type="error" variant="tonal" class="mb-4">
            {{ reportError }}
          </v-alert>

          <template v-if="!reportSuccess">
            <p class="text-medium-emphasis mb-4">
              Reporting an issue with: <strong>{{ game?.title }}</strong>
            </p>

            <v-form v-model="reportFormValid">
              <v-select
                v-model="reportForm.report_type"
                :items="reportTypes"
                item-title="title"
                item-value="value"
                label="Issue Type *"
                variant="outlined"
                :rules="[reportRules.required]"
                class="mb-4"
              >
                <template #item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-icon :icon="item.raw.icon" class="mr-2" />
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <v-textarea
                v-model="reportForm.description"
                label="Description *"
                variant="outlined"
                rows="3"
                :rules="[reportRules.required]"
                placeholder="Please describe the issue in detail..."
                class="mb-4"
              />

              <v-text-field
                v-model="reportForm.email"
                label="Email *"
                variant="outlined"
                type="email"
                :rules="[reportRules.required, reportRules.email]"
                placeholder="your@email.com"
                hint="We'll contact you if we need more information"
                persistent-hint
              />
            </v-form>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="reportDialog = false">
            {{ reportSuccess ? 'Close' : 'Cancel' }}
          </v-btn>
          <v-btn
            v-if="!reportSuccess"
            color="warning"
            :loading="reportSubmitting"
            :disabled="!reportFormValid"
            @click="submitReport"
          >
            Submit Report
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Screenshot Lightbox Dialog -->
    <v-dialog 
      v-model="screenshotDialog" 
      max-width="1200" 
      content-class="screenshot-lightbox"
    >
      <div class="lightbox-container" v-if="game?.screenshots">
        <!-- Close button -->
        <v-btn
          icon
          variant="text"
          class="lightbox-close"
          @click="screenshotDialog = false"
        >
          <v-icon size="32">mdi-close</v-icon>
        </v-btn>

        <!-- Previous button -->
        <v-btn
          v-if="game.screenshots.length > 1"
          icon
          variant="text"
          class="lightbox-nav lightbox-prev"
          @click="prevScreenshot"
        >
          <v-icon size="48">mdi-chevron-left</v-icon>
        </v-btn>

        <!-- Main image -->
        <div class="lightbox-image-wrapper">
          <img
            :src="getImageUrl(game.screenshots[currentScreenshotIndex])"
            :alt="`Screenshot ${currentScreenshotIndex + 1}`"
            class="lightbox-image"
          />
        </div>

        <!-- Next button -->
        <v-btn
          v-if="game.screenshots.length > 1"
          icon
          variant="text"
          class="lightbox-nav lightbox-next"
          @click="nextScreenshot"
        >
          <v-icon size="48">mdi-chevron-right</v-icon>
        </v-btn>

        <!-- Image counter -->
        <div class="lightbox-counter">
          {{ currentScreenshotIndex + 1 }} / {{ game.screenshots.length }}
        </div>

        <!-- Thumbnail strip -->
        <div v-if="game.screenshots.length > 1" class="lightbox-thumbnails">
          <div
            v-for="(screenshot, index) in game.screenshots"
            :key="index"
            class="lightbox-thumb"
            :class="{ active: index === currentScreenshotIndex }"
            @click="currentScreenshotIndex = index"
          >
            <img :src="getImageUrl(screenshot)" :alt="`Thumbnail ${index + 1}`" />
          </div>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<style scoped lang="scss">
.game-detail {
  min-height: calc(100vh - 72px);
  padding: 2rem 0 4rem;

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
  }

  &__content {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 3rem;
    
    @media (max-width: 960px) {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  &__image-section {
    @media (max-width: 960px) {
      max-width: 350px;
      margin: 0 auto;
    }
  }

  &__image-container {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    aspect-ratio: 3 / 4;
    background: rgba(13, 33, 55, 0.8);
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__info-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__title {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 700;
    background: linear-gradient(135deg, #ffffff 0%, #48cae4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__genres {
    display: flex;
    flex-wrap: wrap;
  }

  &__section-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
    color: #48cae4;
    margin-bottom: 0.75rem;
  }

  &__description {
    p {
      line-height: 1.7;
      white-space: pre-line;
    }
  }

  &__requirements {
    background: rgba(13, 33, 55, 0.5);
    border-radius: 12px;
    padding: 1.25rem;
    border: 1px solid rgba(72, 202, 228, 0.1);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    
    .v-btn {
      text-transform: none;
      font-weight: 600;
      letter-spacing: 0;
    }
  }
}

.requirements-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
  height: 100%;

  &--recommended {
    background: rgba(72, 202, 228, 0.1);
  }
}

.requirements-title {
  font-family: 'Montserrat', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #48cae4;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.requirements-table {
  background: transparent !important;

  :deep(tr) {
    &:hover {
      background: rgba(72, 202, 228, 0.05) !important;
    }
  }

  :deep(td) {
    border-bottom: 1px solid rgba(72, 202, 228, 0.1) !important;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;

    &:first-child {
      width: 80px;
      font-weight: 500;
    }
  }

  :deep(tr:last-child td) {
    border-bottom: none !important;
  }
}

// Rating Dialog Styles
.rating-dialog {
  background: rgba(13, 33, 55, 0.95) !important;
  backdrop-filter: blur(10px);
}

.star-rating {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
  
  .v-btn {
    transition: transform 0.2s ease;
    
    &:hover {
      transform: scale(1.15);
    }
  }
}

// Screenshots Gallery Styles
.screenshots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
}

.screenshot-thumb {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 16 / 9;
  background: rgba(0, 0, 0, 0.3);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  &:hover {
    img {
      transform: scale(1.05);
    }
    
    .screenshot-overlay {
      opacity: 1;
    }
  }
}

.screenshot-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  .v-icon {
    color: white;
    font-size: 2rem;
  }
}

// Lightbox Styles
.lightbox-container {
  position: relative;
  background: rgba(0, 0, 0, 0.95);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  max-height: 90vh;
}

.lightbox-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
  color: white !important;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  color: white !important;
  background: rgba(0, 0, 0, 0.3) !important;
  
  &:hover {
    background: rgba(0, 0, 0, 0.5) !important;
  }
}

.lightbox-prev {
  left: 0.5rem;
}

.lightbox-next {
  right: 0.5rem;
}

.lightbox-image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  min-height: 300px;
  max-height: calc(90vh - 150px);
}

.lightbox-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.lightbox-counter {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-top: 0.75rem;
  font-family: 'Montserrat', sans-serif;
}

.lightbox-thumbnails {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.5rem;
  overflow-x: auto;
  max-width: 100%;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
}

.lightbox-thumb {
  flex-shrink: 0;
  width: 80px;
  height: 45px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s ease, transform 0.2s ease;
  border: 2px solid transparent;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &:hover {
    opacity: 0.8;
  }
  
  &.active {
    opacity: 1;
    border-color: #48cae4;
  }
}
</style>
