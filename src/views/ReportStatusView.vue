<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { noticesApi, reportsApi, type TrackingStatus } from '@/services/api'

const route = useRoute()

// State
const trackingId = ref('')
const status = ref<TrackingStatus | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const searched = ref(false)

// Check if we have a tracking ID in the URL
const urlTrackingId = computed(() => route.params.trackingId as string || '')

// Status display config
const statusConfig: Record<string, { color: string; icon: string; label: string; description: string }> = {
  // DMCA statuses
  pending: { 
    color: 'warning', 
    icon: 'mdi-clock-outline', 
    label: 'Pending Review',
    description: 'Your submission has been received and is waiting to be reviewed by our team.'
  },
  reviewing: { 
    color: 'info', 
    icon: 'mdi-magnify', 
    label: 'Under Review',
    description: 'Our team is currently reviewing your submission.'
  },
  approved: { 
    color: 'success', 
    icon: 'mdi-check-circle', 
    label: 'Approved',
    description: 'Your submission has been approved and action will be taken.'
  },
  rejected: { 
    color: 'error', 
    icon: 'mdi-close-circle', 
    label: 'Rejected',
    description: 'Your submission has been reviewed but was not approved.'
  },
  completed: { 
    color: 'success', 
    icon: 'mdi-check-all', 
    label: 'Completed',
    description: 'Your request has been fully processed and completed.'
  },
  // Report statuses
  reviewed: { 
    color: 'info', 
    icon: 'mdi-eye-check', 
    label: 'Reviewed',
    description: 'Your report has been reviewed by our team.'
  },
  resolved: { 
    color: 'success', 
    icon: 'mdi-check-circle', 
    label: 'Resolved',
    description: 'The issue you reported has been resolved. Thank you for your help!'
  },
  dismissed: { 
    color: 'grey', 
    icon: 'mdi-close-circle-outline', 
    label: 'Dismissed',
    description: 'Your report has been reviewed but no action was required.'
  }
}

const currentStatusConfig = computed(() => {
  if (!status.value) return null
  return statusConfig[status.value.status] || statusConfig.pending
})

const typeLabel = computed(() => {
  if (!status.value) return ''
  return status.value.type === 'dmca' ? 'DMCA Notice' : 'Problem Report'
})

