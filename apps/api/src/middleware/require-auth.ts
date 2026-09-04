import type { Request, Response, NextFunction } from 'express';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Returns 401 JSON if no active session. All kit routes use this.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
