export interface Game {
  id: number
  title: string
  slug: string
  description: string
  coverImage: string
  releaseDate: string
  rating: number
  genres: string[]
  developer: string
  publisher: string
  size: string
  isFeatured?: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  icon: string
  gameCount: number
}

export interface SearchFilters {
  query: string
  genres: string[]
  sortBy: 'rating' | 'releaseDate' | 'title'
  sortOrder: 'asc' | 'desc'
}
