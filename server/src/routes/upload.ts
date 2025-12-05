import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { authenticateToken, AuthRequest } from '../middleware/auth.js'
import fs from 'fs'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Configure upload directory
const uploadDir = path.join(__dirname, '../../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Cover image size - resize to fit card dimensions while keeping full image
const COVER_IMAGE_SIZE = { width: 300, height: 400 }

// Configure multer to use memory storage for processing
const storage = multer.memoryStorage()

// File filter - only images
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
})

// POST /api/upload - Upload cover image (admin only)
router.post('/', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }

    const filename = `cover_${uuidv4()}.jpg`
    const outputPath = path.join(uploadDir, filename)
    
    // Process image - resize to fit card dimensions while keeping full image visible
    await sharp(req.file.buffer)
      .resize(COVER_IMAGE_SIZE.width, COVER_IMAGE_SIZE.height, {
        fit: 'contain',  // Keep full image, fit within bounds
        background: { r: 0, g: 0, b: 0, alpha: 0 }  // Transparent background for any padding
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(outputPath)

    const imageUrl = `/uploads/${filename}`
    
    res.json({
      success: true,
      url: imageUrl,
      filename: filename
    })
  } catch (error) {
    console.error('Error processing image:', error)
    res.status(500).json({ error: 'Failed to process image' })
  }
})

export default router
