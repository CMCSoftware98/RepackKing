import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gamesApi, type Game } from '@/services/api'

export const useGamesStore = defineStore('games', () => {
  const games = ref<Game[]>([])
  const currentGame = ref<Game | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0
  })

  async function fetchGames(params?: { page?: number; limit?: number; search?: string; genre?: string }) {
    loading.value = true
    error.value = null
    
    try {
      const response = await gamesApi.list(params)
      games.value = response.data.games
      pagination.value = response.data.pagination
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch games'
    } finally {
      loading.value = false
    }
  }

  async function fetchGame(slug: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await gamesApi.get(slug)
      currentGame.value = response.data
      
      // Track view
      if (response.data.id) {
        gamesApi.trackView(response.data.id).catch(() => {})
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch game'
      currentGame.value = null
    } finally {
      loading.value = false
    }
  }

  async function trackDownload(gameId: number) {
    try {
      await gamesApi.trackDownload(gameId)
    } catch {
      // Silent fail for analytics
    }
  }

  function clearCurrentGame() {
    currentGame.value = null
  }

  return {
    games,
    currentGame,
    loading,
    error,
    pagination,
    fetchGames,
    fetchGame,
    trackDownload,
    clearCurrentGame
  }
})
