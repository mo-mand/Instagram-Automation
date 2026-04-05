import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { removePostJob } from '../services/queue.service';
import { updateCaption, deletePost as igDeletePost } from '../services/instagram.service';
import { deleteLocalMedia } from '../utils/mediaDownloader';
import { logger } from '../utils/logger';

// --- Stats ---

export async function getStats(req: Request, res: Response): Promise<void> {
  const [total, posted, scheduled, failed, cancelled, whitelistCount] = await Promise.all([
    prisma.receivedPost.count(),
    prisma.receivedPost.count({ where: { status: 'POSTED' } }),
    prisma.receivedPost.count({ where: { status: 'SCHEDULED' } }),
    prisma.receivedPost.count({ where: { status: 'FAILED' } }),
    prisma.receivedPost.count({ where: { status: 'CANCELLED' } }),
    prisma.whitelistedAccount.count({ where: { isActive: true } }),
  ]);

  res.json({ total, posted, scheduled, failed, cancelled, whitelistCount });
}

// --- Activity Log ---

export async function getLogs(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      orderBy: { occurredAt: 'desc' },
      skip,
      take: limit,
      include: { post: { select: { id: true, mediaType: true, caption: true } } },
    }),
    prisma.activityLog.count(),
  ]);

  res.json({ logs, total, page, limit });
}

// --- Posted Posts ---

export async function getPostedPosts(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    prisma.receivedPost.findMany({
      where: { status: 'POSTED' },
      orderBy: { postedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        caption: true,
        mediaType: true,
        localFile: true,
        instagramPostId: true,
        postedAt: true,
        sender: { select: { username: true, instagramUserId: true } },
      },
    }),
    prisma.receivedPost.count({ where: { status: 'POSTED' } }),
  ]);

  res.json({ posts, total, page, limit });
}

export async function editCaption(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { caption } = req.body;

  if (!caption || typeof caption !== 'string') {
    res.status(400).json({ error: 'caption is required' });
    return;
  }

  const post = await prisma.receivedPost.findUnique({ where: { id } });
  if (!post || post.status !== 'POSTED') {
    res.status(404).json({ error: 'Post not found or not yet posted' });
    return;
  }

  if (post.instagramPostId) {
    try {
      await updateCaption(post.instagramPostId, caption);
    } catch (err) {
      logger.warn('Could not update caption on Instagram', { id, err });
    }
  }

  await prisma.receivedPost.update({ where: { id }, data: { caption } });
  await prisma.activityLog.create({
    data: { event: 'CAPTION_EDITED', message: 'Caption edited by admin', postId: id, level: 'INFO' },
  });

  res.json({ success: true });
}

export async function deletePostedPost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const post = await prisma.receivedPost.findUnique({ where: { id } });
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  if (post.instagramPostId) {
    try {
      await igDeletePost(post.instagramPostId);
    } catch (err) {
      logger.warn('Could not delete from Instagram (may already be gone)', { id });
    }
  }

  if (post.localFile) deleteLocalMedia(post.localFile);

  await prisma.activityLog.deleteMany({ where: { postId: id } });
  await prisma.receivedPost.delete({ where: { id } });

  res.json({ success: true });
}

// --- Scheduled Posts ---

export async function getScheduledPosts(req: Request, res: Response): Promise<void> {
  const posts = await prisma.receivedPost.findMany({
    where: { status: { in: ['SCHEDULED', 'PENDING'] } },
    orderBy: { scheduledFor: 'asc' },
    select: {
      id: true,
      caption: true,
      mediaType: true,
      localFile: true,
      scheduledFor: true,
      status: true,
      receivedAt: true,
      sender: { select: { username: true, instagramUserId: true } },
    },
  });

  res.json({ posts });
}

export async function cancelScheduledPost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const post = await prisma.receivedPost.findUnique({ where: { id } });
  if (!post || !['SCHEDULED', 'PENDING'].includes(post.status)) {
    res.status(404).json({ error: 'Scheduled post not found' });
    return;
  }

  if (post.jobId) {
    try {
      await removePostJob(`post-${id}`);
    } catch (err) {
      logger.warn('Could not remove BullMQ job', { jobId: post.jobId });
    }
  }

  await prisma.receivedPost.update({ where: { id }, data: { status: 'CANCELLED' } });
  await prisma.activityLog.create({
    data: { event: 'POST_CANCELLED', message: 'Post cancelled by admin', postId: id, level: 'INFO' },
  });

  res.json({ success: true });
}

// --- Whitelist ---

export async function getWhitelist(req: Request, res: Response): Promise<void> {
  const accounts = await prisma.whitelistedAccount.findMany({
    orderBy: { addedAt: 'desc' },
  });
  res.json({ accounts });
}

export async function addToWhitelist(req: Request, res: Response): Promise<void> {
  const { instagramUserId, username } = req.body;

  if (!instagramUserId) {
    res.status(400).json({ error: 'instagramUserId is required' });
    return;
  }

  const account = await prisma.whitelistedAccount.upsert({
    where: { instagramUserId },
    update: { username, isActive: true },
    create: { instagramUserId, username, isActive: true },
  });

  res.status(201).json({ account });
}

export async function removeFromWhitelist(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  await prisma.whitelistedAccount.update({
    where: { id },
    data: { isActive: false },
  });

  res.json({ success: true });
}

// --- Config ---

export async function getConfig(req: Request, res: Response): Promise<void> {
  const config = await prisma.appConfig.findUnique({ where: { id: 1 } });
  res.json({ config });
}

export async function updateConfig(req: Request, res: Response): Promise<void> {
  const { targetPageId, maxPostsPerDay, timezone } = req.body;

  const config = await prisma.appConfig.upsert({
    where: { id: 1 },
    update: {
      ...(targetPageId !== undefined && { targetPageId }),
      ...(maxPostsPerDay !== undefined && { maxPostsPerDay: Number(maxPostsPerDay) }),
      ...(timezone !== undefined && { timezone }),
    },
    create: {
      id: 1,
      targetPageId: targetPageId || '',
      maxPostsPerDay: maxPostsPerDay || 3,
      timezone: timezone || 'America/Toronto',
    },
  });

  res.json({ config });
}
