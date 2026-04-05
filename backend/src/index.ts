import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { mountRoutes } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { startPostWorker } from './workers/post.worker';
import { logger } from './utils/logger';

async function initDatabase() {
  // Ensure data directory exists
  const dbPath = env.DATABASE_URL.replace('file:', '');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create all tables using raw SQL — no CLI needed
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WhitelistedAccount" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "instagramUserId" TEXT NOT NULL UNIQUE,
      "username" TEXT,
      "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "isActive" BOOLEAN NOT NULL DEFAULT 1
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReceivedPost" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "senderId" TEXT NOT NULL,
      "dmMessageId" TEXT NOT NULL UNIQUE,
      "mediaType" TEXT NOT NULL,
      "mediaUrl" TEXT NOT NULL,
      "localFile" TEXT,
      "caption" TEXT,
      "rawPayload" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "scheduledFor" DATETIME,
      "jobId" TEXT,
      "instagramPostId" TEXT,
      "postedAt" DATETIME,
      FOREIGN KEY ("senderId") REFERENCES "WhitelistedAccount"("instagramUserId")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppConfig" (
      "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
      "targetPageId" TEXT NOT NULL DEFAULT '',
      "maxPostsPerDay" INTEGER NOT NULL DEFAULT 3,
      "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ActivityLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "level" TEXT NOT NULL DEFAULT 'INFO',
      "event" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "postId" TEXT,
      "meta" TEXT,
      FOREIGN KEY ("postId") REFERENCES "ReceivedPost"("id")
    )
  `);

  // Create indexes
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_post_status" ON "ReceivedPost"("status")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_post_scheduled" ON "ReceivedPost"("scheduledFor")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_log_occurred" ON "ActivityLog"("occurredAt")`);

  // Seed AppConfig
  await prisma.$executeRawUnsafe(`
    INSERT OR IGNORE INTO "AppConfig" ("id", "targetPageId", "maxPostsPerDay", "timezone", "updatedAt")
    VALUES (1, '${env.INSTAGRAM_ACCOUNT_ID}', 3, '${env.TIMEZONE}', CURRENT_TIMESTAMP)
  `);

  logger.info('Database initialized');
}

async function bootstrap() {
  try {
    await initDatabase();
  } catch (err) {
    logger.error('Database init failed', { error: String(err) });
    process.exit(1);
  }

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: '*' }));

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  app.use(morgan('combined'));

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/media', express.static(uploadsDir));

  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  mountRoutes(app);
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    logger.info(`Backend running on port ${env.PORT}`);
  });

  startPostWorker();
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
