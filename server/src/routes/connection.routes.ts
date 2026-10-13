import { Router } from 'express';
import { ConnectionController } from '../controllers/connection.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/request', requireAuth, ConnectionController.sendRequest);
router.post('/respond/:id', requireAuth, ConnectionController.respondRequest);
router.delete('/request/:id', requireAuth, ConnectionController.withdrawRequest);
router.delete('/connection/:id', requireAuth, ConnectionController.removeConnection);
router.get('/my-connections', requireAuth, ConnectionController.getMyConnections);
router.get('/pending', requireAuth, ConnectionController.getPendingInvitations);
router.get('/sent', requireAuth, ConnectionController.getSentRequests);
router.get('/recommendations', ConnectionController.getRecommendations);

export default router;
