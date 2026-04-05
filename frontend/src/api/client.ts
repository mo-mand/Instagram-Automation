import axios from 'axios';

const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

export const api = axios.create({
  baseURL: '/api/admin',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ADMIN_API_KEY}`,
  },
});

// --- Stats ---
export const fetchStats = () => api.get('/stats').then((r) => r.data);

// --- Logs ---
export const fetchLogs = (page = 1, limit = 50) =>
  api.get('/logs', { params: { page, limit } }).then((r) => r.data);

// --- Posted Posts ---
export const fetchPostedPosts = (page = 1) =>
  api.get('/posts/posted', { params: { page } }).then((r) => r.data);
export const editCaption = (id: string, caption: string) =>
  api.patch(`/posts/${id}/caption`, { caption }).then((r) => r.data);
export const deletePost = (id: string) =>
  api.delete(`/posts/${id}`).then((r) => r.data);

// --- Scheduled Posts ---
export const fetchScheduledPosts = () =>
  api.get('/posts/scheduled').then((r) => r.data);
export const cancelPost = (id: string) =>
  api.delete(`/posts/${id}/cancel`).then((r) => r.data);

// --- Whitelist ---
export const fetchWhitelist = () =>
  api.get('/whitelist').then((r) => r.data);
export const addWhitelist = (instagramUserId: string, username?: string) =>
  api.post('/whitelist', { instagramUserId, username }).then((r) => r.data);
export const removeWhitelist = (id: string) =>
  api.delete(`/whitelist/${id}`).then((r) => r.data);

// --- Config ---
export const fetchConfig = () => api.get('/config').then((r) => r.data);
export const updateConfig = (data: { targetPageId?: string; maxPostsPerDay?: number; timezone?: string }) =>
  api.put('/config', data).then((r) => r.data);
