<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import TorrentLogo from '@/components/common/TorrentLogo.vue'

const isScrolled = ref(false)
const mobileMenuOpen = ref(false)

const navItems = [
  { title: 'Home', to: '/', icon: 'mdi-home' },
  { title: 'Browse', to: '/browse', icon: 'mdi-gamepad-variant' },
]

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <v-app-bar
    :elevation="isScrolled ? 2 : 0"
    class="app-navbar"
    :class="{ 'navbar-scrolled': isScrolled }"
    height="72"
  >
    <v-container class="d-flex align-center justify-space-between" style="max-width: 1400px;">
      <!-- Logo -->
      <router-link to="/" class="logo-link d-flex align-center text-decoration-none">
        <TorrentLogo :size="42" :animate="!isScrolled" />
        <span class="logo-text ml-3">
          <span class="logo-torrent">T</span><span class="logo-games">Games</span>
        </span>
      </router-link>

      <!-- Desktop Navigation -->
      <nav class="desktop-nav d-none d-md-flex align-center">
        <v-btn
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          variant="text"
          class="nav-link mx-1"
          :ripple="false"
        >
          {{ item.title }}
        </v-btn>
      </nav>

      <!-- Search & Actions -->
      <div class="nav-actions d-flex align-center">
        <v-btn
          icon
          variant="text"
          class="search-btn"
          aria-label="Search"
        >
          <v-icon>mdi-magnify</v-icon>
        </v-btn>

        <!-- Mobile Menu Toggle -->
        <v-btn
          icon
          variant="text"
          class="d-md-none ml-2"
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="Menu"
        >
          <v-icon>{{ mobileMenuOpen ? 'mdi-close' : 'mdi-menu' }}</v-icon>
        </v-btn>
      </div>
    </v-container>

    <!-- Mobile Menu -->
    <Transition name="slide-down">
      <div v-if="mobileMenuOpen" class="mobile-menu d-md-none">
        <v-list bg-color="transparent" class="py-2">
          <v-list-item
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :prepend-icon="item.icon"
            :title="item.title"
            class="mobile-nav-item"
            @click="mobileMenuOpen = false"
          />
        </v-list>
      </div>
    </Transition>
  </v-app-bar>
</template>

<style scoped lang="scss">
.app-navbar {
  background: transparent !important;
  transition: all 0.3s ease;

  &.navbar-scrolled {
    background: rgba(10, 26, 20, 0.95) !important;
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 255, 135, 0.1);
  }

  :deep(.v-toolbar__content) {
    padding: 0;
  }
}

.logo-link {
  &:hover {
    .logo-text {
      .logo-torrent {
        text-shadow: 0 0 20px rgba(0, 255, 135, 0.8);
      }
    }
  }
}

.logo-text {
  font-family: 'Montserrat', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.5px;

  .logo-torrent {
    background: linear-gradient(135deg, #00ff87 0%, #60efff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transition: text-shadow 0.3s ease;
    font-weight: 800;
  }

  .logo-games {
    color: #ffffff;
  }
}

.desktop-nav {
  .nav-link {
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.85);
    text-transform: none;
    letter-spacing: 0;
    position: relative;
    padding: 0.5rem 1rem;

    &::after {
      content: '';
      position: absolute;
      bottom: 4px;
      left: 50%;
      width: 0;
      height: 2px;
      background: linear-gradient(90deg, #00ff87, #60efff);
      transition: all 0.3s ease;
      transform: translateX(-50%);
      border-radius: 1px;
    }

    &:hover {
      color: #ffffff;
      background: transparent;

      &::after {
        width: 60%;
      }
    }

    &.router-link-active {
      color: #00ff87;

      &::after {
        width: 60%;
      }
    }
  }
}

.search-btn {
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.3s ease;

  &:hover {
    color: #00ff87;
    background: rgba(0, 255, 135, 0.1);
  }
}

.mobile-menu {
  position: absolute;
  top: 72px;
  left: 0;
  right: 0;
  background: rgba(10, 26, 20, 0.98);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 255, 135, 0.1);
  padding: 0.5rem 0;
}

.mobile-nav-item {
  color: rgba(255, 255, 255, 0.85);

  &:hover {
    background: rgba(0, 255, 135, 0.1);
  }

  :deep(.v-list-item__prepend) {
    color: #00ff87;
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
