<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { noticesApi, reportsApi, type DmcaNotice, type DmcaNoticeStats, type GameReport, type GameReportStats } from '@/services/api'

// Tab state
const activeTab = ref<'dmca' | 'reports'>('dmca')

// DMCA Notices state
const notices = ref<DmcaNotice[]>([])
const noticeStats = ref<DmcaNoticeStats | null>(null)
const noticesLoading = ref(false)
const noticesPagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
const noticeStatusFilter = ref<string>('')
const includeCompletedNotices = ref(false)

// Reports state
const reports = ref<GameReport[]>([])
const reportStats = ref<GameReportStats | null>(null)
const reportsLoading = ref(false)
const reportsPagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
const reportStatusFilter = ref<string>('')
const includeResolvedReports = ref(false)

// Common state
const error = ref<string | null>(null)

// Detail dialogs
const noticeDetailDialog = ref(false)
const selectedNotice = ref<DmcaNotice | null>(null)
const noticeUpdating = ref(false)
const noticeUpdateForm = ref({ status: '', admin_notes: '', public_note: '' })

const reportDetailDialog = ref(false)
const selectedReport = ref<GameReport | null>(null)
const reportUpdating = ref(false)
const reportUpdateForm = ref({ status: '', admin_notes: '', public_note: '' })

// Quick action templates for DMCA notices
const dmcaTemplates = [
  { 
    label: 'Content Removed', 
    status: 'completed', 
    public_note: 'The content has been removed from our platform in accordance with your DMCA notice. Thank you for bringing this to our attention.' 
  },
  { 
    label: 'Under Investigation', 
    status: 'reviewing', 
    public_note: 'We are currently investigating your DMCA claim. Please allow 24-48 hours for a full review.' 
  },
  { 
    label: 'Request Rejected', 
    status: 'rejected', 
    public_note: 'After careful review, we were unable to verify the validity of this DMCA claim. Please provide additional documentation if you believe this decision is in error.' 
  },
  { 
    label: 'More Info Needed', 
    status: 'reviewing', 
    public_note: 'We require additional information to process your DMCA request. Please provide proof of ownership or authorization to act on behalf of the copyright holder.' 
  }
]

// Quick action templates for Game Reports
const reportTemplates = [
  { 
    label: 'Issue Fixed', 
    status: 'resolved', 
    public_note: 'Thank you for your report! The issue has been fixed.' 
  },
  { 
    label: 'Investigating', 
    status: 'reviewed', 
    public_note: 'We are investigating the issue you reported. Thank you for helping us improve!' 
  },
  { 
    label: 'Link Updated', 
    status: 'resolved', 
    public_note: 'The download link has been updated. Thank you for reporting the broken link!' 
  },
  { 
    label: 'Info Corrected', 
    status: 'resolved', 
    public_note: 'The game information has been corrected. Thank you for letting us know!' 
  },
  { 
    label: 'Cannot Reproduce', 
    status: 'dismissed', 
    public_note: 'We were unable to reproduce the issue you reported. If the problem persists, please submit a new report with additional details.' 
  },
  { 
    label: 'Not Valid', 
    status: 'dismissed', 
    public_note: 'After review, we determined this report does not require action. Thank you for your feedback.' 
  }
]

// Apply template functions
function applyDmcaTemplate(template: typeof dmcaTemplates[0]) {
  noticeUpdateForm.value.status = template.status
  noticeUpdateForm.value.public_note = template.public_note
}

function applyReportTemplate(template: typeof reportTemplates[0]) {
  reportUpdateForm.value.status = template.status
  reportUpdateForm.value.public_note = template.public_note
}

// Delete dialogs
const deleteNoticeDialog = ref(false)
const noticeToDelete = ref<DmcaNotice | null>(null)
const deleteReportDialog = ref(false)
const reportToDelete = ref<GameReport | null>(null)

// Status options
const noticeStatusOptions = [
  { title: 'All Statuses', value: '' },
  { title: 'Pending', value: 'pending' },
  { title: 'Reviewing', value: 'reviewing' },
  { title: 'Approved', value: 'approved' },
  { title: 'Rejected', value: 'rejected' },
  { title: 'Completed', value: 'completed' }
]

