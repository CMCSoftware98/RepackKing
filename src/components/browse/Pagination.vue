<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  totalPages: number
  total: number
  limit: number
}>()

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:limit', value: number): void
}>()

const limitOptions = [15, 30, 50, 100]

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const current = props.page
  const total = props.totalPages
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    
    if (current > 3) {
      pages.push('...')
    }
    
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i)
    }
    
    if (current < total - 2) {
      pages.push('...')
    }
    
    if (!pages.includes(total)) pages.push(total)
  }
  
  return pages
})

const startItem = computed(() => (props.page - 1) * props.limit + 1)
const endItem = computed(() => Math.min(props.page * props.limit, props.total))

function goToPage(page: number | string) {
  if (typeof page === 'number' && page >= 1 && page <= props.totalPages) {
    emit('update:page', page)
  }
}

function changeLimit(newLimit: number) {
  emit('update:limit', newLimit)
  emit('update:page', 1) // Reset to first page when limit changes
}
</script>

<template>
  <div class="pagination">
    <div class="pagination__info">
      Showing {{ startItem }}-{{ endItem }} of {{ total }} games
    </div>
    
    <div class="pagination__controls">
      <v-btn
        icon
        variant="text"
        size="small"
        :disabled="page <= 1"
        @click="goToPage(page - 1)"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
      
      <div class="pagination__pages">
        <v-btn
          v-for="(p, index) in visiblePages"
          :key="index"
          :variant="p === page ? 'flat' : 'text'"
          :color="p === page ? 'primary' : undefined"
          size="small"
          :disabled="typeof p === 'string'"
          class="pagination__page-btn"
          @click="goToPage(p)"
        >
          {{ p }}
        </v-btn>
      </div>
      
      <v-btn
        icon
        variant="text"
        size="small"
        :disabled="page >= totalPages"
        @click="goToPage(page + 1)"
      >
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </div>
    
    <div class="pagination__limit">
      <span class="text-medium-emphasis mr-2">Per page:</span>
      <v-select
        :model-value="limit"
        :items="limitOptions"
        density="compact"
        variant="outlined"
        hide-details
        class="pagination__limit-select"
        @update:model-value="changeLimit"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 0;
  
  &__info {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
  }
  
  &__controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  &__pages {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  &__page-btn {
    min-width: 36px;
  }
  
  &__limit {
    display: flex;
    align-items: center;
  }
  
  &__limit-select {
    width: 80px;
    
    :deep(.v-field) {
      font-size: 0.875rem;
    }
  }
}

@media (max-width: 600px) {
  .pagination {
    justify-content: center;
    
    &__info {
      width: 100%;
      text-align: center;
    }
  }
}
</style>
