import './config/env'; // Validate env first
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { mountRoutes } from './routes';
import { errorHandler } from './middleware/error.middleware';
import { startPostWorker } from './workers/post.worker';
import { logger } from './utils/logger';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: env.NODE_ENV === 'development' ? '*' : env.PUBLIC_BASE_URL }));

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

// Serve uploaded media publicly (so Meta Graph API can fetch it)
app.use('/media', express.static(path.join(process.cwd(), 'uploads')));

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

export default app;
