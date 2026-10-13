import { Response } from 'express';
import { AuthRequest, UserRole } from '../types/index.js';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { CredentialDocument } from '../models/CredentialDocument.js';
import { Post } from '../models/Post.js';
import { JobPosting } from '../models/JobPosting.js';
import { PostReport } from '../models/PostReport.js';
import { AuditLog } from '../models/AuditLog.js';
import { SystemSettings, getSystemSettings } from '../models/SystemSettings.js';
import { revokeAllUserRefreshTokens } from '../utils/token.js';
import { logAuditAction } from '../middlewares/auditLog.js';

const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class AdminController {
  // ── Platform Analytics ────────────────────────────────────────────────────
  public static async getPlatformAnalytics(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const [
        totalUsers, totalDoctors, verifiedDoctors, pendingVerifications,
        totalPosts, totalJobs, goldMembershipsCount, observerCount, specialtyAgg,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'DOCTOR' }),
        User.countDocuments({ role: 'DOCTOR', isClinicalVerified: true }),
        CredentialDocument.countDocuments({ verificationStatus: 'SUBMITTED' }),
        Post.countDocuments(),
        JobPosting.countDocuments(),
        User.countDocuments({ subscriptionTier: 'PREMIUM_GOLD' }),
        User.countDocuments({ role: 'OBSERVER' }),
        DoctorProfile.aggregate([
          { $group: { _id: '$specialization', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { specialty: '$_id', count: 1, _id: 0 } },
        ]),
      ]);

      // Daily registrations for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dailyRegistrations = await User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        success: true,
        data: {
          metrics: {
            totalUsers, totalDoctors, verifiedDoctors, pendingVerifications,
            totalPosts, totalJobs, observerCount,
            verificationRate: totalDoctors > 0 ? Math.round((verifiedDoctors / totalDoctors) * 100) : 0,
            goldMembershipsCount,
          },
          specialtyDistribution: specialtyAgg,
          dailyRegistrations,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Get All Users ─────────────────────────────────────────────────────────
  public static async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { role, query, status, page = '1', limit = '50' } = req.query;
      const allowedRoles: UserRole[] = ['OBSERVER', 'DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'CREDENTIALING_OFFICER', 'SUPER_ADMIN'];
      const allowedStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING'];

      const filter: any = {};
      if (role && role !== 'ALL' && allowedRoles.includes(String(role) as UserRole)) filter.role = role;
      if (status && status !== 'ALL' && allowedStatuses.includes(String(status))) filter.status = status;
      if (query && typeof query === 'string' && query.trim()) {
        const safe = escapeRegex(query.trim().substring(0, 100));
        filter.$or = [
          { fullName: { $regex: safe, $options: 'i' } },
          { email: { $regex: safe, $options: 'i' } },
        ];
      }

      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        User.countDocuments(filter),
      ]);

      res.json({
        success: true, count: users.length, total, data: users,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Update User ───────────────────────────────────────────────────────────
  public static async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const { status, role, subscriptionTier, isClinicalVerified } = req.body;

      const allowedStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING'];
      const allowedRoles: UserRole[] = ['OBSERVER', 'DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'CREDENTIALING_OFFICER', 'SUPER_ADMIN'];
      const allowedTiers = ['FREE', 'PREMIUM_GOLD'];

      if (status && !allowedStatuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status value.' });
        return;
      }
      if (role && !allowedRoles.includes(role)) {
        res.status(400).json({ success: false, message: 'Invalid role value.' });
        return;
      }
      if (subscriptionTier && !allowedTiers.includes(subscriptionTier)) {
        res.status(400).json({ success: false, message: 'Invalid subscription tier.' });
        return;
      }
      if (id === req.user.userId && role && role !== 'SUPER_ADMIN') {
        res.status(400).json({ success: false, message: 'Cannot change your own role.' });
        return;
      }

      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const meta: any = {};
      if (status && user.status !== status) { meta.statusChange = { from: user.status, to: status }; user.status = status; }
      if (role && user.role !== role) { meta.roleChange = { from: user.role, to: role }; user.role = role; }
      if (subscriptionTier) { meta.tierChange = { to: subscriptionTier }; user.subscriptionTier = subscriptionTier; }
      if (typeof isClinicalVerified === 'boolean') {
        meta.verifiedChange = { to: isClinicalVerified };
        user.isClinicalVerified = isClinicalVerified;
        if (isClinicalVerified) user.verifiedAt = new Date();
      }

      await user.save();

      // Determine audit action
      let auditAction: any = 'USER_UPDATED';
      if (status === 'SUSPENDED') auditAction = 'USER_SUSPENDED';
      else if (status === 'ACTIVE' && meta.statusChange?.from === 'SUSPENDED') auditAction = 'USER_ACTIVATED';
      else if (meta.roleChange) auditAction = 'ROLE_CHANGED';
      else if (meta.verifiedChange?.to === true) auditAction = 'VERIFIED_SEAL_GRANTED';
      else if (meta.verifiedChange?.to === false) auditAction = 'VERIFIED_SEAL_REVOKED';
      else if (meta.tierChange?.to === 'PREMIUM_GOLD') auditAction = 'GOLD_GRANTED';
      else if (meta.tierChange?.to === 'FREE') auditAction = 'GOLD_REVOKED';

      await logAuditAction(req, auditAction, 'User', id, meta);

      res.json({ success: true, message: 'User updated successfully.', data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Force Logout User ─────────────────────────────────────────────────────
  public static async forceLogoutUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      const count = await revokeAllUserRefreshTokens(id);
      await logAuditAction(req, 'USER_FORCE_LOGOUT', 'Session', id, { sessionsRevoked: count });
      res.json({ success: true, message: `Revoked ${count} active session(s) for user.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Delete Any Post (content moderation) ─────────────────────────────────
  public static async deletePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      const post = await Post.findById(id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found.' });
        return;
      }
      await Post.findByIdAndDelete(id);
      await logAuditAction(req, 'POST_DELETED', 'Post', id, { authorId: post.authorId.toString() });
      res.json({ success: true, message: 'Post deleted by admin.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Get Reported Posts ────────────────────────────────────────────────────
  public static async getReportedPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { resolved = 'false', page = '1', limit = '20' } = req.query;
      const filter: any = { resolved: resolved === 'true' };
      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(50, parseInt(String(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [reports, total] = await Promise.all([
        PostReport.find(filter)
          .populate('reporterId', 'fullName email')
          .populate({ path: 'postId', populate: { path: 'authorId', select: 'fullName email' } })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        PostReport.countDocuments(filter),
      ]);

      res.json({
        success: true, data: reports,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Resolve Report ────────────────────────────────────────────────────────
  public static async resolveReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { reportId } = req.params;
      const { action } = req.body; // 'IGNORE' | 'DELETE_POST'

      const report = await PostReport.findById(reportId);
      if (!report) {
        res.status(404).json({ success: false, message: 'Report not found.' });
        return;
      }

      if (action === 'DELETE_POST') {
        await Post.findByIdAndDelete(report.postId);
        await logAuditAction(req, 'POST_DELETED', 'Post', report.postId.toString(), { reason: 'report_resolved' });
      }

      report.resolved = true;
      report.resolvedBy = req.user.userId as any;
      report.resolvedAt = new Date();
      await report.save();

      res.json({ success: true, message: `Report resolved — action: ${action}` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Get Audit Logs ────────────────────────────────────────────────────────
  public static async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { action, actorId, targetId, from, to, page = '1', limit = '50' } = req.query;
      const filter: any = {};

      if (action) filter.action = action;
      if (actorId) filter.actorId = actorId;
      if (targetId) filter.targetId = targetId;
      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(String(from));
        if (to) filter.createdAt.$lte = new Date(String(to));
      }

      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(100, parseInt(String(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .populate('actorId', 'fullName email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      res.json({
        success: true, data: logs,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── System Settings ───────────────────────────────────────────────────────
  public static async getSystemSettings(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const settings = await getSystemSettings();
      res.json({ success: true, data: settings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateSystemSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const settings = await getSystemSettings();
      const {
        maintenanceMode, maintenanceMessage, announcementBanner,
        announcementBannerActive, allowedRegistrationRoles,
        maxUploadSizeMb, featureFlags,
      } = req.body;

      if (typeof maintenanceMode === 'boolean') settings.maintenanceMode = maintenanceMode;
      if (maintenanceMessage) settings.maintenanceMessage = maintenanceMessage;
      if (announcementBanner !== undefined) settings.announcementBanner = announcementBanner;
      if (typeof announcementBannerActive === 'boolean') settings.announcementBannerActive = announcementBannerActive;
      if (Array.isArray(allowedRegistrationRoles)) settings.allowedRegistrationRoles = allowedRegistrationRoles;
      if (maxUploadSizeMb) settings.maxUploadSizeMb = Math.min(50, Math.max(1, Number(maxUploadSizeMb)));
      if (featureFlags && typeof featureFlags === 'object') {
        settings.featureFlags = { ...settings.featureFlags, ...featureFlags };
      }

      await settings.save();
      res.json({ success: true, message: 'System settings updated.', data: settings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
