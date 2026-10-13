import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { Post } from '../models/Post.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { JobPosting } from '../models/JobPosting.js';
import { MedicalGroup } from '../models/MedicalGroup.js';

const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class SearchController {
  public static async globalSearch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { q, type } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length < 1) {
        res.status(200).json({
          success: true,
          query: '',
          data: { doctors: [], posts: [], jobs: [], groups: [] },
        });
        return;
      }

      const safe = escapeRegex(q.trim().substring(0, 100));
      const regex = { $regex: safe, $options: 'i' };

      const results: Record<string, unknown> = {};

      if (!type || type === 'doctors') {
        results.doctors = await DoctorProfile.find({
          $or: [
            { fullName: regex },
            { specialization: regex },
            { headline: regex },
            { city: regex },
            { country: regex },
          ],
        })
          .populate(
            'userId',
            'fullName avatarUrl isClinicalVerified subscriptionTier role status'
          )
          .limit(8)
          .lean();
      }

      if (!type || type === 'groups') {
        results.groups = await MedicalGroup.find({
          privacy: 'PUBLIC',
          $or: [{ name: regex }, { specialty: regex }, { description: regex }],
        })
          .limit(6)
          .lean();
      }

      if (!type || type === 'jobs') {
        results.jobs = await JobPosting.find({
          status: 'ACTIVE',
          $or: [
            { title: regex },
            { specializationRequired: regex },
            { institutionName: regex },
            { location: regex },
          ],
        })
          .populate('employerId', 'fullName avatarUrl')
          .sort({ createdAt: -1 })
          .limit(6)
          .lean();
      }

      if (!type || type === 'posts') {
        results.posts = await Post.find({ content: regex })
          .populate('authorId', 'fullName avatarUrl isClinicalVerified role')
          .sort({ createdAt: -1 })
          .limit(6)
          .lean();
      }

      res.json({ success: true, query: q.trim(), data: results });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
