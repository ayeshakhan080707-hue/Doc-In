import { Router } from 'express';
import { CMEController } from '../controllers/cme.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireProfessional } from '../middlewares/role.middleware.js';

const router = Router();
router.get('/my', requireAuth, requireProfessional, CMEController.getMyCME);
router.post('/', requireAuth, requireProfessional, CMEController.addCMERecord);
router.delete('/:id', requireAuth, requireProfessional, CMEController.deleteCMERecord);
router.get('/doctor/:doctorId', CMEController.getDoctorCME);
export default router;
