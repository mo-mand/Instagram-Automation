import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function downloadMedia(
  mediaUrl: string,
  postId: string,
  extension: string = 'jpg'
): Promise<string> {
  const filename = `${postId}.${extension}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const response = await axios.get(mediaUrl, {
    responseType: 'stream',
    headers: {
      Authorization: `Bearer ${env.INSTAGRAM_ACCESS_TOKEN}`,
    },
    timeout: 30000,
  });

  const writer = fs.createWriteStream(filePath);

  await new Promise<void>((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return filename;
}

export function getMediaPublicUrl(filename: string): string {
  return `${env.PUBLIC_BASE_URL}/media/${filename}`;
}

export function deleteLocalMedia(filename: string): void {
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
