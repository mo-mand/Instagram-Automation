import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const key = authHeader.slice(7);
  if (key !== env.ADMIN_API_KEY) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
}
