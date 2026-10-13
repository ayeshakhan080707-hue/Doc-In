import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { MedicalGroup } from '../models/MedicalGroup.js';
import { GroupPost } from '../models/GroupPost.js';
import { User } from '../models/User.js';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class GroupsController {
  public static async listGroups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { q, specialty, page = '1', limit = '20' } = req.query;
      const filter: any = { privacy: 'PUBLIC' };
      if (specialty) filter.specialty = { $regex: escapeRegex(String(specialty).substring(0, 100)), $options: 'i' };
      if (q) {
        const safe = escapeRegex(String(q).substring(0, 100));
        filter.$or = [{ name: { $regex: safe, $options: 'i' } }, { description: { $regex: safe, $options: 'i' } }];
      }
      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(50, parseInt(String(limit)));
      const skip = (pageNum - 1) * limitNum;
      const [groups, total] = await Promise.all([
        MedicalGroup.find(filter).sort({ membersCount: -1 }).skip(skip).limit(limitNum).populate('adminId', 'fullName avatarUrl role').lean(),
        MedicalGroup.countDocuments(filter),
      ]);
      res.json({ success: true, data: groups, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async createGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { name, description, specialty, privacy } = req.body;
      if (!name?.trim()) { res.status(400).json({ success: false, message: 'Group name is required.' }); return; }
      const group = await MedicalGroup.create({
        name: name.trim().substring(0, 100),
        description: description?.trim().substring(0, 2000) || '',
        specialty: specialty || 'General Medicine',
        privacy: privacy === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
        adminId: req.user.userId,
        members: [req.user.userId],
        membersCount: 1,
      });
      res.status(201).json({ success: true, data: group });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async getGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const group = await MedicalGroup.findById(id).populate('adminId', 'fullName avatarUrl role isClinicalVerified').lean();
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }
      res.json({ success: true, data: group });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async getMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const group = await MedicalGroup.findById(id).populate('members', 'fullName avatarUrl role isClinicalVerified email').lean();
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }
      res.json({ success: true, data: group.members || [] });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async joinGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id } = req.params;
      const group = await MedicalGroup.findById(id);
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }
      if (group.members.some(m => m.toString() === req.user!.userId)) {
        res.status(400).json({ success: false, message: 'Already a member.' }); return;
      }
      group.members.push(req.user.userId as any);
      group.membersCount = group.members.length;
      await group.save();
      res.json({ success: true, message: 'Joined group.', data: group });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async leaveGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id } = req.params;
      const group = await MedicalGroup.findById(id);
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }
      if (group.adminId.toString() === req.user.userId) {
        res.status(400).json({ success: false, message: 'Admin cannot leave. Transfer ownership or delete the group.' }); return;
      }
      group.members = group.members.filter(m => m.toString() !== req.user!.userId);
      group.membersCount = group.members.length;
      await group.save();
      res.json({ success: true, message: 'Left group.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id, memberId } = req.params;
      const group = await MedicalGroup.findById(id);
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }
      if (group.adminId.toString() !== req.user.userId && req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, message: 'Only group admin can remove members.' }); return;
      }
      if (group.adminId.toString() === memberId) {
        res.status(400).json({ success: false, message: 'Cannot remove the group admin.' }); return;
      }
      group.members = group.members.filter(m => m.toString() !== memberId);
      group.membersCount = group.members.length;
      await group.save();
      res.json({ success: true, message: 'Member removed.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async deleteGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id } = req.params;
      const group = await MedicalGroup.findById(id);
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }
      if (group.adminId.toString() !== req.user.userId && req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, message: 'Access denied.' }); return;
      }
      await Promise.all([
        group.deleteOne(),
        GroupPost.deleteMany({ groupId: group._id }),
      ]);
      res.json({ success: true, message: 'Group deleted.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async getMyGroups(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const groups = await MedicalGroup.find({ members: req.user.userId }).populate('adminId', 'fullName avatarUrl').lean();
      res.json({ success: true, data: groups });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  // --- Group Posts & Discussions ---

  public static async listPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const group = await MedicalGroup.findById(id);
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }

      // If private and user not member
      if (group.privacy === 'PRIVATE') {
        if (!req.user || !group.members.some(m => m.toString() === req.user!.userId)) {
          res.status(403).json({ success: false, message: 'This is a private group. Join to view discussions.' });
          return;
        }
      }

      const posts = await GroupPost.find({ groupId: id })
        .populate('authorId', 'fullName avatarUrl role isClinicalVerified')
        .sort({ pinned: -1, createdAt: -1 })
        .lean();

      res.json({ success: true, data: posts });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async createPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id } = req.params;
      const { content, imageUrl } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, message: 'Content is required.' });
        return;
      }

      const group = await MedicalGroup.findById(id);
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }

      const isMember = group.members.some(m => m.toString() === req.user!.userId);
      if (!isMember) {
        res.status(403).json({ success: false, message: 'You must join this group to post discussions.' });
        return;
      }

      const post = await GroupPost.create({
        groupId: group._id,
        authorId: req.user.userId,
        content: content.trim(),
        imageUrl: imageUrl || '',
        likes: [],
        comments: [],
      });

      const populatedPost = await GroupPost.findById(post._id)
        .populate('authorId', 'fullName avatarUrl role isClinicalVerified')
        .lean();

      res.status(201).json({ success: true, data: populatedPost });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async toggleLike(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { postId } = req.params;
      const post = await GroupPost.findById(postId);
      if (!post) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

      const userIdStr = req.user.userId;
      const index = post.likes.findIndex(id => id.toString() === userIdStr);
      if (index === -1) {
        post.likes.push(userIdStr as any);
      } else {
        post.likes.splice(index, 1);
      }

      await post.save();
      res.json({ success: true, likes: post.likes, liked: index === -1 });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async addComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { postId } = req.params;
      const { text } = req.body;

      if (!text || !text.trim()) {
        res.status(400).json({ success: false, message: 'Comment text cannot be empty.' });
        return;
      }

      const post = await GroupPost.findById(postId);
      if (!post) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

      const user = await User.findById(req.user.userId).select('fullName avatarUrl').lean();
      const comment = {
        userId: req.user.userId as any,
        fullName: user?.fullName || 'Doctor',
        avatarUrl: user?.avatarUrl || '',
        text: text.trim(),
        createdAt: new Date(),
      };

      post.comments.push(comment as any);
      await post.save();

      res.status(201).json({ success: true, data: post.comments[post.comments.length - 1] });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async deletePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { postId } = req.params;
      const post = await GroupPost.findById(postId);
      if (!post) { res.status(404).json({ success: false, message: 'Post not found.' }); return; }

      const group = await MedicalGroup.findById(post.groupId);
      const isAuthor = post.authorId.toString() === req.user.userId;
      const isGroupAdmin = group && group.adminId.toString() === req.user.userId;
      const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

      if (!isAuthor && !isGroupAdmin && !isSuperAdmin) {
        res.status(403).json({ success: false, message: 'Not authorized to delete this post.' });
        return;
      }

      await post.deleteOne();
      res.json({ success: true, message: 'Post deleted successfully.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async uploadGroupAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const { id } = req.params;
      const group = await MedicalGroup.findById(id);
      if (!group) { res.status(404).json({ success: false, message: 'Group not found.' }); return; }

      const isGroupAdmin = group.adminId.toString() === req.user.userId || req.user.role === 'SUPER_ADMIN';
      if (!isGroupAdmin) {
        res.status(403).json({ success: false, message: 'Only group admin can update the group avatar.' });
        return;
      }

      const cloudinaryUrl = (req as any).cloudinaryUrl;
      if (!cloudinaryUrl) {
        res.status(400).json({ success: false, message: 'No file uploaded or upload failed.' });
        return;
      }

      group.avatarUrl = cloudinaryUrl;
      await group.save();

      res.json({ success: true, message: 'Group profile picture updated.', data: { avatarUrl: cloudinaryUrl } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
