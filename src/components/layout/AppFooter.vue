<script setup lang="ts">
const currentYear = new Date().getFullYear()

const footerLinks = [
  { title: 'Report a Problem', to: '/report' },
  { title: 'DMCA', to: '/dmca' },
]
</script>

<template>
  <footer class="app-footer">
    <!-- Wave Decoration -->
    <div class="footer-wave">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path 
          d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,90 1440,60 L1440,120 L0,120 Z" 
          fill="rgba(13, 33, 55, 0.5)"
        />
        <path 
          d="M0,80 C360,20 720,100 1080,40 C1260,10 1380,60 1440,80 L1440,120 L0,120 Z" 
          fill="#0d2137"
        />
      </svg>
    </div>

    <div class="footer-content">
      <v-container style="max-width: 1400px;">
        <div class="footer-main d-flex flex-column flex-sm-row justify-space-between align-center">
          <!-- Copyright -->
          <p class="text-medium-emphasis text-body-2 mb-3 mb-sm-0">
            &copy; {{ currentYear }} RepackKing. All rights reserved.
          </p>

          <!-- Footer Links -->
          <nav class="footer-nav d-flex align-center ga-4">
            <router-link
              v-for="link in footerLinks"
              :key="link.to"
              :to="link.to"
              class="footer-link"
            >
              {{ link.title }}
            </router-link>
          </nav>
        </div>
      </v-container>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  position: relative;
  margin-top: auto;
}

.footer-wave {
  position: relative;
  height: 80px;
  overflow: hidden;

  svg {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
}

.footer-content {
  background: #0d2137;
  padding: 1.5rem 0;
}

.footer-nav {
  gap: 2rem;
}

.footer-link {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover {
    color: #48cae4;
  }
}
</style>
