import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authRateLimiter, passwordResetLimiter } from '../middlewares/rateLimiter.js';
import {
  validateBody,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../middlewares/validate.js';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
router.post('/login/2fa', authRateLimiter, AuthController.verifyTwoFALogin);
router.post('/google', authRateLimiter, AuthController.googleAuth);
router.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateBody(resetPasswordSchema), AuthController.resetPassword);
router.post('/refresh-token', AuthController.refreshToken);
router.get('/me', requireAuth, AuthController.getCurrentUser);
router.post('/logout', AuthController.logout);
router.post(
  '/change-password',
  requireAuth,
  validateBody({
    currentPassword: { required: true, type: 'string', minLength: 1 },
    newPassword: { required: true, type: 'string', minLength: 8 },
  }),
  AuthController.changePassword
);
router.get('/sessions', requireAuth, AuthController.getActiveSessions);
router.post('/logout-all', requireAuth, AuthController.logoutAllDevices);

export default router;
