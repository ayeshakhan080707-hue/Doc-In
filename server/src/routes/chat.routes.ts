import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateBody, sendMessageSchema } from '../middlewares/validate.js';

const router = Router();

router.get('/conversations', requireAuth, ChatController.getConversations);
router.get('/messages/:conversationId', requireAuth, ChatController.getMessages);
router.post('/messages', requireAuth, validateBody(sendMessageSchema), ChatController.sendMessage);
router.get('/notifications', requireAuth, ChatController.getNotifications);
router.get('/badge-counts', requireAuth, ChatController.getBadgeCounts);
router.post('/notifications/read', requireAuth, ChatController.markNotificationsRead);

export default router;
