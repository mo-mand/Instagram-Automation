/**
 * Simple in-process scheduler using setTimeout.
 * For low-volume use (a few posts/day) this is perfectly reliable
 * as long as the server stays running — which it will on Azure App Service.
 * No Redis dependency needed.
 */

type JobHandler = (postId: string) => Promise<void>;

const scheduledJobs = new Map<string, NodeJS.Timeout>();
let _handler: JobHandler | null = null;

/** Register the worker handler once at startup */
export function registerJobHandler(handler: JobHandler): void {
  _handler = handler;
}

export async function addPostJob(
  postId: string,
  runAt: Date
): Promise<{ id: string }> {
  const delay = Math.max(0, runAt.getTime() - Date.now());
  const jobId = `post-${postId}`;

  // Clear any existing job for this post
  const existing = scheduledJobs.get(jobId);
  if (existing) clearTimeout(existing);

  const timeout = setTimeout(async () => {
    scheduledJobs.delete(jobId);
    if (!_handler) return;
    try {
      await _handler(postId);
    } catch (err) {
      console.error(`Job ${jobId} failed:`, err);
      // Retry once after 5 minutes
      setTimeout(async () => {
        try {
          await _handler!(postId);
        } catch (retryErr) {
          console.error(`Job ${jobId} retry also failed:`, retryErr);
        }
      }, 5 * 60 * 1000);
    }
  }, delay);

  scheduledJobs.set(jobId, timeout);
  return { id: jobId };
}

export async function removePostJob(jobId: string): Promise<void> {
  const timeout = scheduledJobs.get(jobId);
  if (timeout) {
    clearTimeout(timeout);
    scheduledJobs.delete(jobId);
  }
}
