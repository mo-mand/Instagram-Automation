import { Router } from 'express';
import { verifyWebhook, receiveWebhook } from '../controllers/webhook.controller';
import { verifyWebhookSignature } from '../middleware/webhook.middleware';

const router = Router();

// Meta hub verification
router.get('/', verifyWebhook);

// Incoming DM events
router.post('/', verifyWebhookSignature, receiveWebhook);

export default router;