// Lookup status
async function lookupStatus() {
  if (!trackingId.value.trim()) {
    error.value = 'Please enter a tracking ID'
    return
  }

  loading.value = true
  error.value = null
  status.value = null
  searched.value = true

  try {
    // Try DMCA notices first
    const dmcaResponse = await noticesApi.track(trackingId.value.trim())
    status.value = dmcaResponse.data
  } catch {
    // Try reports if DMCA fails
    try {
      const reportResponse = await reportsApi.track(trackingId.value.trim())
      status.value = reportResponse.data
    } catch {
      error.value = 'No submission found with that tracking ID. Please check and try again.'
    }
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

function copyTrackingId() {
  navigator.clipboard.writeText(trackingId.value)
}

onMounted(() => {
  if (urlTrackingId.value) {
    trackingId.value = urlTrackingId.value
    lookupStatus()
  }
})
</script>

<template>
  <div class="status-view">
    <v-container style="max-width: 700px;">
      <v-btn variant="text" to="/" class="mb-4">
        <v-icon start>mdi-arrow-left</v-icon>
        Back to Home
      </v-btn>

      <v-card class="status-card pa-6 pa-md-8" elevation="0">
        <div class="text-center mb-6">
          <v-icon size="64" color="info" class="mb-4">mdi-clipboard-text-search</v-icon>
          <h1 class="status-title">Check Submission Status</h1>
          <p class="text-medium-emphasis mt-2">
            Enter your tracking ID to check the status of your DMCA notice or problem report.
          </p>
        </div>

        <!-- Search Form -->
        <v-form @submit.prevent="lookupStatus" class="mb-6">
          <v-text-field
            v-model="trackingId"
            label="Tracking ID"
            variant="outlined"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            prepend-inner-icon="mdi-identifier"
            :loading="loading"
            :error-messages="error && searched ? [error] : []"
            @update:model-value="error = null"
          >
            <template #append-inner>
              <v-btn
                v-if="trackingId"
                icon
                variant="text"
                size="small"
                @click="copyTrackingId"
              >
                <v-icon size="18">mdi-content-copy</v-icon>
                <v-tooltip activator="parent" location="top">Copy ID</v-tooltip>
              </v-btn>
            </template>
          </v-text-field>

          <v-btn
            type="submit"
            color="primary"
            size="large"
            block
            :loading="loading"
            :disabled="!trackingId.trim()"
          >
            <v-icon start>mdi-magnify</v-icon>
            Check Status
          </v-btn>
        </v-form>

            <!-- Status Result -->
        <v-expand-transition>
          <v-card v-if="status && currentStatusConfig" class="status-result pa-6" variant="tonal" :color="currentStatusConfig.color">
            <div class="text-center">
              <v-icon :color="currentStatusConfig.color" size="80" class="mb-4">
                {{ currentStatusConfig.icon }}
              </v-icon>
              
              <v-chip :color="currentStatusConfig.color" variant="elevated" size="large" class="mb-4">
                {{ currentStatusConfig.label }}
              </v-chip>
              
              <h3 class="text-h5 mb-2">{{ typeLabel }}</h3>
              
              <p class="text-medium-emphasis mb-6">
                {{ currentStatusConfig.description }}
              </p>

              <!-- Admin Response / Public Note -->
              <v-card v-if="status.public_note" class="admin-response mb-6 pa-4 text-left" color="surface" variant="outlined">
                <div class="d-flex align-center mb-2">
                  <v-icon size="20" color="info" class="mr-2">mdi-message-reply-text</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">Admin Response</span>
                </div>
                <p class="mb-0" style="white-space: pre-wrap;">{{ status.public_note }}</p>
              </v-card>

              <v-divider class="mb-4" />

              <v-row dense class="text-left">
                <v-col cols="12" sm="6">
                  <p class="text-caption text-medium-emphasis mb-1">Submitted</p>
                  <p class="font-weight-medium">{{ formatDate(status.submitted_at) }}</p>
                </v-col>
                <v-col cols="12" sm="6">
                  <p class="text-caption text-medium-emphasis mb-1">Last Updated</p>
                  <p class="font-weight-medium">{{ formatDate(status.updated_at) }}</p>
                </v-col>
                <v-col cols="12">
                  <p class="text-caption text-medium-emphasis mb-1">Tracking ID</p>
                  <p class="font-weight-medium text-mono" style="word-break: break-all;">{{ status.tracking_id }}</p>
                </v-col>
              </v-row>
            </div>
          </v-card>
        </v-expand-transition>

        <!-- Help Text -->
        <v-alert type="info" variant="tonal" class="mt-6">
          <p class="mb-2"><strong>Where can I find my tracking ID?</strong></p>
          <p class="mb-0 text-body-2">
            Your tracking ID was provided when you submitted your DMCA notice or problem report. 
            If you didn't save it, please submit a new request or contact us for assistance.
          </p>
        </v-alert>
      </v-card>
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.status-view {
  min-height: calc(100vh - 72px);
  padding: 2rem 0 4rem;
}

.status-card {
  background: rgba(13, 33, 55, 0.8) !important;
  border: 1px solid rgba(72, 202, 228, 0.1);
  border-radius: 16px;
}

.status-title {
  font-family: 'Montserrat', sans-serif;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, #48cae4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.status-result {
  border-radius: 12px;
}

.text-mono {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.85rem;
}

.admin-response {
  background: rgba(13, 33, 55, 0.9) !important;
  border-color: rgba(72, 202, 228, 0.3) !important;
  border-radius: 12px;

  .text-subtitle-2 {
    color: #ffffff !important;
  }

  p {
    color: rgba(255, 255, 255, 0.9) !important;
  }
}
</style>
