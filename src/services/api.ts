import axios from 'axios'

const API_BASE = 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Types
export interface Game {
  id: number
  title: string
  slug: string
  description: string | null
  cover_image: string | null
  size_bytes: number
  magnet_uri: string | null
  version: string | null
  genres: string[]
  screenshots?: string[]
  rating?: {
    average: number
    count: number
  }
  analytics?: {
    views: number
    downloads: number
  }
  min_cpu: string | null
  min_gpu: string | null
  min_ram: string | null
  min_storage: string | null
  min_os: string | null
  rec_cpu: string | null
  rec_gpu: string | null
  rec_ram: string | null
  rec_storage: string | null
  rec_os: string | null
  created_at: string
  updated_at: string
}

export interface Genre {
  id: number
  name: string
  slug: string
  game_count?: number
}

export interface GameReport {
  id: number
  game_id: number
  tracking_id: string | null
  game_title?: string
  game_slug?: string
  report_type: 'broken_link' | 'wrong_info' | 'malware' | 'other'
  description: string | null
  email: string | null
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  admin_notes: string | null
  public_note: string | null
  created_at: string
  updated_at: string
}

export interface GameReportInput {
  game_id: number
  report_type: 'broken_link' | 'wrong_info' | 'malware' | 'other'
  description: string
  email: string
}

export interface GameReportStats {
  total: number
  pending: number
  reviewed: number
  resolved: number
  dismissed: number
}

export interface PaginatedResponse<T> {
  games: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface GameInput {
  title: string
  description?: string
  cover_image?: string
  size_bytes?: number
  magnet_uri?: string
  version?: string
  genres?: string[]
  screenshots?: string[]
  min_cpu?: string
  min_gpu?: string
  min_ram?: string
  min_storage?: string
  min_os?: string
  rec_cpu?: string
  rec_gpu?: string
  rec_ram?: string
  rec_storage?: string
  rec_os?: string
}

export interface LoginResponse {
  token: string
  user: {
    id: number
    username: string
  }
}

export interface AnalyticsStats {
  overview: {
    totalGames: number
    totalViews: number
    totalDownloads: number
  }
  gameStats: Array<{
    game_id: number
    title: string
    view_count: number
    download_count: number
  }>
  recentActivity: Array<{
    id: number
    game_id: number
    game_title: string
    event_type: string
    created_at: string
  }>
  dailyStats: Array<{
    date: string
    views: number
    downloads: number
  }>
  topByViews: Array<{
    game_id: number
    title: string
    count: number
  }>
  topByDownloads: Array<{
    game_id: number
    title: string
    count: number
  }>
}

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }),
  
  me: () => api.get<{ id: number; username: string }>('/auth/me')
}

// Games API
export const gamesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; genre?: string; period?: string }) =>
    api.get<PaginatedResponse<Game>>('/games', { params }),
  
  get: (slug: string) => api.get<Game>(`/games/${slug}`),
  
  create: (data: GameInput) => api.post<Game>('/games', data),
  
  update: (id: number, data: Partial<GameInput>) =>
    api.put<Game>(`/games/${id}`, data),
  
  delete: (id: number) => api.delete(`/games/${id}`),
  
  trackView: (id: number) => api.post(`/games/${id}/view`),
  
  trackDownload: (id: number) => api.post(`/games/${id}/download`)
}

// Public Stats (for homepage)
export interface PublicStats {
  totalGames: number
  totalGenres: number
  totalDownloads: number
}

// Analytics API
export const analyticsApi = {
  getStats: (period?: string) => api.get<AnalyticsStats>('/analytics/stats', { params: { period } }),
  getPublicStats: () => api.get<PublicStats>('/analytics/public')
}

// Upload API
export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post<{ success: boolean; url: string; filename: string }>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

// Steam Import API
export interface SteamFetchResult {
  steam_app_id: string
  title: string
  description: string
  cover_image: string | null
  screenshots: string[]
  genres: string[]
  min_os: string | null
  min_cpu: string | null
  min_gpu: string | null
  min_ram: string | null
  min_storage: string | null
  rec_os: string | null
  rec_cpu: string | null
  rec_gpu: string | null
  rec_ram: string | null
  rec_storage: string | null
}

