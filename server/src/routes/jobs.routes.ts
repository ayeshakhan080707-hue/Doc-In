import { Router } from 'express';
import { JobsController } from '../controllers/jobs.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();

// Doctor: apply + view own applications
router.post('/:jobId/apply', requireAuth, JobsController.applyToJob);
router.get('/my-applications', requireAuth, JobsController.getMyApplications);

// Employer/Admin: view applicants + update status
router.get(
  '/:jobId/applicants',
  requireAuth,
  requireRoles('HOSPITAL_ADMIN', 'RECRUITER', 'SUPER_ADMIN'),
  JobsController.getJobApplicants
);
router.patch(
  '/applications/:applicationId/status',
  requireAuth,
  requireRoles('HOSPITAL_ADMIN', 'RECRUITER', 'SUPER_ADMIN'),
  JobsController.updateApplicationStatus
);

// Close a job posting
router.patch(
  '/:jobId/close',
  requireAuth,
  requireRoles('HOSPITAL_ADMIN', 'RECRUITER', 'SUPER_ADMIN'),
  JobsController.closeJob
);

export default router;
