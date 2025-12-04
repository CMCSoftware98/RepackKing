import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<{ id: number; username: string } | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    
    try {
      const response = await authApi.login(username, password)
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('auth_token', response.data.token)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function checkAuth(): Promise<boolean> {
    if (!token.value) return false
    
    try {
      const response = await authApi.me()
      user.value = response.data
      return true
    } catch {
      logout()
      return false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    checkAuth,
    logout
  }
})
