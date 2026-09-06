import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-jwt-secret-change-me';

// Extend Express Request to carry the authenticated userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Returns 401 JSON if no valid JWT is present.
 * Checks: Authorization: Bearer <token> header first,
 * then falls back to ?token= query param (for SSE/EventSource).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // 2. Fallback: query param (needed for EventSource which can't set headers)
  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Signs a JWT for the given userId. Expires in 7 days. */
export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
