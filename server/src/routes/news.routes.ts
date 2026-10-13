import { Router } from 'express';
import { NewsController } from '../controllers/news.controller.js';

const router = Router();

// Public endpoints for clinical briefs & full article reading
router.get('/clinical-briefs', NewsController.getClinicalBriefs);
router.get('/clinical-briefs/:id', NewsController.getArticleById);

export default router;
