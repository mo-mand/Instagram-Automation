import { Queue, Job } from 'bullmq';
import { redis } from '../config/redis';
import { PostJobData } from '../types/queue.types';

export const POST_QUEUE_NAME = 'post-queue';

export const postQueue = new Queue<PostJobData>(POST_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/**
 * Add a post job scheduled to run at a specific time.
 * @param postId DB record ID
 * @param runAt When to publish (Date)
 * @returns BullMQ Job
 */
export async function addPostJob(postId: string, runAt: Date): Promise<Job<PostJobData>> {
  const delay = Math.max(0, runAt.getTime() - Date.now());
  const job = await postQueue.add(
    'publish-post',
    { postId },
    { delay, jobId: `post-${postId}` }
  );
  return job;
}

/**
 * Remove a scheduled job by its BullMQ job ID.
 */
export async function removePostJob(jobId: string): Promise<void> {
  const job = await postQueue.getJob(jobId);
  if (job) await job.remove();
}
