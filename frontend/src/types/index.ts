export type PostStatus = 'PENDING' | 'SCHEDULED' | 'POSTING' | 'POSTED' | 'FAILED' | 'CANCELLED';
export type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface Post {
  id: string;
  caption?: string;
  mediaType: MediaType;
  localFile?: string;
  instagramPostId?: string;
  postedAt?: string;
  scheduledFor?: string;
  status: PostStatus;
  receivedAt?: string;
  sender?: { username?: string; instagramUserId: string };
}

export interface ActivityLog {
  id: string;
  occurredAt: string;
  level: LogLevel;
  event: string;
  message: string;
  postId?: string;
  post?: { id: string; mediaType: MediaType; caption?: string };
}

export interface WhitelistedAccount {
  id: string;
  instagramUserId: string;
  username?: string;
  addedAt: string;
  isActive: boolean;
}

export interface AppConfig {
  targetPageId: string;
  maxPostsPerDay: number;
  timezone: string;
}

export interface Stats {
  total: number;
  posted: number;
  scheduled: number;
  failed: number;
  cancelled: number;
  whitelistCount: number;
}
