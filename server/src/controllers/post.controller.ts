import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { SavedPost } from '../models/SavedPost.js';
import { PostReport } from '../models/PostReport.js';
import { PhiSanitizerService } from '../services/phiSanitizer.js';
import { getIO } from '../config/socket.js';
export class PostController {
  // ── Upload Post Image ─────────────────────────────────────────────────────────
  public static async uploadPostImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const cloudinaryUrl = (req as any).cloudinaryUrl;
      if (!cloudinaryUrl) {
        // Fallback: local storage
        const { writeFileSync, mkdirSync } = await import('fs');
        const { join } = await import('path');
        if (!req.file) {
          res.status(400).json({ success: false, message: 'No image file uploaded.' });
          return;
        }
        const uploadDir = join(process.cwd(), 'uploads', 'posts');
        mkdirSync(uploadDir, { recursive: true });
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const filename = `${Date.now()}.${ext}`;
        writeFileSync(join(uploadDir, filename), req.file.buffer);
        res.json({ success: true, data: { url: `/uploads/posts/${filename}` } });
        return;
      }

      res.json({ success: true, data: { url: cloudinaryUrl } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Get Feed ─────────────────────────────────────────────────────────────────
  public static async getFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1')));
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'))));
      const skip = (page - 1) * limit;

      // Get original posts
      const [posts, total] = await Promise.all([
        Post.find()
          .populate('authorId', 'fullName email avatarUrl isClinicalVerified subscriptionTier role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Post.countDocuments(),
      ]);

      // Get reposts — posts shared by others that should appear in feed
      const { Repost } = await import('../models/Repost.js');

      // Get recent reposts (not by the original author — show others' reposts)
      const recentReposts = await Repost.find()
        .sort({ repostedAt: -1 })
        .limit(10)
        .populate({
          path: 'userId',
          select: 'fullName avatarUrl isClinicalVerified subscriptionTier role',
        })
        .populate({
          path: 'postId',
          populate: { path: 'authorId', select: 'fullName email avatarUrl isClinicalVerified subscriptionTier role' },
        })
        .lean();

      // Build reposted post entries (with repostedBy metadata)
      const repostedEntries: any[] = recentReposts
        .filter((r: any) => r.postId) // post still exists
        .map((r: any) => ({
          ...(r.postId as any),
          _repostId: r._id?.toString(),
          _repostedBy: r.userId,
          _repostedAt: r.repostedAt,
          _isRepost: true,
        }));

      // Check which posts current user has reposted
      let repostedPostIds = new Set<string>();
      if (req.user?.userId) {
        const postIds = posts.map((p: any) => p._id.toString());
        const userReposts = await Repost.find({
          userId: req.user.userId,
          postId: { $in: postIds },
        }).select('postId').lean();
        repostedPostIds = new Set(userReposts.map((r: any) => r.postId.toString()));
      }

      const postsWithStatus = posts.map((p: any) => ({
        ...p,
        isRepostedByMe: repostedPostIds.has(p._id.toString()),
      }));

      // Merge original posts + reposted entries, sort by date, deduplicate
      const seenIds = new Set<string>();
      const allEntries = [...postsWithStatus, ...repostedEntries]
        .sort((a: any, b: any) => {
          const dateA = a._repostedAt || a.createdAt;
          const dateB = b._repostedAt || b.createdAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
        .filter((entry: any) => {
          const key = `${entry._id}_${entry._isRepost ? 'repost' : 'original'}`;
          if (seenIds.has(key)) return false;
          seenIds.add(key);
          return true;
        });

      res.json({
        success: true,
        data: allEntries,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Create Post ───────────────────────────────────────────────────────────────
  public static async createPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { content, isClinicalCase, attachments, medicalSpecialty, tags } = req.body;

      let finalContent = content.trim();
      let phiSanitized = false;

      if (isClinicalCase) {
        const phiScan = PhiSanitizerService.scanAndSanitize(finalContent);
        if (phiScan.hasPhiViolation) {
          finalContent = phiScan.sanitizedText;
          phiSanitized = true;
        }
      }

      const safeAttachments = Array.isArray(attachments)
        ? attachments
            .filter((a: any) => a?.url && typeof a.url === 'string')
            .slice(0, 5)
            .map((a: any) => ({
              url: a.url,
              type: ['IMAGE', 'PDF', 'VIDEO'].includes(a.type) ? a.type : 'IMAGE',
            }))
        : [];

      const safeTags = Array.isArray(tags)
        ? tags.filter((t: any) => typeof t === 'string').slice(0, 10)
        : [];

      const post = await Post.create({
        authorId: req.user.userId,
        content: finalContent,
        isClinicalCase: !!isClinicalCase,
        phiSanitizedConfirmed: phiSanitized,
        medicalSpecialty:
          typeof medicalSpecialty === 'string' ? medicalSpecialty : 'General Medicine',
        attachments: safeAttachments,
        tags: safeTags,
      });

      const populatedPost = await Post.findById(post._id)
        .populate('authorId', 'fullName email avatarUrl isClinicalVerified subscriptionTier role')
        .lean();

      res.status(201).json({
        success: true,
        message: 'Post published successfully.',
        data: populatedPost,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Edit Post ─────────────────────────────────────────────────────────────────
  public static async editPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { content, medicalSpecialty, tags } = req.body;

      const post = await Post.findById(id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found.' });
        return;
      }

      if (post.authorId.toString() !== req.user.userId) {
        res.status(403).json({ success: false, message: 'You can only edit your own posts.' });
        return;
      }

      post.content = content.trim();
      if (typeof medicalSpecialty === 'string') post.medicalSpecialty = medicalSpecialty;
      if (Array.isArray(tags)) post.tags = tags.slice(0, 10);

      await post.save();

      const updated = await Post.findById(id)
        .populate('authorId', 'fullName email avatarUrl isClinicalVerified subscriptionTier role')
        .lean();

      res.json({ success: true, message: 'Post updated.', data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Repost (Toggle) ────────────────────────────────────────────────────────
  public static async repostPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      // Dynamic import to avoid circular issues
      const { Repost } = await import('../models/Repost.js');

      const post = await Post.findById(id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found.' });
        return;
      }

      const existing = await Repost.findOne({
        userId: req.user.userId,
        postId: id,
      });

      if (existing) {
        // Un-repost
        await existing.deleteOne();
        await Post.findByIdAndUpdate(id, { $inc: { sharesCount: -1 } });
        const updated = await Post.findById(id).select('sharesCount').lean();
        res.json({ success: true, reposted: false, sharesCount: (updated as any)?.sharesCount ?? 0 });
      } else {
        // Repost
        await Repost.create({ userId: req.user.userId, postId: id });
        await Post.findByIdAndUpdate(id, { $inc: { sharesCount: 1 } });
        const updated = await Post.findById(id).select('sharesCount').lean();
        res.json({ success: true, reposted: true, sharesCount: (updated as any)?.sharesCount ?? 0 });
      }
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(400).json({ success: false, message: 'Already reposted.' });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Toggle Like ───────────────────────────────────────────────────────────────
  public static async toggleLike(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const post = await Post.findById(id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found.' });
        return;
      }

      const userIdStr = req.user.userId;
      const index = post.likes.findIndex((likeId) => likeId.toString() === userIdStr);

      if (index === -1) {
        post.likes.push(req.user.userId as any);

        if (post.authorId.toString() !== userIdStr) {
          const sender = await User.findById(req.user.userId).select('fullName').lean();
          const notif = await Notification.create({
            recipientId: post.authorId,
            senderId: req.user.userId as any,
            type: 'POST_LIKE',
            title: 'New Reaction on your post',
            message: `${sender?.fullName || 'A colleague'} reacted to your post.`,
          });
          try {
            getIO()
              .to(`user_${post.authorId.toString()}`)
              .emit('new_notification', notif);
          } catch {
            // Socket not critical
          }
        }
      } else {
        post.likes.splice(index, 1);
      }

      await post.save();
      res.json({ success: true, likesCount: post.likes.length, isLiked: index === -1 });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Add Comment ───────────────────────────────────────────────────────────────
  public static async addComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { text } = req.body;

      const post = await Post.findById(id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found.' });
        return;
      }

      const user = await User.findById(req.user.userId)
        .select('fullName avatarUrl role')
        .lean();

      const newComment = {
        userId: req.user.userId as any,
        fullName: user?.fullName || 'Colleague',
        avatarUrl: user?.avatarUrl || '',
        headline: user?.role || '',
        text: text.trim(),
        createdAt: new Date(),
      };

      post.comments.push(newComment);
      await post.save();

      if (post.authorId.toString() !== req.user.userId) {
        const notif = await Notification.create({
          recipientId: post.authorId,
          senderId: req.user.userId as any,
          type: 'POST_COMMENT',
          title: 'New comment on your post',
          message: `${user?.fullName || 'A colleague'} commented on your post.`,
        });
        try {
          getIO()
            .to(`user_${post.authorId.toString()}`)
            .emit('new_notification', notif);
        } catch {
          // Socket not critical
        }
      }

      res.status(201).json({ success: true, data: post.comments });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Delete Post ───────────────────────────────────────────────────────────────
  public static async deletePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const post = await Post.findById(id);

      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found.' });
        return;
      }

      const isAuthor = post.authorId.toString() === req.user.userId;
      const isAdmin = req.user.role === 'SUPER_ADMIN';

      if (!isAuthor && !isAdmin) {
        res.status(403).json({ success: false, message: 'You can only delete your own posts.' });
        return;
      }

      await Post.findByIdAndDelete(id);
      res.json({ success: true, message: 'Post deleted.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Toggle Save ───────────────────────────────────────────────────────────
  public static async toggleSave(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { id } = req.params;
      const existing = await SavedPost.findOne({ userId: req.user.userId, postId: id });
      if (existing) {
        await existing.deleteOne();
        res.json({ success: true, saved: false, message: 'Post unsaved.' });
      } else {
        await SavedPost.create({ userId: req.user.userId, postId: id });
        res.json({ success: true, saved: true, message: 'Post saved.' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Get Saved Posts ───────────────────────────────────────────────────────
  public static async getSavedPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(50, parseInt(String(limit)));
      const skip = (pageNum - 1) * limitNum;

      const savedDocs = await SavedPost.find({ userId: req.user.userId })
        .sort({ savedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: 'postId',
          populate: { path: 'authorId', select: 'fullName email avatarUrl isClinicalVerified subscriptionTier role' },
        })
        .lean();

      const posts = savedDocs.map((s: any) => s.postId).filter(Boolean);
      const total = await SavedPost.countDocuments({ userId: req.user.userId });

      res.json({
        success: true, data: posts,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Report Post ───────────────────────────────────────────────────────────
  public static async reportPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { id } = req.params;
      const { reason, details } = req.body;

      const allowedReasons = ['PHI_VIOLATION', 'MISINFORMATION', 'SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'OTHER'];
      if (!allowedReasons.includes(reason)) {
        res.status(400).json({ success: false, message: 'Invalid report reason.' });
        return;
      }

      const post = await Post.findById(id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Post not found.' });
        return;
      }

      try {
        await PostReport.create({
          reporterId: req.user.userId,
          postId: id,
          reason,
          details: typeof details === 'string' ? details.substring(0, 500) : '',
        });
      } catch (err: any) {
        if (err.code === 11000) {
          res.status(400).json({ success: false, message: 'You have already reported this post.' });
          return;
        }
        throw err;
      }

      // Auto-hide if 5+ reports
      const reportCount = await PostReport.countDocuments({ postId: id, resolved: false });
      if (reportCount >= 5) {
        await Post.findByIdAndUpdate(id, { isHidden: true });
      }

      res.json({ success: true, message: 'Post reported. Our moderation team will review it.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Get Saved Status for a list of post IDs ───────────────────────────────
  public static async getSavedStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.json({ success: true, data: {} });
        return;
      }
      const { postIds } = req.body;
      if (!Array.isArray(postIds) || postIds.length === 0) {
        res.json({ success: true, data: {} });
        return;
      }
      const saved = await SavedPost.find({
        userId: req.user.userId,
        postId: { $in: postIds },
      }).select('postId').lean();

      const savedMap: Record<string, boolean> = {};
      saved.forEach((s: any) => { savedMap[s.postId.toString()] = true; });
      res.json({ success: true, data: savedMap });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
