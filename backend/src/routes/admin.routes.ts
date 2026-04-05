import { Router } from 'express';
import { requireAdminKey } from '../middleware/auth.middleware';
import * as admin from '../controllers/admin.controller';

const router = Router();

router.use(requireAdminKey);

// Stats
router.get('/stats', admin.getStats);

// Activity log
router.get('/logs', admin.getLogs);

// Posted posts
router.get('/posts/posted', admin.getPostedPosts);
router.patch('/posts/:id/caption', admin.editCaption);
router.delete('/posts/:id', admin.deletePostedPost);

// Scheduled posts
router.get('/posts/scheduled', admin.getScheduledPosts);
router.delete('/posts/:id/cancel', admin.cancelScheduledPost);

// Whitelist
router.get('/whitelist', admin.getWhitelist);
router.post('/whitelist', admin.addToWhitelist);
router.delete('/whitelist/:id', admin.removeFromWhitelist);

// Config
router.get('/config', admin.getConfig);
router.put('/config', admin.updateConfig);

export default router;
