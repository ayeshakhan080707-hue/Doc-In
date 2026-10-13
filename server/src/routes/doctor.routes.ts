import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { avatarUpload, uploadSingleToCloudinary } from '../middlewares/upload.js';

const router = Router();

router.get('/me', requireAuth, DoctorController.getMyProfile);
router.put('/me', requireAuth, DoctorController.updateProfile);
router.get('/profile', requireAuth, DoctorController.getMyProfile);
router.put('/profile', requireAuth, DoctorController.updateProfile);
router.get('/analytics', requireAuth, DoctorController.getAnalytics);

// Avatar upload — Cloudinary
router.post(
  '/avatar',
  requireAuth,
  avatarUpload.single('avatar'),
  uploadSingleToCloudinary('docin/avatars'),
  DoctorController.uploadAvatar
);

// Public (no auth needed)
router.get('/public/:id', DoctorController.getPublicUserProfile);
router.get('/profile/:id', DoctorController.getPublicProfile);

export default router;
