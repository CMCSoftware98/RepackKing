import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import sharp from 'sharp'
import db, { GameRow } from '../database/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Helper to extract App ID from Steam URL
function extractSteamAppId(url: string): string | null {
  // Matches URLs like:
  // https://store.steampowered.com/app/2824660/Old_School_Rally/
  // https://store.steampowered.com/app/2824660
  const match = url.match(/store\.steampowered\.com\/app\/(\d+)/i)
  return match ? match[1] : null
}

interface SystemRequirements {
  os: string | null
  cpu: string | null
  gpu: string | null
  ram: string | null
  storage: string | null
}

// Helper to parse system requirements from Steam HTML
function parseSystemRequirements(html: string): SystemRequirements {
  const result: SystemRequirements = {
    os: null,
    cpu: null,
    gpu: null,
    ram: null,
    storage: null
  }

  if (!html) return result

  // Remove HTML tags but keep text content
  const extractValue = (label: string): string | null => {
    // Match patterns like: <strong>OS:</strong> Windows 7<br>
    // or <strong>OS *:</strong> Windows 7<br>
    const regex = new RegExp(`<strong>${label}[^<]*:</strong>\\s*([^<]+)`, 'i')
    const match = html.match(regex)
    if (match) {
      return match[1].trim()
    }
    return null
  }

  result.os = extractValue('OS') || extractValue('OS \\*')
  result.cpu = extractValue('Processor')
  result.gpu = extractValue('Graphics')
  result.ram = extractValue('Memory')
  result.storage = extractValue('Storage')

  return result
}

// Image resize options
interface ResizeOptions {
  width: number
  height: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

// Cover image size (for game cards - 460x215 is Steam's header size, we scale up a bit)
const COVER_IMAGE_SIZE: ResizeOptions = { width: 460, height: 215, fit: 'cover' }

// Screenshot size (1920x1080 max, maintaining aspect ratio)
const SCREENSHOT_SIZE: ResizeOptions = { width: 1280, height: 720, fit: 'inside' }

// Helper to download and optionally resize image from URL
async function downloadImage(
  imageUrl: string, 
  uploadDir: string, 
  resize?: ResizeOptions
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const tempFilename = `temp_${uuidv4()}.jpg`
      const tempFilepath = path.join(uploadDir, tempFilename)
      const finalFilename = `steam_${uuidv4()}.jpg`
      const finalFilepath = path.join(uploadDir, finalFilename)

      const tempFile = fs.createWriteStream(tempFilepath)
      
      https.get(imageUrl, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            tempFile.close()
            try { fs.unlinkSync(tempFilepath) } catch {}
            downloadImage(redirectUrl, uploadDir, resize).then(resolve)
            return
          }
        }

        if (response.statusCode !== 200) {
          tempFile.close()
          try { fs.unlinkSync(tempFilepath) } catch {}
          resolve(null)
          return
        }

        response.pipe(tempFile)
        
        tempFile.on('finish', async () => {
          tempFile.close()
          
          try {
            if (resize) {
              // Resize the image using sharp
              await sharp(tempFilepath)
                .resize(resize.width, resize.height, { 
                  fit: resize.fit || 'cover',
                  position: 'center'
                })
                .jpeg({ quality: 85 })
                .toFile(finalFilepath)
              
              // Delete temp file
              fs.unlinkSync(tempFilepath)
              resolve(`/uploads/${finalFilename}`)
            } else {
              // No resize, just rename temp to final
              fs.renameSync(tempFilepath, finalFilepath)
              resolve(`/uploads/${finalFilename}`)
            }
          } catch (error) {
            console.error('Image processing error:', error)
            // If resize fails, try to use original
            try {
              fs.renameSync(tempFilepath, finalFilepath)
              resolve(`/uploads/${finalFilename}`)
            } catch {
              try { fs.unlinkSync(tempFilepath) } catch {}
              resolve(null)
            }
          }
        })

        tempFile.on('error', () => {
          tempFile.close()
          try { fs.unlinkSync(tempFilepath) } catch {}
          resolve(null)
        })
      }).on('error', () => {
        tempFile.close()
        try { fs.unlinkSync(tempFilepath) } catch {}
        resolve(null)
      })
    } catch {
      resolve(null)
    }
  })
}

// Helper to fetch JSON from URL
async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = ''
      
      response.on('data', (chunk) => {
        data += chunk
      })
      
      response.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('Invalid JSON response'))
        }
      })
    }).on('error', reject)
  })
}

interface SteamGenre {
  id: string
  description: string
}

interface SteamScreenshot {
  id: number
  path_thumbnail: string
  path_full: string
}

interface SteamAppData {
  name: string
  short_description: string
  about_the_game: string
  header_image: string
  genres?: SteamGenre[]
  screenshots?: SteamScreenshot[]
  pc_requirements: {
    minimum?: string
    recommended?: string
  }
}

// Helper to download multiple screenshots (max 5)
async function downloadScreenshots(screenshots: SteamScreenshot[], uploadDir: string, maxCount: number = 5): Promise<string[]> {
  const downloadedPaths: string[] = []
  const toDownload = screenshots.slice(0, maxCount)
  
  for (const screenshot of toDownload) {
    try {
      // Download and resize screenshots
      const imagePath = await downloadImage(screenshot.path_full, uploadDir, SCREENSHOT_SIZE)
      if (imagePath) {
        downloadedPaths.push(imagePath)
      }
    } catch (error) {
      console.error('Failed to download screenshot:', error)
    }
  }
  
  return downloadedPaths
}

