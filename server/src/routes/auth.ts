import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import db, { AdminUserRow } from '../database/db.js'
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' })
    return
  }

  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as AdminUserRow | undefined

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash)
  
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = generateToken(user.id, user.username)

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username
    }
  })
})

// GET /api/auth/me - Verify token and get current user
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    id: req.userId,
    username: req.username
  })
})

export default router
