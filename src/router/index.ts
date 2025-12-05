import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        title: 'TGames - Discover Your Next Gaming Adventure'
      }
    },
    {
      path: '/browse',
      name: 'browse',
      component: () => import('@/views/BrowseView.vue'),
      meta: {
        title: 'Browse Games - TGames'
      }
    },
    {
      path: '/game/:slug',
      name: 'game-detail',
      component: () => import('@/views/GameDetailView.vue'),
      meta: {
        title: 'Game Details - TGames'
      }
    },
    {
      path: '/report',
      name: 'report',
      component: () => import('@/views/ReportView.vue'),
      meta: {
        title: 'Report a Problem - TGames'
      }
    },
    {
      path: '/dmca',
      name: 'dmca',
      component: () => import('@/views/DmcaView.vue'),
      meta: {
        title: 'DMCA Policy - TGames'
      }
    },
    {
      path: '/status',
      name: 'report-status',
      component: () => import('@/views/ReportStatusView.vue'),
      meta: {
        title: 'Check Submission Status - TGames'
      }
    },
    {
      path: '/status/:trackingId',
      name: 'report-status-tracking',
      component: () => import('@/views/ReportStatusView.vue'),
      meta: {
        title: 'Submission Status - TGames'
      }
    },
    // Admin Routes
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/AdminLoginView.vue'),
      meta: {
        title: 'Admin Login - TGames',
        hideLayout: true
      }
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('@/views/AdminDashboard.vue'),
      meta: {
        title: 'Admin Dashboard - TGames',
        requiresAuth: true
      }
    },
    {
      path: '/admin/games',
      name: 'admin-games',
      component: () => import('@/views/AdminGamesView.vue'),
      meta: {
        title: 'Manage Games - TGames',
        requiresAuth: true
      }
    },
    {
      path: '/admin/notices',
      name: 'admin-notices',
      component: () => import('@/views/AdminNoticesView.vue'),
      meta: {
        title: 'DMCA Notices - TGames',
        requiresAuth: true
      }
    },
    // Catch-all redirect to home
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// Navigation guard for auth
router.beforeEach(async (to, from, next) => {
  // Set page title
  document.title = (to.meta.title as string) || 'TGames'
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('auth_token')
    
    if (!token) {
      next({ name: 'admin-login', query: { redirect: to.fullPath } })
      return
    }
    
    // Optionally verify token with server
    try {
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      const isValid = await authStore.checkAuth()
      
      if (!isValid) {
        next({ name: 'admin-login', query: { redirect: to.fullPath } })
        return
      }
    } catch {
      next({ name: 'admin-login', query: { redirect: to.fullPath } })
      return
    }
  }
  
  next()
})

export default router
