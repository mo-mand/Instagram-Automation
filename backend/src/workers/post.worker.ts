import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { POST_QUEUE_NAME } from '../services/queue.service';
import {
  createImageContainer,
  createVideoContainer,
  waitForContainerReady,
  publishMedia,
} from '../services/instagram.service';
import { getMediaPublicUrl } from '../utils/mediaDownloader';
import { logger } from '../utils/logger';
import { PostJobData } from '../types/queue.types';

export function startPostWorker() {
  const worker = new Worker<PostJobData>(
    POST_QUEUE_NAME,
    async (job: Job<PostJobData>) => {
      const { postId } = job.data;
      logger.info('Processing post job', { postId, jobId: job.id });

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
        const mediaUrl = post.localFile
          ? getMediaPublicUrl(post.localFile)
          : post.mediaUrl;

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
          data: {
            status: 'POSTED',
            instagramPostId: result.id,
            postedAt: new Date(),
          },
        });

        await prisma.activityLog.create({
          data: {
            event: 'POST_PUBLISHED',
            message: `Post published to Instagram (${result.id})`,
            postId,
            level: 'INFO',
            meta: { instagramPostId: result.id },
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

        throw err; // Let BullMQ handle retries
      }
    },
    {
      connection: redis,
      concurrency: 1, // Post one at a time to respect rate limits
    }
  );

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', { jobId: job?.id, error: err.message });
  });

  logger.info('Post worker started');
  return worker;
}
