import axios from 'axios';
import { env } from '../config/env';
import { IgMediaContainer, IgMediaStatusResult, IgPublishResult } from '../types/instagram.types';
import { logger } from '../utils/logger';

const BASE_URL = 'https://graph.facebook.com/v21.0';

function igApi() {
  return axios.create({
    baseURL: BASE_URL,
    params: { access_token: env.INSTAGRAM_ACCESS_TOKEN },
  });
}

/**
 * Create an image media container on Instagram.
 * Returns the creation_id used for publishing.
 */
export async function createImageContainer(
  imageUrl: string,
  caption?: string
): Promise<IgMediaContainer> {
  const { data } = await igApi().post(`/${env.INSTAGRAM_ACCOUNT_ID}/media`, null, {
    params: {
      image_url: imageUrl,
      caption: caption || '',
      access_token: env.INSTAGRAM_ACCESS_TOKEN,
    },
  });
  logger.info('Created image container', { id: data.id });
  return data;
}

/**
 * Create a video/reel media container on Instagram.
 */
export async function createVideoContainer(
  videoUrl: string,
  caption?: string
): Promise<IgMediaContainer> {
  const { data } = await igApi().post(`/${env.INSTAGRAM_ACCOUNT_ID}/media`, null, {
    params: {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption || '',
      access_token: env.INSTAGRAM_ACCESS_TOKEN,
    },
  });
  logger.info('Created video container', { id: data.id });
  return data;
}

/**
 * Poll the container status until it's FINISHED (for videos).
 * Times out after maxWaitMs.
 */
export async function waitForContainerReady(
  containerId: string,
  maxWaitMs = 300_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const { data } = await igApi().get<IgMediaStatusResult>(`/${containerId}`, {
      params: { fields: 'status_code' },
    });
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error(`Container ${containerId} failed processing`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Container ${containerId} timed out`);
}

/**
 * Publish a media container to the Instagram page.
 */
export async function publishMedia(containerId: string): Promise<IgPublishResult> {
  const { data } = await igApi().post(`/${env.INSTAGRAM_ACCOUNT_ID}/media_publish`, null, {
    params: {
      creation_id: containerId,
      access_token: env.INSTAGRAM_ACCESS_TOKEN,
    },
  });
  logger.info('Published media', { instagramPostId: data.id });
  return data;
}

/**
 * Update the caption of an already-published Instagram post.
 */
export async function updateCaption(instagramPostId: string, newCaption: string): Promise<void> {
  await igApi().post(`/${instagramPostId}`, null, {
    params: {
      caption: newCaption,
      access_token: env.INSTAGRAM_ACCESS_TOKEN,
    },
  });
  logger.info('Updated caption', { instagramPostId });
}

/**
 * Delete a published Instagram post.
 */
export async function deletePost(instagramPostId: string): Promise<void> {
  await igApi().delete(`/${instagramPostId}`, {
    params: { access_token: env.INSTAGRAM_ACCESS_TOKEN },
  });
  logger.info('Deleted post from Instagram', { instagramPostId });
}

/**
 * Refresh the long-lived access token before it expires (60-day window).
 */
export async function refreshAccessToken(): Promise<string> {
  const { data } = await axios.get(`${BASE_URL}/refresh_access_token`, {
    params: {
      grant_type: 'ig_refresh_token',
      access_token: env.INSTAGRAM_ACCESS_TOKEN,
    },
  });
  logger.info('Access token refreshed');
  return data.access_token;
}
