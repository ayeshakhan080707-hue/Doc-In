import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/ai/analyze — analyze clinical case (doctors & professionals only)
router.post('/analyze', requireAuth, AIController.analyzeClinicalCase);

export default router;
