import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { schedulePost } from '../services/scheduler.service';
import { downloadMedia } from '../utils/mediaDownloader';
import { logger } from '../utils/logger';
import { MetaWebhookPayload } from '../types/instagram.types';
import { env } from '../config/env';

/**
 * GET /webhook/instagram
 * Meta calls this to verify the webhook endpoint during setup.
 */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook verified by Meta');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
}

/**
 * POST /webhook/instagram
 * Receives DM events from Meta.
 */
export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  // Always respond 200 quickly to Meta
  res.status(200).send('EVENT_RECEIVED');

  const payload = req.body as MetaWebhookPayload;
  if (payload.object !== 'instagram') return;

  for (const entry of payload.entry || []) {
    for (const messaging of entry.messaging || []) {
      await processMessage(messaging, payload);
    }
  }
}

async function processMessage(messaging: any, rawPayload: any): Promise<void> {
  try {
    const senderId: string = messaging.sender?.id;
    const messageId: string = messaging.message?.mid;
    const attachments = messaging.message?.attachments;
    const text: string | undefined = messaging.message?.text;

    if (!senderId || !messageId) return;

    // Check whitelist
    const whitelisted = await prisma.whitelistedAccount.findUnique({
      where: { instagramUserId: senderId },
    });

    if (!whitelisted || !whitelisted.isActive) {
      logger.warn('DM from non-whitelisted account ignored', { senderId });
      await prisma.activityLog.create({
        data: {
          event: 'DM_BLOCKED',
          message: `DM from non-whitelisted sender ${senderId} was ignored`,
          level: 'WARN',
          meta: JSON.stringify({ senderId, messageId }),
        },
      });
      return;
    }

    // Check for duplicate
    const existing = await prisma.receivedPost.findUnique({ where: { dmMessageId: messageId } });
    if (existing) return;

    // Extract media
    if (!attachments || attachments.length === 0) {
      logger.info('DM has no media attachment, ignoring', { messageId });
      return;
    }

    const attachment = attachments[0];
    const mediaUrl: string = attachment.payload?.url || '';
    if (!mediaUrl) return;

    const mediaType = attachment.type === 'video' ? 'VIDEO' : 'IMAGE';
    const extension = mediaType === 'VIDEO' ? 'mp4' : 'jpg';

    // Create DB record first (to get the ID for filename)
    const post = await prisma.receivedPost.create({
      data: {
        senderId,
        dmMessageId: messageId,
        mediaType,
        mediaUrl,
        caption: text || null,
        rawPayload: JSON.stringify(rawPayload),
        status: 'PENDING',
      },
    });

    logger.info('DM received and recorded', { postId: post.id, senderId, mediaType });

    // Download media immediately (URLs expire)
    let localFile: string | undefined;
    try {
      localFile = await downloadMedia(mediaUrl, post.id, extension);
      await prisma.receivedPost.update({ where: { id: post.id }, data: { localFile } });
    } catch (err) {
      logger.warn('Could not download media, will use original URL', { postId: post.id });
    }

    await prisma.activityLog.create({
      data: {
        event: 'DM_RECEIVED',
        message: `DM received from @${whitelisted.username || senderId}`,
        postId: post.id,
        level: 'INFO',
        meta: JSON.stringify({ senderId, messageId, mediaType }),
      },
    });

    // Schedule the post
    await schedulePost(post.id);
  } catch (err) {
    logger.error('Error processing webhook message', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
