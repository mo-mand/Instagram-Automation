import { Application } from 'express';
import webhookRoutes from './webhook.routes';
import adminRoutes from './admin.routes';

export function mountRoutes(app: Application): void {
  app.use('/webhook/instagram', webhookRoutes);
  app.use('/api/admin', adminRoutes);
}
