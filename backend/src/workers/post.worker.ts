import { prisma } from '../config/prisma';
import { registerJobHandler } from '../services/queue.service';
import {
  createImageContainer,
  createVideoContainer,
  waitForContainerReady,
  publishMedia,
} from '../services/instagram.service';
import { getMediaPublicUrl } from '../utils/mediaDownloader';
import { logger } from '../utils/logger';

async function processPost(postId: string): Promise<void> {
  logger.info('Processing post job', { postId });

  const post = await prisma.receivedPost.findUnique({ where: { id: postId } });
  if (!post) {
    logger.warn('Post not found, skipping', { postId });
    return;
  }
  if (post.status === 'CANCELLED' || post.status === 'POSTED') {
    logger.info('Post already cancelled or posted, skipping', { postId, status: post.status });
    return;
  }

  await prisma.receivedPost.update({ where: { id: postId }, data: { status: 'POSTING' } });

  try {
    const mediaUrl = post.localFile ? getMediaPublicUrl(post.localFile) : post.mediaUrl;

    let container;
    if (post.mediaType === 'VIDEO') {
      container = await createVideoContainer(mediaUrl, post.caption || undefined);
      await waitForContainerReady(container.id);
    } else {
      container = await createImageContainer(mediaUrl, post.caption || undefined);
    }

    const result = await publishMedia(container.id);

    await prisma.receivedPost.update({
      where: { id: postId },
      data: { status: 'POSTED', instagramPostId: result.id, postedAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        event: 'POST_PUBLISHED',
        message: `Post published to Instagram (${result.id})`,
        postId,
        level: 'INFO',
        meta: JSON.stringify({ instagramPostId: result.id }),
      },
    });

    logger.info('Post published successfully', { postId, instagramPostId: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Failed to publish post', { postId, error: message });

    await prisma.receivedPost.update({ where: { id: postId }, data: { status: 'FAILED' } });

    await prisma.activityLog.create({
      data: {
        event: 'POST_FAILED',
        message: `Failed to publish post: ${message}`,
        postId,
        level: 'ERROR',
      },
    });

    throw err;
  }
}

export function startPostWorker(): void {
  registerJobHandler(processPost);
  logger.info('Post worker started (in-process scheduler)');
}
