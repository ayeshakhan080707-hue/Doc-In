import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();
const superAdminOnly = requireRoles('SUPER_ADMIN');

// Analytics
router.get('/analytics', requireAuth, superAdminOnly, AdminController.getPlatformAnalytics);

// User Management
router.get('/users', requireAuth, superAdminOnly, AdminController.getAllUsers);
router.put('/users/:id', requireAuth, superAdminOnly, AdminController.updateUserStatus);
router.post('/users/:id/force-logout', requireAuth, superAdminOnly, AdminController.forceLogoutUser);

// Content Moderation
router.get('/reported-posts', requireAuth, superAdminOnly, AdminController.getReportedPosts);
router.post('/reported-posts/:reportId/resolve', requireAuth, superAdminOnly, AdminController.resolveReport);
router.delete('/posts/:id', requireAuth, superAdminOnly, AdminController.deletePost);

// Audit Logs
router.get('/audit-logs', requireAuth, superAdminOnly, AdminController.getAuditLogs);

// System Settings
router.get('/settings', requireAuth, superAdminOnly, AdminController.getSystemSettings);
router.put('/settings', requireAuth, superAdminOnly, AdminController.updateSystemSettings);

export default router;
