import './config/env'; // Validate env first
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { mountRoutes } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { startPostWorker } from './workers/post.worker';
import { logger } from './utils/logger';

async function bootstrap() {
  // Ensure data directory exists for SQLite
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Run Prisma migrations
  try {
    logger.info('Running database migrations...');
    execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env },
    });
    logger.info('Migrations complete');
  } catch (err) {
    logger.warn('Migration failed, attempting db push fallback...');
    try {
      execSync('npx prisma db push --accept-data-loss', {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env },
      });
      logger.info('DB push complete');
    } catch (pushErr) {
      logger.error('DB initialization failed', { error: String(pushErr) });
    }
  }

  // Seed AppConfig if not exists
  await prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      targetPageId: env.INSTAGRAM_ACCOUNT_ID,
      maxPostsPerDay: 3,
      timezone: env.TIMEZONE,
    },
  });

  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: '*' }));

  // Raw body capture for webhook signature verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Logging
  app.use(morgan('combined'));

  // Serve uploaded media publicly
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/media', express.static(uploadsDir));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  // Routes
  mountRoutes(app);

  // Error handler
  app.use(errorHandler);

  // Start server
  app.listen(env.PORT, () => {
    logger.info(`Backend running on port ${env.PORT}`);
  });

  // Start in-process job scheduler
  startPostWorker();
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