// POST /api/steam/fetch - Fetch game details from Steam (doesn't create, just returns data)
router.post('/fetch', authenticateToken, async (req: Request, res: Response) => {
  const { steam_url } = req.body

  if (!steam_url) {
    res.status(400).json({ error: 'Steam URL is required' })
    return
  }

  const appId = extractSteamAppId(steam_url)
  if (!appId) {
    res.status(400).json({ error: 'Invalid Steam URL. Expected format: https://store.steampowered.com/app/APPID/...' })
    return
  }

  try {
    // Fetch from Steam API
    const apiUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`
    const response = await fetchJson(apiUrl)

    if (!response[appId] || !response[appId].success) {
      res.status(404).json({ error: 'Game not found on Steam' })
      return
    }

    const data: SteamAppData = response[appId].data

    // Parse system requirements (both minimum and recommended)
    const minReq = parseSystemRequirements(data.pc_requirements?.minimum || '')
    const recReq = parseSystemRequirements(data.pc_requirements?.recommended || '')

    // Extract genres
    const genres = data.genres?.map(g => g.description) || []

    // Download header image and screenshots
    const uploadDir = path.join(__dirname, '../../../uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    let coverImagePath: string | null = null
    if (data.header_image) {
      // Download and resize cover image for cards
      coverImagePath = await downloadImage(data.header_image, uploadDir, COVER_IMAGE_SIZE)
    }

    // Download screenshots (up to 5)
    let screenshots: string[] = []
    if (data.screenshots && data.screenshots.length > 0) {
      screenshots = await downloadScreenshots(data.screenshots, uploadDir, 5)
    }

    // Return the fetched data (not saved yet)
    res.json({
      steam_app_id: appId,
      title: data.name,
      description: data.short_description,
      cover_image: coverImagePath,
      screenshots,
      genres,
      min_os: minReq.os,
      min_cpu: minReq.cpu,
      min_gpu: minReq.gpu,
      min_ram: minReq.ram,
      min_storage: minReq.storage,
      rec_os: recReq.os,
      rec_cpu: recReq.cpu,
      rec_gpu: recReq.gpu,
      rec_ram: recReq.ram,
      rec_storage: recReq.storage
    })
  } catch (error) {
    console.error('Steam fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch data from Steam' })
  }
})

// POST /api/steam/import - Fetch from Steam and create game in one step
router.post('/import', authenticateToken, async (req: Request, res: Response) => {
  const { steam_url, magnet_uri, size_bytes } = req.body

  if (!steam_url) {
    res.status(400).json({ error: 'Steam URL is required' })
    return
  }

  const appId = extractSteamAppId(steam_url)
  if (!appId) {
    res.status(400).json({ error: 'Invalid Steam URL. Expected format: https://store.steampowered.com/app/APPID/...' })
    return
  }

  try {
    // Fetch from Steam API
    const apiUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`
    const response = await fetchJson(apiUrl)

    if (!response[appId] || !response[appId].success) {
      res.status(404).json({ error: 'Game not found on Steam' })
      return
    }

    const data: SteamAppData = response[appId].data

    // Parse system requirements (both minimum and recommended)
    const minReq = parseSystemRequirements(data.pc_requirements?.minimum || '')
    const recReq = parseSystemRequirements(data.pc_requirements?.recommended || '')

    // Extract genres
    const genres = data.genres?.map(g => g.description) || []

    // Download header image
    const uploadDir = path.join(__dirname, '../../../uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    let coverImagePath: string | null = null
    if (data.header_image) {
      // Download and resize cover image for cards
      coverImagePath = await downloadImage(data.header_image, uploadDir, COVER_IMAGE_SIZE)
    }

    // Download screenshots (up to 5)
    let screenshots: string[] = []
    if (data.screenshots && data.screenshots.length > 0) {
      screenshots = await downloadScreenshots(data.screenshots, uploadDir, 5)
    }

    // Generate GUID for slug
    const slug = uuidv4()

    // Create game in database
    const result = db.prepare(`
      INSERT INTO games (title, slug, description, cover_image, size_bytes, magnet_uri, min_cpu, min_gpu, min_ram, min_storage, min_os, rec_cpu, rec_gpu, rec_ram, rec_storage, rec_os)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      slug,
      data.short_description,
      coverImagePath,
      size_bytes || 0,
      magnet_uri || null,
      minReq.cpu,
      minReq.gpu,
      minReq.ram,
      minReq.storage,
      minReq.os,
      recReq.cpu,
      recReq.gpu,
      recReq.ram,
      recReq.storage,
      recReq.os
    )

    const gameId = result.lastInsertRowid as number

    // Link genres to game
    for (const genreName of genres) {
      const genreSlug = genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      
      // Ensure genre exists
      let genre = db.prepare('SELECT id FROM genres WHERE slug = ?').get(genreSlug) as { id: number } | undefined
      if (!genre) {
        const genreResult = db.prepare('INSERT INTO genres (name, slug) VALUES (?, ?)').run(genreName, genreSlug)
        genre = { id: genreResult.lastInsertRowid as number }
      }
      
      // Link to game
      db.prepare('INSERT OR IGNORE INTO game_genres (game_id, genre_id) VALUES (?, ?)').run(gameId, genre.id)
    }

    // Save screenshots to database
    for (let i = 0; i < screenshots.length; i++) {
      db.prepare('INSERT INTO game_screenshots (game_id, image_path, sort_order) VALUES (?, ?, ?)').run(
        gameId,
        screenshots[i],
        i
      )
    }

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as GameRow

    res.status(201).json({
      ...game,
      genres,
      screenshots
    })
  } catch (error) {
    console.error('Steam import error:', error)
    res.status(500).json({ error: 'Failed to import game from Steam' })
  }
})

export default router
