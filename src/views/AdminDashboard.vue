<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { analyticsApi, type AnalyticsStats } from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()

const stats = ref<AnalyticsStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const timePeriod = ref('all')

const timePeriodOptions = [
  { title: 'All Time', value: 'all' },
  { title: 'Last 30 Days', value: '30d' },
  { title: 'Last 7 Days', value: '7d' },
  { title: 'Last 24 Hours', value: '24h' },
]

const overviewCards = computed(() => {
  if (!stats.value) return []
  return [
    { title: 'Total Games', value: stats.value.overview.totalGames, icon: 'mdi-gamepad-variant', color: 'primary' },
    { title: 'Total Views', value: stats.value.overview.totalViews, icon: 'mdi-eye', color: 'info' },
    { title: 'Total Downloads', value: stats.value.overview.totalDownloads, icon: 'mdi-download', color: 'success' },
  ]
})

// Chart data
const viewsChartData = computed(() => {
  if (!stats.value?.dailyStats) return []
  return stats.value.dailyStats.map(d => d.views)
})

const downloadsChartData = computed(() => {
  if (!stats.value?.dailyStats) return []
  return stats.value.dailyStats.map(d => d.downloads)
})

const chartLabels = computed(() => {
  if (!stats.value?.dailyStats) return []
  return stats.value.dailyStats.map(d => {
    const date = new Date(d.date)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
})

const maxViewValue = computed(() => {
  return Math.max(...viewsChartData.value, 1)
})

const maxDownloadValue = computed(() => {
  return Math.max(...downloadsChartData.value, 1)
})

async function loadStats() {
  loading.value = true
  error.value = null
  try {
    const response = await analyticsApi.getStats(timePeriod.value)
    stats.value = response.data
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load statistics'
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/admin/login')
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now'
  // Less than 1 hour
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  // Less than 24 hours
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  // Less than 7 days
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  
  return date.toLocaleDateString()
}

watch(timePeriod, () => {
  loadStats()
})

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="admin-dashboard">
    <v-container style="max-width: 1400px;">
      <!-- Header -->
      <header class="admin-header d-flex justify-space-between align-center flex-wrap ga-4 mb-6">
        <div>
          <h1 class="admin-title">Admin Dashboard</h1>
          <p class="text-medium-emphasis">Welcome back, {{ authStore.user?.username }}</p>
        </div>
        <div class="d-flex ga-2 flex-wrap">
          <v-btn color="primary" :to="{ name: 'admin-games' }">
            <v-icon start>mdi-gamepad-variant</v-icon>
            Manage Games
          </v-btn>
          <v-btn color="error" variant="tonal" :to="{ name: 'admin-notices' }">
            <v-icon start>mdi-shield-alert</v-icon>
            DMCA Notices
          </v-btn>
          <v-btn variant="outlined" @click="handleLogout">
            <v-icon start>mdi-logout</v-icon>
            Logout
          </v-btn>
        </div>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-medium-emphasis">Loading statistics...</p>
      </div>

      <!-- Error -->
      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-6">
        {{ error }}
        <template #append>
          <v-btn variant="text" @click="loadStats">Retry</v-btn>
        </template>
      </v-alert>

      <!-- Stats Content -->
      <template v-else-if="stats">
        <!-- Overview Cards -->
        <v-row class="mb-6">
          <v-col v-for="card in overviewCards" :key="card.title" cols="12" md="4">
            <v-card class="stat-card pa-6" elevation="0">
              <div class="d-flex align-center">
                <v-avatar :color="card.color" size="56" class="mr-4">
                  <v-icon size="28" color="white">{{ card.icon }}</v-icon>
                </v-avatar>
                <div>
                  <p class="text-medium-emphasis text-body-2 mb-1">{{ card.title }}</p>
                  <p class="text-h4 font-weight-bold">{{ card.value.toLocaleString() }}</p>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Recent Activity (Full Width - Top) -->
        <v-row class="mb-6">
          <v-col cols="12">
            <v-card class="stat-card" elevation="0">
              <v-card-title class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <v-icon color="warning" class="mr-2">mdi-history</v-icon>
                  Recent Activity
                </div>
                <v-chip size="small" variant="tonal" color="warning">
                  Live
                </v-chip>
              </v-card-title>
              <v-card-text>
                <div v-if="stats.recentActivity.length > 0" class="activity-list">
                  <div 
                    v-for="activity in stats.recentActivity.slice(0, 15)" 
                    :key="activity.id"
                    class="activity-item"
                  >
                    <v-avatar 
                      :color="activity.event_type === 'view' ? 'info' : 'success'" 
                      size="36"
                      class="mr-3"
                    >
                      <v-icon size="18" color="white">
                        {{ activity.event_type === 'view' ? 'mdi-eye' : 'mdi-download' }}
                      </v-icon>
                    </v-avatar>
                    <div class="activity-content">
                      <p class="activity-title">{{ activity.game_title }}</p>
                      <p class="activity-meta">
                        <span class="activity-type">{{ activity.event_type === 'view' ? 'Viewed' : 'Downloaded' }}</span>
                        <span class="activity-time">{{ formatDate(activity.created_at) }}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <p v-else class="text-medium-emphasis text-center py-8">No recent activity</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Charts Row -->
        <v-row class="mb-6">
          <!-- Views Chart -->
          <v-col cols="12" md="6">
            <v-card class="stat-card" elevation="0">
              <v-card-title class="d-flex align-center">
                <v-icon color="info" class="mr-2">mdi-chart-line</v-icon>
                Daily Views (Last 30 Days)
              </v-card-title>
              <v-card-text>
                <div class="chart-container">
                  <div class="chart-bars">
                    <div 
                      v-for="(value, index) in viewsChartData" 
                      :key="index"
                      class="chart-bar-wrapper"
                      :title="`${chartLabels[index]}: ${value} views`"
                    >
                      <div 
                        class="chart-bar chart-bar--views"
                        :style="{ height: `${(value / maxViewValue) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                  <div class="chart-labels">
                    <span>{{ chartLabels[0] }}</span>
                    <span>{{ chartLabels[Math.floor(chartLabels.length / 2)] }}</span>
                    <span>{{ chartLabels[chartLabels.length - 1] }}</span>
                  </div>
                </div>
                <div class="chart-summary mt-4 d-flex justify-space-around">
                  <div class="text-center">
                    <p class="text-h5 font-weight-bold text-info">
                      {{ viewsChartData.reduce((a, b) => a + b, 0).toLocaleString() }}
                    </p>
                    <p class="text-caption text-medium-emphasis">Total Views</p>
                  </div>
                  <div class="text-center">
                    <p class="text-h5 font-weight-bold text-info">
                      {{ Math.round(viewsChartData.reduce((a, b) => a + b, 0) / 30) }}
                    </p>
                    <p class="text-caption text-medium-emphasis">Daily Avg</p>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Downloads Chart -->
          <v-col cols="12" md="6">
            <v-card class="stat-card" elevation="0">
              <v-card-title class="d-flex align-center">
                <v-icon color="success" class="mr-2">mdi-chart-line</v-icon>
                Daily Downloads (Last 30 Days)
              </v-card-title>
              <v-card-text>
                <div class="chart-container">
                  <div class="chart-bars">
                    <div 
                      v-for="(value, index) in downloadsChartData" 
                      :key="index"
                      class="chart-bar-wrapper"
                      :title="`${chartLabels[index]}: ${value} downloads`"
                    >
                      <div 
                        class="chart-bar chart-bar--downloads"
                        :style="{ height: `${(value / maxDownloadValue) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                  <div class="chart-labels">
                    <span>{{ chartLabels[0] }}</span>
                    <span>{{ chartLabels[Math.floor(chartLabels.length / 2)] }}</span>
                    <span>{{ chartLabels[chartLabels.length - 1] }}</span>
                  </div>
                </div>
                <div class="chart-summary mt-4 d-flex justify-space-around">
                  <div class="text-center">
                    <p class="text-h5 font-weight-bold text-success">
                      {{ downloadsChartData.reduce((a, b) => a + b, 0).toLocaleString() }}
                    </p>
                    <p class="text-caption text-medium-emphasis">Total Downloads</p>
                  </div>
                  <div class="text-center">
                    <p class="text-h5 font-weight-bold text-success">
                      {{ Math.round(downloadsChartData.reduce((a, b) => a + b, 0) / 30) }}
                    </p>
                    <p class="text-caption text-medium-emphasis">Daily Avg</p>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Top Games Row with Time Filter -->
        <v-row class="mb-2">
          <v-col cols="12">
            <div class="d-flex align-center justify-space-between flex-wrap ga-4">
              <h2 class="text-h6 font-weight-bold">Top Games</h2>
              <v-btn-toggle v-model="timePeriod" mandatory density="compact" variant="outlined" divided>
                <v-btn 
                  v-for="option in timePeriodOptions" 
                  :key="option.value" 
                  :value="option.value"
                  size="small"
                >
                  {{ option.title }}
                </v-btn>
              </v-btn-toggle>
            </div>
          </v-col>
        </v-row>

        <v-row>
          <!-- Top Games by Views -->
          <v-col cols="12" md="6">
            <v-card class="stat-card" elevation="0">
              <v-card-title class="d-flex align-center">
                <v-icon color="info" class="mr-2">mdi-eye</v-icon>
                Top by Views
              </v-card-title>
              <v-card-text>
                <div v-if="stats.topByViews.length > 0" class="top-games-list">
                  <div 
                    v-for="(game, index) in stats.topByViews" 
                    :key="game.game_id"
                    class="top-game-item"
                  >
                    <div class="top-game-rank" :class="`rank-${index + 1}`">
                      {{ index + 1 }}
                    </div>
                    <div class="top-game-info">
                      <p class="top-game-title">{{ game.title }}</p>
                      <p class="top-game-count">{{ game.count.toLocaleString() }} views</p>
                    </div>
                  </div>
                </div>
                <p v-else class="text-medium-emphasis text-center py-4">No data for this period</p>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Top Games by Downloads -->
          <v-col cols="12" md="6">
            <v-card class="stat-card" elevation="0">
              <v-card-title class="d-flex align-center">
                <v-icon color="success" class="mr-2">mdi-download</v-icon>
                Top by Downloads
              </v-card-title>
              <v-card-text>
                <div v-if="stats.topByDownloads.length > 0" class="top-games-list">
                  <div 
                    v-for="(game, index) in stats.topByDownloads" 
                    :key="game.game_id"
                    class="top-game-item"
                  >
                    <div class="top-game-rank" :class="`rank-${index + 1}`">
                      {{ index + 1 }}
                    </div>
                    <div class="top-game-info">
                      <p class="top-game-title">{{ game.title }}</p>
                      <p class="top-game-count">{{ game.count.toLocaleString() }} downloads</p>
                    </div>
                  </div>
                </div>
                <p v-else class="text-medium-emphasis text-center py-4">No data for this period</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.admin-dashboard {
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

.stat-card {
  background: rgba(13, 33, 55, 0.8) !important;
  border: 1px solid rgba(72, 202, 228, 0.1);
  border-radius: 12px;
  height: 100%;

  :deep(.v-table) {
    background: transparent !important;
  }
}

// Activity List Styles
.activity-list {
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(72, 202, 228, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.activity-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.activity-type {
  color: rgba(255, 255, 255, 0.7);
}

// Chart Styles
.chart-container {
  padding: 1rem 0;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  height: 150px;
  gap: 2px;
  padding: 0 4px;
}

.chart-bar-wrapper {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  cursor: pointer;
  
  &:hover .chart-bar {
    opacity: 1;
  }
}

.chart-bar {
  width: 100%;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  opacity: 0.7;
  transition: opacity 0.2s, height 0.3s ease;
  
  &--views {
    background: linear-gradient(180deg, #00b4d8, #0077b6);
  }
  
  &--downloads {
    background: linear-gradient(180deg, #4caf50, #2e7d32);
  }
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
}

// Top Games List Styles
.top-games-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.top-game-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(72, 202, 228, 0.05);
  }
}

.top-game-rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  
  &.rank-1 {
    background: linear-gradient(135deg, #ffd700, #ffb300);
    color: #000;
  }
  
  &.rank-2 {
    background: linear-gradient(135deg, #c0c0c0, #9e9e9e);
    color: #000;
  }
  
  &.rank-3 {
    background: linear-gradient(135deg, #cd7f32, #a0522d);
    color: #fff;
  }
}

.top-game-info {
  flex: 1;
  min-width: 0;
}

.top-game-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.top-game-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
