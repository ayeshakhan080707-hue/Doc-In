import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';

const router = Router();

router.get('/', SearchController.globalSearch);

export default router;
