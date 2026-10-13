import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { JobPosting } from '../models/JobPosting.js';

/** Escape special regex chars to prevent ReDoS */
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class RecruiterController {
  // Search doctors with specialized filters
  // If jobId is provided, match candidates against that specific job's requirements
  public static async searchHealthcareTalent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { specialty, location, minExperience, clinicalVerifiedOnly, query, jobId } = req.query;

      // If matching against a specific job, load job requirements
      let jobRequirements: { specialty?: string; minExp?: number; verificationRequired?: boolean; title?: string } = {};
      if (jobId && typeof jobId === 'string') {
        const job = await JobPosting.findById(jobId).lean();
        if (job) {
          jobRequirements = {
            specialty: job.specializationRequired,
            minExp: job.minimumExperienceYears,
            verificationRequired: job.clinicalVerificationRequired,
            title: job.title,
          };
        }
      }

      // Use job requirements as defaults if provided
      const effectiveSpecialty = (specialty && specialty !== 'All') ? String(specialty) : jobRequirements.specialty;
      const effectiveMinExp = minExperience ? parseInt(String(minExperience)) : jobRequirements.minExp;

      const filter: any = {};

      if (effectiveSpecialty) {
        filter.specialization = { $regex: escapeRegex(effectiveSpecialty.substring(0, 100)), $options: 'i' };
      }
      if (location && typeof location === 'string') {
        filter.city = { $regex: escapeRegex(location.substring(0, 100)), $options: 'i' };
      }
      if (effectiveMinExp && !isNaN(effectiveMinExp) && effectiveMinExp > 0) {
        filter.yearsOfExperience = { $gte: effectiveMinExp };
      }
      if (query && typeof query === 'string') {
        const safe = escapeRegex(query.substring(0, 100));
        filter.$or = [
          { fullName: { $regex: safe, $options: 'i' } },
          { headline: { $regex: safe, $options: 'i' } },
          { procedures: { $regex: safe, $options: 'i' } },
        ];
      }

      let doctors = await DoctorProfile.find(filter)
        .populate('userId', 'email fullName avatarUrl isClinicalVerified subscriptionTier role status')
        .sort({ profileViewsCount: -1 })
        .limit(50)
        .lean();

      // Only show DOCTOR role — exclude HOSPITAL_ADMIN, SUPER_ADMIN, CREDENTIALING_OFFICER, RECRUITER
      doctors = doctors.filter(
        (d: any) =>
          d.userId?.status !== 'SUSPENDED' &&
          d.userId?.role === 'DOCTOR'
      );

      if (clinicalVerifiedOnly === 'true') {
        doctors = doctors.filter((d: any) => d.userId?.isClinicalVerified === true);
      }

      // Compute match score
      const results = doctors.map((doc: any) => {
        let score = 0;

        if (jobRequirements.specialty) {
          // Job-based scoring
          const specMatch = doc.specialization?.toLowerCase().includes(jobRequirements.specialty.toLowerCase());
          if (specMatch) score += 35;

          const expRequired = jobRequirements.minExp || 0;
          if ((doc.yearsOfExperience || 0) >= expRequired + 5) score += 20;
          else if ((doc.yearsOfExperience || 0) >= expRequired) score += 15;
          else score += 5;

          if (doc.userId?.isClinicalVerified) score += 20;
          if (jobRequirements.verificationRequired && !doc.userId?.isClinicalVerified) score -= 10;

          if (doc.procedures && doc.procedures.length >= 3) score += 15;
          else if (doc.procedures && doc.procedures.length > 0) score += 8;

          if (doc.about && doc.about.length > 100) score += 5;
          if (doc.education && doc.education.length > 0) score += 3;
          if (doc.medicalLicenseNumber) score += 2;
        } else {
          // Generic profile completeness scoring (no job context)
          score = 60;
          if (doc.userId?.isClinicalVerified) score += 20;
          if (doc.yearsOfExperience >= 10) score += 8;
          else if (doc.yearsOfExperience >= 5) score += 5;
          else if (doc.yearsOfExperience >= 2) score += 2;
          if (doc.procedures && doc.procedures.length >= 3) score += 5;
          if (doc.about && doc.about.length > 100) score += 3;
          if (doc.education && doc.education.length > 0) score += 2;
          if (doc.medicalLicenseNumber) score += 2;
        }

        return { ...doc, aiMatchScore: Math.min(Math.max(score, 10), 99), matchedJob: jobRequirements.title || null };
      });

      // Sort by score descending
      results.sort((a: any, b: any) => b.aiMatchScore - a.aiMatchScore);

      res.json({ success: true, count: results.length, data: results });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Create Job Posting
  public static async createJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        title,
        institutionName,
        department,
        specializationRequired,
        minimumExperienceYears,
        location,
        jobType,
        salaryRange,
        description,
        clinicalVerificationRequired,
      } = req.body;

      const allowedJobTypes = ['FULL_TIME', 'PART_TIME', 'LOCUM', 'FELLOWSHIP'];
      const safeJobType = allowedJobTypes.includes(jobType) ? jobType : 'FULL_TIME';

      const job = await JobPosting.create({
        employerId: req.user.userId,
        title,
        institutionName,
        department,
        specializationRequired,
        minimumExperienceYears: Math.max(0, parseInt(minimumExperienceYears) || 0),
        location,
        jobType: safeJobType,
        salaryRange: typeof salaryRange === 'string' ? salaryRange.substring(0, 100) : '',
        description,
        clinicalVerificationRequired: clinicalVerificationRequired !== false,
      });

      res.status(201).json({
        success: true,
        message: 'Job requisition posted successfully.',
        data: job,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get All Active Jobs (public — for doctors to browse)
  public static async getJobs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { specialization, page = '1', limit = '20' } = req.query;
      const filter: any = { status: 'ACTIVE' };

      if (specialization && typeof specialization === 'string') {
        filter.specializationRequired = {
          $regex: escapeRegex(specialization.substring(0, 100)),
          $options: 'i',
        };
      }

      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));
      const skip = (pageNum - 1) * limitNum;

      const [jobs, total] = await Promise.all([
        JobPosting.find(filter)
          .populate('employerId', 'fullName avatarUrl')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        JobPosting.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: jobs,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get single job by ID (public)
  public static async getJobById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await JobPosting.findById(jobId)
        .populate('employerId', 'fullName avatarUrl role')
        .lean();

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found.' });
        return;
      }

      res.json({ success: true, data: job });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get Jobs posted by the currently logged-in employer (recruiter / hospital)
  public static async getMyJobs(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const jobs = await JobPosting.find({ employerId: req.user.userId })
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, data: jobs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