const reportStatusOptions = [
  { title: 'All Statuses', value: '' },
  { title: 'Pending', value: 'pending' },
  { title: 'Reviewed', value: 'reviewed' },
  { title: 'Resolved', value: 'resolved' },
  { title: 'Dismissed', value: 'dismissed' }
]

const noticeStatusColors: Record<string, string> = {
  pending: 'warning',
  reviewing: 'info',
  approved: 'success',
  rejected: 'error',
  completed: 'grey'
}

const reportStatusColors: Record<string, string> = {
  pending: 'warning',
  reviewed: 'info',
  resolved: 'success',
  dismissed: 'grey'
}

const reportTypeLabels: Record<string, string> = {
  broken_link: 'Broken Link',
  wrong_info: 'Wrong Info',
  malware: 'Malware',
  other: 'Other'
}

const reportTypeIcons: Record<string, string> = {
  broken_link: 'mdi-link-off',
  wrong_info: 'mdi-information-off',
  malware: 'mdi-virus',
  other: 'mdi-help-circle'
}

// Load DMCA Notices
async function loadNotices() {
  noticesLoading.value = true
  error.value = null
  try {
    const response = await noticesApi.list({
      page: noticesPagination.value.page,
      limit: noticesPagination.value.limit,
      status: noticeStatusFilter.value || undefined,
      includeCompleted: includeCompletedNotices.value || undefined
    })
    notices.value = response.data.notices
    noticesPagination.value = response.data.pagination
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load DMCA notices'
  } finally {
    noticesLoading.value = false
  }
}

async function loadNoticeStats() {
  try {
    const response = await noticesApi.getStats()
    noticeStats.value = response.data
  } catch (err) {
    console.error('Failed to load notice stats:', err)
  }
}

// Load Reports
async function loadReports() {
  reportsLoading.value = true
  error.value = null
  try {
    const response = await reportsApi.list({
      page: reportsPagination.value.page,
      limit: reportsPagination.value.limit,
      status: reportStatusFilter.value || undefined,
      includeResolved: includeResolvedReports.value || undefined
    })
    reports.value = response.data.reports
    reportsPagination.value = response.data.pagination
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load reports'
  } finally {
    reportsLoading.value = false
  }
}

async function loadReportStats() {
  try {
    const response = await reportsApi.getStats()
    reportStats.value = response.data
  } catch (err) {
    console.error('Failed to load report stats:', err)
  }
}

// Notice actions
function openNoticeDetail(notice: DmcaNotice) {
  selectedNotice.value = notice
  noticeUpdateForm.value = {
    status: notice.status,
    admin_notes: notice.admin_notes || '',
    public_note: notice.public_note || ''
  }
  noticeDetailDialog.value = true
}

async function handleUpdateNotice() {
  if (!selectedNotice.value) return
  
  noticeUpdating.value = true
  try {
    const response = await noticesApi.update(selectedNotice.value.id, {
      status: noticeUpdateForm.value.status,
      admin_notes: noticeUpdateForm.value.admin_notes,
      public_note: noticeUpdateForm.value.public_note
    })
    
    const index = notices.value.findIndex(n => n.id === selectedNotice.value!.id)
    if (index !== -1) {
      notices.value[index] = response.data
    }
    
    noticeDetailDialog.value = false
    loadNoticeStats()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to update notice'
  } finally {
    noticeUpdating.value = false
  }
}

function confirmDeleteNotice(notice: DmcaNotice) {
  noticeToDelete.value = notice
  deleteNoticeDialog.value = true
}

async function handleDeleteNotice() {
  if (!noticeToDelete.value) return
  
  try {
    await noticesApi.delete(noticeToDelete.value.id)
    deleteNoticeDialog.value = false
    noticeToDelete.value = null
    loadNotices()
    loadNoticeStats()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to delete notice'
  }
}

