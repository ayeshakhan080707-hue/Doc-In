import { Router } from 'express';
import { TwoFAController } from '../controllers/twofa.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/status', requireAuth, TwoFAController.getStatus);
router.post('/setup', requireAuth, TwoFAController.setupTwoFA);
router.post('/verify-enable', requireAuth, TwoFAController.verifyAndEnable);
router.post('/disable', requireAuth, TwoFAController.disableTwoFA);
router.post('/validate', requireAuth, TwoFAController.validateToken);

export default router;
