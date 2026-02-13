import type { Request, Response, NextFunction } from 'express'
import { auth } from '../src/lib/auth'

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction): Promise<void> => {

  const result = await auth.api.getSession({
    headers: req.headers as unknown as Headers
  })
  if (!result) {
    res.status(401).json("Session invalid or expired")
    return
  }
  req.userId = result.user.id
  next()
}