// Report actions
function openReportDetail(report: GameReport) {
  selectedReport.value = report
  reportUpdateForm.value = {
    status: report.status,
    admin_notes: report.admin_notes || '',
    public_note: report.public_note || ''
  }
  reportDetailDialog.value = true
}

async function handleUpdateReport() {
  if (!selectedReport.value) return
  
  reportUpdating.value = true
  try {
    const response = await reportsApi.update(selectedReport.value.id, {
      status: reportUpdateForm.value.status,
      admin_notes: reportUpdateForm.value.admin_notes,
      public_note: reportUpdateForm.value.public_note
    })
    
    const index = reports.value.findIndex(r => r.id === selectedReport.value!.id)
    if (index !== -1) {
      reports.value[index] = response.data
    }
    
    reportDetailDialog.value = false
    loadReportStats()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to update report'
  } finally {
    reportUpdating.value = false
  }
}

function confirmDeleteReport(report: GameReport) {
  reportToDelete.value = report
  deleteReportDialog.value = true
}

async function handleDeleteReport() {
  if (!reportToDelete.value) return
  
  try {
    await reportsApi.delete(reportToDelete.value.id)
    deleteReportDialog.value = false
    reportToDelete.value = null
    loadReports()
    loadReportStats()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to delete report'
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

// Watch for tab changes
watch(activeTab, (tab) => {
  if (tab === 'dmca') {
    loadNotices()
    loadNoticeStats()
  } else {
    loadReports()
    loadReportStats()
  }
})

// Watch for filter changes
watch(noticeStatusFilter, () => {
  noticesPagination.value.page = 1
  loadNotices()
})

watch(includeCompletedNotices, () => {
  noticesPagination.value.page = 1
  loadNotices()
})

watch(reportStatusFilter, () => {
  reportsPagination.value.page = 1
  loadReports()
})

watch(includeResolvedReports, () => {
  reportsPagination.value.page = 1
  loadReports()
})

onMounted(() => {
  loadNotices()
  loadNoticeStats()
  loadReports()
  loadReportStats()
})
</script>

<template>
  <div class="admin-notices">
    <v-container style="max-width: 1400px;">
      <!-- Header -->
      <header class="admin-header d-flex justify-space-between align-center flex-wrap ga-4 mb-6">
        <div>
          <v-btn variant="text" :to="{ name: 'admin-dashboard' }" class="mb-2">
            <v-icon start>mdi-arrow-left</v-icon>
            Back to Dashboard
          </v-btn>
          <h1 class="admin-title">Notices & Reports</h1>
        </div>
      </header>

      <!-- Error Alert -->
      <v-alert v-if="error" type="error" variant="tonal" class="mb-6" closable @click:close="error = null">
        {{ error }}
      </v-alert>

      <!-- Tabs -->
      <v-tabs v-model="activeTab" color="primary" class="mb-6">
        <v-tab value="dmca">
          <v-icon start>mdi-shield-alert</v-icon>
          DMCA Notices
          <v-chip v-if="noticeStats?.pending" size="small" color="warning" class="ml-2">
            {{ noticeStats.pending }}
          </v-chip>
        </v-tab>
        <v-tab value="reports">
          <v-icon start>mdi-flag</v-icon>
          Problem Reports
          <v-chip v-if="reportStats?.pending" size="small" color="warning" class="ml-2">
            {{ reportStats.pending }}
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- DMCA Notices Tab -->
        <v-window-item value="dmca">
          <!-- Stats Cards -->
          <v-row v-if="noticeStats" class="mb-6">
            <v-col cols="6" sm="4" md="2">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold">{{ noticeStats.total }}</p>
                <p class="text-caption text-medium-emphasis">Total</p>
              </v-card>
            </v-col>
            <v-col cols="6" sm="4" md="2">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold text-warning">{{ noticeStats.pending }}</p>
                <p class="text-caption text-medium-emphasis">Pending</p>
              </v-card>
            </v-col>
            <v-col cols="6" sm="4" md="2">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold text-info">{{ noticeStats.reviewing }}</p>
                <p class="text-caption text-medium-emphasis">Reviewing</p>
              </v-card>
            </v-col>
            <v-col cols="6" sm="4" md="2">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold text-success">{{ noticeStats.approved }}</p>
                <p class="text-caption text-medium-emphasis">Approved</p>
              </v-card>
            </v-col>
            <v-col cols="6" sm="4" md="2">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold text-error">{{ noticeStats.rejected }}</p>
                <p class="text-caption text-medium-emphasis">Rejected</p>
              </v-card>
            </v-col>
            <v-col cols="6" sm="4" md="2">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold text-grey">{{ noticeStats.completed }}</p>
                <p class="text-caption text-medium-emphasis">Completed</p>
              </v-card>
            </v-col>
          </v-row>

          <!-- Filter -->
          <v-card class="filter-card mb-4 pa-4" elevation="0">
            <v-row align="center">
              <v-col cols="12" sm="6" md="4">
                <v-select
                  v-model="noticeStatusFilter"
                  :items="noticeStatusOptions"
                  item-title="title"
                  item-value="value"
                  label="Filter by Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-checkbox
                  v-model="includeCompletedNotices"
                  label="Show completed notices"
                  density="compact"
                  hide-details
                  :disabled="!!noticeStatusFilter"
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex justify-md-end">
                <span class="text-medium-emphasis">
                  {{ noticesPagination.total }} notice{{ noticesPagination.total !== 1 ? 's' : '' }}
                </span>
              </v-col>
            </v-row>
          </v-card>

          <!-- Loading -->
          <div v-if="noticesLoading" class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="64" />
          </div>

          <!-- Notices Table -->
          <v-card v-else class="table-card" elevation="0">
            <v-table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Game</th>
                  <th>Submitted By</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="notice in notices" :key="notice.id">
                  <td>
                    <v-chip :color="noticeStatusColors[notice.status]" size="small" variant="tonal">
                      {{ notice.status }}
                    </v-chip>
                  </td>
                  <td>
                    <router-link v-if="notice.game_title" :to="`/game/${notice.game_slug}`" class="text-info" target="_blank">
                      {{ notice.game_title }}
                    </router-link>
                    <span v-else class="text-medium-emphasis">-</span>
                  </td>
                  <td>
                    <strong>{{ notice.full_name }}</strong>
                    <br>
                    <small class="text-medium-emphasis">{{ notice.email }}</small>
                  </td>
                  <td>{{ notice.company_name }}</td>
                  <td class="text-medium-emphasis">{{ formatDate(notice.created_at) }}</td>
                  <td class="text-right">
                    <v-btn icon variant="text" size="small" @click="openNoticeDetail(notice)">
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
                    <v-btn icon variant="text" size="small" color="error" @click="confirmDeleteNotice(notice)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
                <tr v-if="notices.length === 0">
                  <td colspan="6" class="text-center py-8 text-medium-emphasis">
                    No DMCA notices found.
                  </td>
                </tr>
              </tbody>
            </v-table>

            <div v-if="noticesPagination.totalPages > 1" class="pa-4 d-flex justify-center">
              <v-pagination
                v-model="noticesPagination.page"
                :length="noticesPagination.totalPages"
                :total-visible="7"
                @update:model-value="loadNotices"
              />
            </div>
          </v-card>
        </v-window-item>

        <!-- Reports Tab -->
        <v-window-item value="reports">
          <!-- Stats Cards -->
          <v-row v-if="reportStats" class="mb-6">
            <v-col cols="6" sm="3">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold">{{ reportStats.total }}</p>
                <p class="text-caption text-medium-emphasis">Total</p>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold text-warning">{{ reportStats.pending }}</p>
                <p class="text-caption text-medium-emphasis">Pending</p>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold text-success">{{ reportStats.resolved }}</p>
                <p class="text-caption text-medium-emphasis">Resolved</p>
              </v-card>
            </v-col>
            <v-col cols="6" sm="3">
              <v-card class="stat-card pa-3 text-center" elevation="0">
                <p class="text-h5 font-weight-bold text-grey">{{ reportStats.dismissed }}</p>
                <p class="text-caption text-medium-emphasis">Dismissed</p>
              </v-card>
            </v-col>
          </v-row>

          <!-- Filter -->
          <v-card class="filter-card mb-4 pa-4" elevation="0">
            <v-row align="center">
              <v-col cols="12" sm="6" md="4">
                <v-select
                  v-model="reportStatusFilter"
                  :items="reportStatusOptions"
                  item-title="title"
                  item-value="value"
                  label="Filter by Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-checkbox
                  v-model="includeResolvedReports"
                  label="Show resolved/dismissed"
                  density="compact"
                  hide-details
                  :disabled="!!reportStatusFilter"
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex justify-md-end">
                <span class="text-medium-emphasis">
                  {{ reportsPagination.total }} report{{ reportsPagination.total !== 1 ? 's' : '' }}
                </span>
              </v-col>
            </v-row>
          </v-card>

          <!-- Loading -->
          <div v-if="reportsLoading" class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="64" />
          </div>

          <!-- Reports Table -->
          <v-card v-else class="table-card" elevation="0">
            <v-table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Game</th>
                  <th>Reporter</th>
                  <th>Date</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="report in reports" :key="report.id">
                  <td>
                    <v-chip :color="reportStatusColors[report.status]" size="small" variant="tonal">
                      {{ report.status }}
                    </v-chip>
                  </td>
                  <td>
                    <v-chip size="small" variant="outlined">
                      <v-icon start size="14">{{ reportTypeIcons[report.report_type] }}</v-icon>
                      {{ reportTypeLabels[report.report_type] }}
                    </v-chip>
                  </td>
                  <td>
                    <router-link v-if="report.game_title" :to="`/game/${report.game_slug}`" class="text-info" target="_blank">
                      {{ report.game_title }}
                    </router-link>
                    <span v-else class="text-medium-emphasis">-</span>
                  </td>
                  <td>
                    <small class="text-medium-emphasis">{{ report.email }}</small>
                  </td>
                  <td class="text-medium-emphasis">{{ formatDate(report.created_at) }}</td>
                  <td class="text-right">
                    <v-btn icon variant="text" size="small" @click="openReportDetail(report)">
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
                    <v-btn icon variant="text" size="small" color="error" @click="confirmDeleteReport(report)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
                <tr v-if="reports.length === 0">
                  <td colspan="6" class="text-center py-8 text-medium-emphasis">
                    No reports found.
                  </td>
                </tr>
              </tbody>
            </v-table>

            <div v-if="reportsPagination.totalPages > 1" class="pa-4 d-flex justify-center">
              <v-pagination
                v-model="reportsPagination.page"
                :length="reportsPagination.totalPages"
                :total-visible="7"
                @update:model-value="loadReports"
              />
            </div>
          </v-card>
        </v-window-item>
      </v-window>

      <!-- Notice Detail Dialog -->
      <v-dialog v-model="noticeDetailDialog" max-width="700" scrollable>
        <v-card v-if="selectedNotice">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="error">mdi-shield-alert</v-icon>
            DMCA Notice Details
          </v-card-title>

          <v-card-text>
            <v-chip :color="noticeStatusColors[selectedNotice.status]" variant="tonal" class="mb-4">
              {{ selectedNotice.status.toUpperCase() }}
            </v-chip>

            <v-card variant="outlined" class="pa-4 mb-4">
              <p class="text-subtitle-2 text-info mb-2">Game</p>
              <p v-if="selectedNotice.game_title" class="mb-0">
                <router-link :to="`/game/${selectedNotice.game_slug}`" class="text-info" target="_blank">
                  {{ selectedNotice.game_title }}
                </router-link>
              </p>
              <p v-else class="text-medium-emphasis mb-0">No game linked</p>
            </v-card>

            <v-card variant="outlined" class="pa-4 mb-4">
              <p class="text-subtitle-2 text-info mb-2">Submitter Information</p>
              <v-row dense>
                <v-col cols="6"><strong>Name:</strong> {{ selectedNotice.full_name }}</v-col>
                <v-col cols="6"><strong>Company:</strong> {{ selectedNotice.company_name }}</v-col>
                <v-col cols="6"><strong>Email:</strong> {{ selectedNotice.email }}</v-col>
                <v-col cols="6"><strong>Phone:</strong> {{ selectedNotice.phone || 'N/A' }}</v-col>
              </v-row>
            </v-card>

            <v-card v-if="selectedNotice.description" variant="outlined" class="pa-4 mb-4">
              <p class="text-subtitle-2 text-info mb-2">Description</p>
              <p class="mb-0" style="white-space: pre-wrap;">{{ selectedNotice.description }}</p>
            </v-card>

            <!-- Status Page Link -->
            <v-card v-if="selectedNotice.tracking_id" variant="outlined" class="pa-4 mb-4">
              <p class="text-subtitle-2 text-info mb-2">Public Status Page</p>
              <div class="d-flex align-center ga-2">
                <code class="tracking-id flex-grow-1">{{ selectedNotice.tracking_id }}</code>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="info"
                  :href="`/status/${selectedNotice.tracking_id}`"
                  target="_blank"
                >
                  <v-icon start size="16">mdi-open-in-new</v-icon>
                  View Status Page
                </v-btn>
              </div>
            </v-card>

            <v-divider class="my-4" />

            <p class="text-subtitle-2 text-info mb-3">Quick Actions</p>
            <div class="d-flex flex-wrap ga-2 mb-4">
              <v-btn
                v-for="template in dmcaTemplates"
                :key="template.label"
                size="small"
                variant="tonal"
                :color="template.status === 'completed' ? 'success' : template.status === 'rejected' ? 'error' : 'info'"
                @click="applyDmcaTemplate(template)"
              >
                {{ template.label }}
              </v-btn>
            </div>

            <v-divider class="my-4" />

            <p class="text-subtitle-2 text-info mb-3">Update Notice</p>
            
            <v-select
              v-model="noticeUpdateForm.status"
              :items="noticeStatusOptions.slice(1)"
              item-title="title"
              item-value="value"
              label="Status"
              variant="outlined"
              class="mb-4"
            />

            <v-textarea
              v-model="noticeUpdateForm.public_note"
              label="Public Response (visible to user)"
              variant="outlined"
              rows="3"
              placeholder="This message will be shown to the user on the status page..."
              hint="This will be displayed to the user when they check their submission status"
              persistent-hint
              class="mb-4"
            />

            <v-textarea
              v-model="noticeUpdateForm.admin_notes"
              label="Internal Admin Notes"
              variant="outlined"
              rows="2"
              placeholder="Internal notes (not visible to user)..."
            />
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" color="error" @click="confirmDeleteNotice(selectedNotice!)">
              <v-icon start>mdi-delete</v-icon>
              Delete
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="noticeDetailDialog = false">Cancel</v-btn>
            <v-btn color="primary" :loading="noticeUpdating" @click="handleUpdateNotice">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Report Detail Dialog -->
      <v-dialog v-model="reportDetailDialog" max-width="700" scrollable>
        <v-card v-if="selectedReport">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="warning">mdi-flag</v-icon>
            Report Details
          </v-card-title>

          <v-card-text>
            <div class="d-flex ga-2 mb-4">
              <v-chip :color="reportStatusColors[selectedReport.status]" variant="tonal">
                {{ selectedReport.status.toUpperCase() }}
              </v-chip>
              <v-chip variant="outlined">
                <v-icon start size="14">{{ reportTypeIcons[selectedReport.report_type] }}</v-icon>
                {{ reportTypeLabels[selectedReport.report_type] }}
              </v-chip>
            </div>

            <v-card variant="outlined" class="pa-4 mb-4">
              <p class="text-subtitle-2 text-info mb-2">Game</p>
              <p v-if="selectedReport.game_title" class="mb-0">
                <router-link :to="`/game/${selectedReport.game_slug}`" class="text-info" target="_blank">
                  {{ selectedReport.game_title }}
                </router-link>
              </p>
            </v-card>

            <v-card variant="outlined" class="pa-4 mb-4">
              <p class="text-subtitle-2 text-info mb-2">Reporter</p>
              <p class="mb-0"><strong>Email:</strong> {{ selectedReport.email }}</p>
            </v-card>

            <v-card variant="outlined" class="pa-4 mb-4">
              <p class="text-subtitle-2 text-info mb-2">Description</p>
              <p class="mb-0" style="white-space: pre-wrap;">{{ selectedReport.description }}</p>
            </v-card>

            <!-- Status Page Link -->
            <v-card v-if="selectedReport.tracking_id" variant="outlined" class="pa-4 mb-4">
              <p class="text-subtitle-2 text-info mb-2">Public Status Page</p>
              <div class="d-flex align-center ga-2">
                <code class="tracking-id flex-grow-1">{{ selectedReport.tracking_id }}</code>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="info"
                  :href="`/status/${selectedReport.tracking_id}`"
                  target="_blank"
                >
                  <v-icon start size="16">mdi-open-in-new</v-icon>
                  View Status Page
                </v-btn>
              </div>
            </v-card>

            <v-divider class="my-4" />

            <p class="text-subtitle-2 text-info mb-3">Quick Actions</p>
            <div class="d-flex flex-wrap ga-2 mb-4">
              <v-btn
                v-for="template in reportTemplates"
                :key="template.label"
                size="small"
                variant="tonal"
                :color="template.status === 'resolved' ? 'success' : template.status === 'dismissed' ? 'grey' : 'info'"
                @click="applyReportTemplate(template)"
              >
                {{ template.label }}
              </v-btn>
            </div>

            <v-divider class="my-4" />

            <p class="text-subtitle-2 text-info mb-3">Update Report</p>
            
            <v-select
              v-model="reportUpdateForm.status"
              :items="reportStatusOptions.slice(1)"
              item-title="title"
              item-value="value"
              label="Status"
              variant="outlined"
              class="mb-4"
            />

            <v-textarea
              v-model="reportUpdateForm.public_note"
              label="Public Response (visible to user)"
              variant="outlined"
              rows="3"
              placeholder="This message will be shown to the user on the status page..."
              hint="This will be displayed to the user when they check their submission status"
              persistent-hint
              class="mb-4"
            />

            <v-textarea
              v-model="reportUpdateForm.admin_notes"
              label="Internal Admin Notes"
              variant="outlined"
              rows="2"
              placeholder="Internal notes (not visible to user)..."
            />
          </v-card-text>

          <v-card-actions>
            <v-btn variant="text" color="error" @click="confirmDeleteReport(selectedReport!)">
              <v-icon start>mdi-delete</v-icon>
              Delete
            </v-btn>
            <v-spacer />
            <v-btn variant="text" @click="reportDetailDialog = false">Cancel</v-btn>
            <v-btn color="primary" :loading="reportUpdating" @click="handleUpdateReport">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Notice Dialog -->
      <v-dialog v-model="deleteNoticeDialog" max-width="400">
        <v-card>
          <v-card-title>Confirm Delete</v-card-title>
          <v-card-text>
            Are you sure you want to delete this DMCA notice from <strong>{{ noticeToDelete?.full_name }}</strong>?
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="deleteNoticeDialog = false">Cancel</v-btn>
            <v-btn color="error" @click="handleDeleteNotice">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Report Dialog -->
      <v-dialog v-model="deleteReportDialog" max-width="400">
        <v-card>
          <v-card-title>Confirm Delete</v-card-title>
          <v-card-text>
            Are you sure you want to delete this report?
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="deleteReportDialog = false">Cancel</v-btn>
            <v-btn color="error" @click="handleDeleteReport">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.admin-notices {
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
}

.filter-card {
  background: rgba(13, 33, 55, 0.8) !important;
  border: 1px solid rgba(72, 202, 228, 0.1);
  border-radius: 12px;
}

.table-card {
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
}

.tracking-id {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.8rem;
  color: #48cae4;
  word-break: break-all;
}
</style>
