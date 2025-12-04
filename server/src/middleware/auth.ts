import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'repackking-secret-key-change-in-production'

export interface AuthRequest extends Request {
  userId?: number
  username?: string
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string }
    req.userId = decoded.userId
    req.username = decoded.username
    next()
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' })
    return
  }
}

export function generateToken(userId: number, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' })
}

export { JWT_SECRET }
