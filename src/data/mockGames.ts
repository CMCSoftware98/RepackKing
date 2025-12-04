import type { Game, Category } from '@/types/game'

export const mockGames: Game[] = [
  {
    id: 1,
    title: 'Cyber Odyssey 2077',
    slug: 'cyber-odyssey-2077',
    description: 'Explore a vast cyberpunk metropolis in this open-world RPG.',
    coverImage: 'https://picsum.photos/seed/game1/400/600',
    releaseDate: '2024-03-15',
    rating: 4.5,
    genres: ['RPG', 'Action', 'Adventure'],
    developer: 'Neon Studios',
    publisher: 'Digital Dreams',
    size: '85 GB',
    isFeatured: true,
  },
  {
    id: 2,
    title: 'Stellar Conquest',
    slug: 'stellar-conquest',
    description: 'Command your fleet across the galaxy in epic space battles.',
    coverImage: 'https://picsum.photos/seed/game2/400/600',
    releaseDate: '2024-02-28',
    rating: 4.8,
    genres: ['Strategy', 'Simulation'],
    developer: 'Cosmos Interactive',
    publisher: 'Galaxy Games',
    size: '45 GB',
    isFeatured: true,
  },
  {
    id: 3,
    title: 'Shadow Realms',
    slug: 'shadow-realms',
    description: 'A dark fantasy action RPG with intense combat and rich lore.',
    coverImage: 'https://picsum.photos/seed/game3/400/600',
    releaseDate: '2024-01-20',
    rating: 4.7,
    genres: ['RPG', 'Action'],
    developer: 'Dark Moon Games',
    publisher: 'Mythic Entertainment',
    size: '62 GB',
    isFeatured: true,
  },
  {
    id: 4,
    title: 'Racing Thunder GT',
    slug: 'racing-thunder-gt',
    description: 'Experience high-speed racing with stunning graphics and physics.',
    coverImage: 'https://picsum.photos/seed/game4/400/600',
    releaseDate: '2024-04-01',
    rating: 4.3,
    genres: ['Racing', 'Sports'],
    developer: 'Speed Demons',
    publisher: 'Velocity Publishing',
    size: '38 GB',
    isFeatured: false,
  },
  {
    id: 5,
    title: 'Mystic Puzzle Quest',
    slug: 'mystic-puzzle-quest',
    description: 'Solve ancient puzzles in beautifully crafted mystical worlds.',
    coverImage: 'https://picsum.photos/seed/game5/400/600',
    releaseDate: '2024-03-10',
    rating: 4.6,
    genres: ['Puzzle', 'Adventure'],
    developer: 'Mind Craft Studios',
    publisher: 'Enigma Games',
    size: '12 GB',
    isFeatured: false,
  },
  {
    id: 6,
    title: 'Arena Champions',
    slug: 'arena-champions',
    description: 'Compete in intense multiplayer battles across diverse arenas.',
    coverImage: 'https://picsum.photos/seed/game6/400/600',
    releaseDate: '2024-02-14',
    rating: 4.4,
    genres: ['Action', 'Sports'],
    developer: 'Battle Forge',
    publisher: 'Champion Games',
    size: '28 GB',
    isFeatured: true,
  },
  {
    id: 7,
    title: 'Farm Life Simulator',
    slug: 'farm-life-simulator',
    description: 'Build and manage your dream farm in this relaxing simulation.',
    coverImage: 'https://picsum.photos/seed/game7/400/600',
    releaseDate: '2024-01-05',
    rating: 4.2,
    genres: ['Simulation', 'Adventure'],
    developer: 'Harvest Moon Studios',
    publisher: 'Cozy Games Co.',
    size: '8 GB',
    isFeatured: false,
  },
  {
    id: 8,
    title: 'Dungeon Depths',
    slug: 'dungeon-depths',
    description: 'Procedurally generated dungeons await in this roguelike adventure.',
    coverImage: 'https://picsum.photos/seed/game8/400/600',
    releaseDate: '2024-03-22',
    rating: 4.9,
    genres: ['RPG', 'Adventure', 'Action'],
    developer: 'Rogue Pixel',
    publisher: 'Indie Vault',
    size: '5 GB',
    isFeatured: true,
  },
  {
    id: 9,
    title: 'Sky Warriors',
    slug: 'sky-warriors',
    description: 'Take to the skies in intense aerial combat missions.',
    coverImage: 'https://picsum.photos/seed/game9/400/600',
    releaseDate: '2024-04-10',
    rating: 4.1,
    genres: ['Action', 'Simulation'],
    developer: 'Altitude Games',
    publisher: 'Flight Entertainment',
    size: '32 GB',
    isFeatured: false,
  },
  {
    id: 10,
    title: 'Kingdom Builders',
    slug: 'kingdom-builders',
    description: 'Build your medieval kingdom from the ground up in this strategy epic.',
    coverImage: 'https://picsum.photos/seed/game10/400/600',
    releaseDate: '2024-02-01',
    rating: 4.5,
    genres: ['Strategy', 'Simulation'],
    developer: 'Empire Studios',
    publisher: 'Crown Games',
    size: '22 GB',
    isFeatured: false,
  },
]

export const categories: Category[] = [
  { id: 1, name: 'Action', slug: 'action', icon: 'mdi-sword', gameCount: 156 },
  { id: 2, name: 'RPG', slug: 'rpg', icon: 'mdi-shield-sword', gameCount: 89 },
  { id: 3, name: 'Strategy', slug: 'strategy', icon: 'mdi-chess-knight', gameCount: 67 },
  { id: 4, name: 'Adventure', slug: 'adventure', icon: 'mdi-compass', gameCount: 124 },
  { id: 5, name: 'Simulation', slug: 'simulation', icon: 'mdi-airplane', gameCount: 45 },
  { id: 6, name: 'Sports', slug: 'sports', icon: 'mdi-soccer', gameCount: 78 },
  { id: 7, name: 'Racing', slug: 'racing', icon: 'mdi-car-sports', gameCount: 34 },
  { id: 8, name: 'Puzzle', slug: 'puzzle', icon: 'mdi-puzzle', gameCount: 52 },
]

export const getFeaturedGames = (): Game[] => {
  return mockGames.filter(game => game.isFeatured)
}

export const getGamesByGenre = (genre: string): Game[] => {
  return mockGames.filter(game => 
    game.genres.map(g => g.toLowerCase()).includes(genre.toLowerCase())
  )
}

export const searchGames = (query: string): Game[] => {
  const lowercaseQuery = query.toLowerCase()
  return mockGames.filter(game =>
    game.title.toLowerCase().includes(lowercaseQuery) ||
    game.description.toLowerCase().includes(lowercaseQuery) ||
    game.genres.some(genre => genre.toLowerCase().includes(lowercaseQuery))
  )
}
