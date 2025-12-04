<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  modelValue?: string
  placeholder?: string
  size?: 'default' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Search for games...',
  size: 'default'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
}>()

const isFocused = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const searchValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

const handleSearch = () => {
  if (searchValue.value.trim()) {
    emit('search', searchValue.value)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSearch()
  }
}
</script>

<template>
  <div 
    class="search-bar" 
    :class="[
      `search-bar--${size}`,
      { 'search-bar--focused': isFocused }
    ]"
  >
    <div class="search-bar__container">
      <v-icon class="search-bar__icon" size="24">mdi-magnify</v-icon>
      
      <input
        ref="inputRef"
        v-model="searchValue"
        type="text"
        class="search-bar__input"
        :placeholder="placeholder"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown="handleKeydown"
      />

      <Transition name="fade">
        <v-btn
          v-if="searchValue"
          icon
          variant="text"
          size="small"
          class="search-bar__clear"
          @click="searchValue = ''"
        >
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </Transition>

      <v-btn
        class="search-bar__button"
        color="primary"
        :size="size === 'large' ? 'large' : 'default'"
        @click="handleSearch"
      >
        <v-icon class="mr-1">mdi-magnify</v-icon>
        <span class="d-none d-sm-inline">Search</span>
      </v-btn>
    </div>

    <!-- Animated glow effect -->
    <div class="search-bar__glow"></div>
  </div>
</template>

<style scoped lang="scss">
.search-bar {
  position: relative;
  width: 100%;
  max-width: 600px;

  &--large {
    max-width: 700px;

    .search-bar__container {
      padding: 0.5rem 0.5rem 0.5rem 1.5rem;
    }

    .search-bar__input {
      font-size: 1.1rem;
      padding: 0.75rem 0.5rem;
    }

    .search-bar__icon {
      width: 28px;
      height: 28px;
    }
  }

  &__container {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(13, 33, 55, 0.8);
    backdrop-filter: blur(12px);
    border: 2px solid rgba(72, 202, 228, 0.2);
    border-radius: 16px;
    padding: 0.25rem 0.25rem 0.25rem 1rem;
    transition: all 0.3s ease;
    z-index: 1;
  }

  &--focused &__container {
    border-color: rgba(72, 202, 228, 0.5);
    background: rgba(13, 33, 55, 0.95);
  }

  &__icon {
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
    transition: color 0.3s ease;
  }

  &--focused &__icon {
    color: #48cae4;
  }

  &__input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    font-size: 1rem;
    padding: 0.5rem;

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }

  &__clear {
    color: rgba(255, 255, 255, 0.5);
    
    &:hover {
      color: #ff5252;
    }
  }

  &__button {
    flex-shrink: 0;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
  }

  &__glow {
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, #0077b6, #48cae4, #0077b6);
    border-radius: 18px;
    opacity: 0;
    filter: blur(12px);
    transition: opacity 0.3s ease;
    z-index: 0;
  }

  &--focused &__glow {
    opacity: 0.3;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