// Rating types
export interface RatingStats {
  average: number
  count: number
  distribution: { [key: number]: number }
}

export const steamApi = {
  // Fetch game details from Steam (returns data without creating)
  fetch: (steam_url: string) =>
    api.post<SteamFetchResult>('/steam/fetch', { steam_url }),
  
  // Fetch from Steam and create game in one step
  import: (data: { steam_url: string; magnet_uri?: string; size_bytes?: number }) =>
    api.post<Game>('/steam/import', data)
}

// Genres API
export const genresApi = {
  list: () => api.get<Genre[]>('/genres'),
  
  create: (name: string) => api.post<Genre>('/genres', { name }),
  
  delete: (id: number) => api.delete(`/genres/${id}`)
}

// Tracking status response type
export interface TrackingStatus {
  type: 'dmca' | 'report'
  tracking_id: string
  status: string
  public_note: string | null
  submitted_at: string
  updated_at: string
}

// Reports API
export const reportsApi = {
  submit: (data: GameReportInput) =>
    api.post<{ success: boolean; id: number; tracking_id: string; message: string }>('/reports', data),
  
  // Public - track report status
  track: (trackingId: string) =>
    api.get<TrackingStatus>(`/reports/track/${trackingId}`),
  
  list: (params?: { page?: number; limit?: number; status?: string; includeResolved?: boolean }) =>
    api.get<{ reports: GameReport[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>('/reports', { params }),
  
  getStats: () => api.get<GameReportStats>('/reports/stats'),
  
  get: (id: number) => api.get<GameReport>(`/reports/${id}`),
  
  update: (id: number, data: { status?: string; admin_notes?: string; public_note?: string }) =>
    api.put<GameReport>(`/reports/${id}`, data),
  
  delete: (id: number) => api.delete(`/reports/${id}`)
}

// Ratings API
export const ratingsApi = {
  submit: (game_id: number, rating: number) =>
    api.post<{ success: boolean; message: string; stats: RatingStats }>('/ratings', { game_id, rating }),
  
  getStats: (gameId: number) =>
    api.get<RatingStats>(`/ratings/${gameId}`)
}

// DMCA Notices types
export interface DmcaNotice {
  id: number
  game_id: number | null
  tracking_id: string | null
  game_title?: string
  game_slug?: string
  content_name: string
  content_url: string | null
  company_name: string
  full_name: string
  email: string
  phone: string | null
  description: string | null
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed'
  admin_notes: string | null
  public_note: string | null
  created_at: string
  updated_at: string
}

export interface DmcaNoticeInput {
  game_id: number
  company_name: string
  full_name: string
  email: string
  phone: string
  description: string
}

export interface DmcaNoticeStats {
  total: number
  pending: number
  reviewing: number
  approved: number
  rejected: number
  completed: number
}

// DMCA Notices API
export const noticesApi = {
  // Public - submit a DMCA notice
  submit: (data: DmcaNoticeInput) =>
    api.post<{ success: boolean; id: number; tracking_id: string; message: string }>('/notices', data),
  
  // Public - track notice status
  track: (trackingId: string) =>
    api.get<TrackingStatus>(`/notices/track/${trackingId}`),
  
  // Admin - list all notices
  list: (params?: { page?: number; limit?: number; status?: string; includeCompleted?: boolean }) =>
    api.get<{ notices: DmcaNotice[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>('/notices', { params }),
  
  // Admin - get stats
  getStats: () => api.get<DmcaNoticeStats>('/notices/stats'),
  
  // Admin - get single notice
  get: (id: number) => api.get<DmcaNotice>(`/notices/${id}`),
  
  // Admin - update notice
  update: (id: number, data: { status?: string; admin_notes?: string; public_note?: string }) =>
    api.put<DmcaNotice>(`/notices/${id}`, data),
  
  // Admin - delete notice
  delete: (id: number) => api.delete(`/notices/${id}`)
}

// Helper function to format bytes to human-readable size
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)
  
  return `${size.toFixed(2)} ${units[i]}`
}

// Helper function to get full image URL
export function getImageUrl(path: string | null): string {
  if (!path) return '/placeholder-game.svg'
  if (path.startsWith('http')) return path
  return `http://localhost:3001${path}`
}

export default api
