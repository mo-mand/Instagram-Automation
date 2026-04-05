import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { prisma } from '../config/prisma';
import { addPostJob } from './queue.service';
import { getNextAvailableSlot } from '../utils/peakHours';
import { logger } from '../utils/logger';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Schedule a received post for publishing.
 * - If it's the very first post queued today → publish immediately.
 * - Otherwise → assign next peak-hour slot.
 * - If daily limit reached → queue for tomorrow.
 */
export async function schedulePost(postId: string): Promise<void> {
  const config = await prisma.appConfig.findUnique({ where: { id: 1 } });
  if (!config) throw new Error('AppConfig not found — run seed first');

  const tz = config.timezone;
  const now = dayjs().tz(tz);
  const startOfDay = now.startOf('day').toDate();
  const endOfDay = now.endOf('day').toDate();

  // Count + collect all posts scheduled/posted today
  const todayPosts = await prisma.receivedPost.findMany({
    where: {
      status: { in: ['SCHEDULED', 'POSTED', 'POSTING'] },
      scheduledFor: { gte: startOfDay, lte: endOfDay },
    },
    select: { scheduledFor: true },
  });

  const occupiedSlots = todayPosts
    .map((p) => p.scheduledFor)
    .filter((d): d is Date => d !== null);

  let runAt: Date;

  if (occupiedSlots.length === 0) {
    // First post of the day → immediate
    runAt = new Date();
    logger.info('First post of the day — scheduling immediately', { postId });
  } else if (occupiedSlots.length >= config.maxPostsPerDay) {
    // Daily limit reached → tomorrow
    const nextSlot = getNextAvailableSlot([], tz, config.maxPostsPerDay);
    if (!nextSlot) throw new Error('Could not compute next slot');
    runAt = nextSlot;
    logger.info('Daily limit reached — scheduling for tomorrow', { postId, runAt });
  } else {
    const nextSlot = getNextAvailableSlot(occupiedSlots, tz, config.maxPostsPerDay);
    if (!nextSlot) {
      // Fallback to tomorrow if no slot found today
      const tomorrowSlot = getNextAvailableSlot([], tz, config.maxPostsPerDay);
      runAt = tomorrowSlot || new Date();
    } else {
      runAt = nextSlot;
    }
    logger.info('Scheduling post at next peak slot', { postId, runAt });
  }

  const job = await addPostJob(postId, runAt);

  await prisma.receivedPost.update({
    where: { id: postId },
    data: {
      status: 'SCHEDULED',
      scheduledFor: runAt,
      jobId: job.id?.toString(),
    },
  });

  await prisma.activityLog.create({
    data: {
      event: 'POST_SCHEDULED',
      message: `Post scheduled for ${runAt.toISOString()}`,
      postId,
      level: 'INFO',
    },
  });
}
