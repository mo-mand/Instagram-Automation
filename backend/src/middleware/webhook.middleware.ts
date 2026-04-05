import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Verify the X-Hub-Signature-256 header that Meta sends with every webhook.
 * Must be applied BEFORE body parsing so we have access to the raw body.
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  if (!signature) {
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    res.status(400).json({ error: 'No raw body available' });
    return;
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', env.INSTAGRAM_APP_SECRET)
    .update(rawBody)
    .digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
