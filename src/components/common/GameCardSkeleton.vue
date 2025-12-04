<script setup lang="ts">
</script>

<template>
  <div class="game-card-skeleton">
    <div class="skeleton-image skeleton-shimmer"></div>
    <div class="skeleton-content">
      <div class="skeleton-title skeleton-shimmer"></div>
      <div class="skeleton-tags">
        <div class="skeleton-tag skeleton-shimmer"></div>
        <div class="skeleton-tag skeleton-shimmer"></div>
      </div>
      <div class="skeleton-footer">
        <div class="skeleton-rating skeleton-shimmer"></div>
        <div class="skeleton-size skeleton-shimmer"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.game-card-skeleton {
  background: rgba(13, 33, 55, 0.7);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(72, 202, 228, 0.1);
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: rgba(255, 255, 255, 0.05);
}

.skeleton-content {
  padding: 1rem;
}

.skeleton-title {
  height: 24px;
  width: 80%;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 0.75rem;
}

.skeleton-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.skeleton-tag {
  height: 24px;
  width: 60px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.skeleton-footer {
  display: flex;
  justify-content: space-between;
}

.skeleton-rating,
.skeleton-size {
  height: 20px;
  width: 50px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
