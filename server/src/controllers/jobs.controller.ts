import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { JobApplication } from '../models/JobApplication.js';
import { JobPosting } from '../models/JobPosting.js';

export class JobsController {
  // Apply to a job
  public static async applyToJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { jobId } = req.params;
      const { coverNote } = req.body;

      const job = await JobPosting.findById(jobId);
      if (!job || job.status !== 'ACTIVE') {
        res.status(404).json({ success: false, message: 'Job not found or no longer active.' });
        return;
      }

      const existing = await JobApplication.findOne({
        jobId,
        applicantId: req.user.userId,
      });
      if (existing) {
        res.status(400).json({ success: false, message: 'You have already applied to this job.' });
        return;
      }

      const application = await JobApplication.create({
        jobId,
        applicantId: req.user.userId,
        coverNote: typeof coverNote === 'string' ? coverNote.substring(0, 2000) : '',
      });

      // Increment applicants count
      await JobPosting.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully.',
        data: application,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(400).json({ success: false, message: 'You have already applied to this job.' });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get my applications (doctor)
  public static async getMyApplications(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const applications = await JobApplication.find({ applicantId: req.user.userId })
        .populate('jobId', 'title institutionName location jobType status salaryRange department specializationRequired')
        .sort({ appliedAt: -1 })
        .lean();

      res.json({ success: true, data: applications });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get applicants for a job (hospital/recruiter/admin)
  public static async getJobApplicants(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { jobId } = req.params;

      // Verify job belongs to the requesting employer (unless admin)
      if (req.user.role !== 'SUPER_ADMIN') {
        const job = await JobPosting.findById(jobId);
        if (!job) {
          res.status(404).json({ success: false, message: 'Job not found.' });
          return;
        }
        if (job.employerId.toString() !== req.user.userId) {
          res.status(403).json({ success: false, message: 'Access denied.' });
          return;
        }
      }

      const applications = await JobApplication.find({ jobId })
        .populate(
          'applicantId',
          'fullName email avatarUrl isClinicalVerified subscriptionTier role'
        )
        .sort({ appliedAt: -1 })
        .lean();

      res.json({ success: true, count: applications.length, data: applications });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Update application status (hospital/recruiter)
  public static async updateApplicationStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { applicationId } = req.params;
      const { status } = req.body;
      const allowed = ['PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED'];
      if (!allowed.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status.' });
        return;
      }

      const app = await JobApplication.findByIdAndUpdate(
        applicationId,
        { status },
        { new: true }
      ).populate('applicantId', 'fullName email avatarUrl');

      if (!app) {
        res.status(404).json({ success: false, message: 'Application not found.' });
        return;
      }

      res.json({ success: true, data: app });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Close a job posting
  public static async closeJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { jobId } = req.params;
      const job = await JobPosting.findById(jobId);
      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found.' });
        return;
      }

      if (
        job.employerId.toString() !== req.user.userId &&
        req.user.role !== 'SUPER_ADMIN'
      ) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }

      job.status = 'CLOSED';
      await job.save();
      res.json({ success: true, message: 'Job posting closed.', data: job });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
