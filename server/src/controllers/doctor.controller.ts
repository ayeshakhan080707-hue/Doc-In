import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';

export class DoctorController {
  // Get current doctor's full profile
  public static async getMyProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      let profile = await DoctorProfile.findOne({ userId: req.user.userId })
        .populate('userId', 'email fullName avatarUrl isClinicalVerified subscriptionTier')
        .lean();

      if (!profile) {
        const user = await User.findById(req.user.userId);
        if (user) {
          const headline = user.role === 'DOCTOR'
            ? 'Medical Professional | DocIn Healthcare Network'
            : `${user.role.replace('_', ' ')} | DocIn Healthcare Network`;

          const created = await DoctorProfile.create({
            userId: user._id,
            fullName: user.fullName || 'Medical Professional',
            headline,
            specialization: 'General Medicine',
            yearsOfExperience: 0,
          });

          profile = await DoctorProfile.findById(created._id)
            .populate('userId', 'email fullName avatarUrl isClinicalVerified subscriptionTier')
            .lean();
        }
      }

      if (!profile) {
        res.status(404).json({ success: false, message: 'Doctor profile not found.' });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Update profile — whitelisted fields only
  public static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        fullName, headline, specialization, subSpecialties, medicalLicenseNumber,
        licensingBody, yearsOfExperience, about, city, country,
        hospitalAffiliations, education, procedures, avatarUrl,
      } = req.body;

      const updateData: Record<string, unknown> = {};
      if (typeof fullName === 'string') updateData.fullName = fullName.trim().substring(0, 100);
      if (typeof headline === 'string') updateData.headline = headline.trim().substring(0, 200);
      if (typeof specialization === 'string') updateData.specialization = specialization.trim().substring(0, 100);
      if (Array.isArray(subSpecialties)) updateData.subSpecialties = subSpecialties.slice(0, 10);
      if (typeof medicalLicenseNumber === 'string') updateData.medicalLicenseNumber = medicalLicenseNumber.trim().substring(0, 100);
      if (typeof licensingBody === 'string') updateData.licensingBody = licensingBody.trim().substring(0, 200);
      if (typeof yearsOfExperience === 'number') {
        updateData.yearsOfExperience = Math.max(0, Math.min(70, yearsOfExperience));
      } else if (typeof yearsOfExperience === 'string') {
        const parsed = parseInt(yearsOfExperience);
        if (!isNaN(parsed)) updateData.yearsOfExperience = Math.max(0, Math.min(70, parsed));
      }
      if (typeof about === 'string') updateData.about = about.trim().substring(0, 3000);
      if (typeof city === 'string') updateData.city = city.trim().substring(0, 100);
      if (typeof country === 'string') updateData.country = country.trim().substring(0, 100);
      if (Array.isArray(hospitalAffiliations)) updateData.hospitalAffiliations = hospitalAffiliations.slice(0, 10);
      if (Array.isArray(education)) updateData.education = education.slice(0, 10);
      if (Array.isArray(procedures)) updateData.procedures = procedures.slice(0, 20);

      const profile = await DoctorProfile.findOneAndUpdate(
        { userId: req.user.userId },
        { $set: updateData },
        { new: true, upsert: true }
      ).lean();

      const userUpdate: Record<string, string> = {};
      if (typeof updateData.fullName === 'string') userUpdate.fullName = updateData.fullName;
      if (typeof avatarUrl === 'string') userUpdate.avatarUrl = avatarUrl.trim().substring(0, 500);
      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(req.user.userId, userUpdate);
      }

      res.json({ success: true, message: 'Profile updated successfully.', data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // View public profile by userId (increments profile views)
  public static async getPublicProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = await DoctorProfile.findOne({ userId: id })
        .populate('userId', 'email fullName avatarUrl isClinicalVerified subscriptionTier createdAt')
        .lean();

      if (!profile) {
        res.status(404).json({ success: false, message: 'Doctor not found.' });
        return;
      }

      if (!req.user || req.user.userId !== id) {
        await DoctorProfile.findOneAndUpdate(
          { userId: id },
          { $inc: { profileViewsCount: 1 } }
        );
        (profile as any).profileViewsCount = ((profile as any).profileViewsCount || 0) + 1;
      }

      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get Analytics — real data from DB
  public static async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const profile = await DoctorProfile.findOne({ userId: req.user.userId })
        .select('profileViewsCount searchAppearancesCount')
        .lean();

      const posts = await Post.find({ authorId: req.user.userId })
        .select('likes comments sharesCount')
        .lean();

      const postImpressions = posts.reduce((sum, p) => {
        return sum + (p.likes?.length || 0) + (p.comments?.length || 0) + (p.sharesCount || 0);
      }, 0);

      res.json({
        success: true,
        data: {
          profileViews: profile?.profileViewsCount ?? 0,
          searchAppearances: profile?.searchAppearancesCount ?? 0,
          postImpressions,
          totalPosts: posts.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Universal public profile — works for Doctor, Recruiter, Hospital Admin
  public static async getPublicUserProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Get user basic info
      const user = await User.findById(id)
        .select('fullName email avatarUrl isClinicalVerified subscriptionTier role status createdAt')
        .lean();

      if (!user || (user as any).status === 'SUSPENDED') {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      // Try to get DoctorProfile (works for DOCTOR, HOSPITAL_ADMIN, RECRUITER — all can have profiles)
      const profile = await DoctorProfile.findOne({ userId: id }).lean();

      // Get user's posts
      const posts = await Post.find({ authorId: id })
        .populate('authorId', 'fullName avatarUrl isClinicalVerified subscriptionTier role')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Increment profile views (not for own profile)
      if (!req.user || req.user.userId !== id) {
        if (profile) {
          await DoctorProfile.findOneAndUpdate({ userId: id }, { $inc: { profileViewsCount: 1 } });
        }
      }

      res.json({
        success: true,
        data: {
          user,
          profile: profile || null,
          posts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Upload Avatar to Cloudinary
  public static async uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const cloudinaryUrl = (req as any).cloudinaryUrl;
      if (!cloudinaryUrl) {
        res.status(400).json({ success: false, message: 'No file uploaded or upload failed.' });
        return;
      }

      await User.findByIdAndUpdate(req.user.userId, { avatarUrl: cloudinaryUrl });

      res.json({ success: true, message: 'Avatar updated.', data: { avatarUrl: cloudinaryUrl } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
