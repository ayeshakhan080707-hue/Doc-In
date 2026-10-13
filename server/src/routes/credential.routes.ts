import { Router } from 'express';
import { CredentialController } from '../controllers/credential.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { credentialUpload } from '../middlewares/upload.js';
import { credentialUploadLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Doctor endpoints — actual file upload via multer
router.post(
  '/upload',
  requireAuth,
  credentialUploadLimiter,
  credentialUpload.single('document'),
  CredentialController.uploadAndProcess
);

// OCR preview — extract text without saving (for the scanner modal)
router.post(
  '/ocr-preview',
  requireAuth,
  credentialUploadLimiter,
  credentialUpload.single('document'),
  CredentialController.ocrPreview
);

router.get('/my-credentials', requireAuth, CredentialController.getMyCredentials);

// Credentialing Officer / Super Admin queue endpoints
router.get(
  '/queue',
  requireAuth,
  requireRoles('CREDENTIALING_OFFICER', 'SUPER_ADMIN'),
  CredentialController.getVerificationQueue
);

router.post(
  '/:id/review',
  requireAuth,
  requireRoles('CREDENTIALING_OFFICER', 'SUPER_ADMIN'),
  CredentialController.markUnderReview
);

router.post(
  '/:id/approve',
  requireAuth,
  requireRoles('CREDENTIALING_OFFICER', 'SUPER_ADMIN'),
  CredentialController.approveCredential
);

router.post(
  '/:id/reject',
  requireAuth,
  requireRoles('CREDENTIALING_OFFICER', 'SUPER_ADMIN'),
  CredentialController.rejectCredential
);

export default router;
