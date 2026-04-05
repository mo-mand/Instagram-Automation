export interface MetaWebhookPayload {
  object: string;
  entry: MetaEntry[];
}

export interface MetaEntry {
  id: string;
  time: number;
  messaging?: MetaMessaging[];
  changes?: MetaChange[];
}

export interface MetaMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MetaMessage;
}

export interface MetaMessage {
  mid: string;
  text?: string;
  attachments?: MetaAttachment[];
}

export interface MetaAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'template';
  payload: {
    url?: string;
  };
}

export interface MetaChange {
  field: string;
  value: unknown;
}

export interface IgMediaContainer {
  id: string;
}

export interface IgPublishResult {
  id: string;
}

export interface IgMediaStatusResult {
  status_code: 'FINISHED' | 'IN_PROGRESS' | 'ERROR' | 'EXPIRED';
  id: string;
}
