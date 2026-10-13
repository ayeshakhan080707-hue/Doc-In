import { Router } from 'express';
import { RecruiterController } from '../controllers/recruiter.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { validateBody, createJobSchema } from '../middlewares/validate.js';

const router = Router();

// Talent search — public (recruiters and hospitals can view without login)
router.get('/search-talent', RecruiterController.searchHealthcareTalent);

// Job posting — requires auth and correct role
router.post(
  '/jobs',
  requireAuth,
  requireRoles('RECRUITER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'),
  validateBody(createJobSchema),
  RecruiterController.createJob
);

router.get('/jobs', RecruiterController.getJobs);
router.get('/jobs/:jobId', RecruiterController.getJobById);
router.get('/my-jobs', requireAuth, requireRoles('RECRUITER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'), RecruiterController.getMyJobs);

export default router;
