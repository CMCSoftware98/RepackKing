import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface ScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

export function useScrollAnimation(
  options: ScrollAnimationOptions = {}
): {
  elementRef: Ref<HTMLElement | null>
  isVisible: Ref<boolean>
} {
  const { threshold = 0.1, rootMargin = '0px', once = true } = options
  
  const elementRef = ref<HTMLElement | null>(null)
  const isVisible = ref(false)
  
  let observer: IntersectionObserver | null = null
  
  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true
            if (once && observer && elementRef.value) {
              observer.unobserve(elementRef.value)
            }
          } else if (!once) {
            isVisible.value = false
          }
        })
      },
      { threshold, rootMargin }
    )
    
    if (elementRef.value) {
      observer.observe(elementRef.value)
    }
  })
  
  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })
  
  return { elementRef, isVisible }
}

export function useStaggeredAnimation(
  itemCount: number,
  baseDelay: number = 100
): { getDelay: (index: number) => string } {
  const getDelay = (index: number): string => {
    return `${index * baseDelay}ms`
  }
  
  return { getDelay }
}
