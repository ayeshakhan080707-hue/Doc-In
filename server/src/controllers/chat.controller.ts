import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Notification } from '../models/Notification.js';
import { Connection } from '../models/Connection.js';
import { JobPosting } from '../models/JobPosting.js';

export class ChatController {
  // Get active conversations
  public static async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const conversations = await Conversation.find({
        participants: req.user.userId,
      })
        .populate('participants', 'fullName email avatarUrl isClinicalVerified role')
        .sort({ updatedAt: -1 })
        .lean();

      res.json({ success: true, data: conversations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get messages for a conversation with pagination
  public static async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      const { page = '1', limit = '50' } = req.query;
      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
      const skip = (pageNum - 1) * limitNum;

      // Verify requesting user is a participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: req.user.userId,
      }).lean();

      if (!conversation) {
        res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
        return;
      }

      const [messages, total] = await Promise.all([
        Message.find({ conversationId })
          .populate('senderId', 'fullName avatarUrl')
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Message.countDocuments({ conversationId }),
      ]);

      res.json({
        success: true,
        data: messages,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Send a message (also creates conversation if not exists)
  public static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { recipientId, content, conversationId } = req.body;

      let activeConvId = conversationId;

      if (!activeConvId) {
        if (!recipientId || typeof recipientId !== 'string') {
          res.status(400).json({ success: false, message: 'recipientId is required to start a new conversation.' });
          return;
        }

        // Prevent messaging yourself
        if (recipientId === req.user.userId) {
          res.status(400).json({ success: false, message: 'Cannot message yourself.' });
          return;
        }

        let conv = await Conversation.findOne({
          participants: { $all: [req.user.userId, recipientId] },
        });

        if (!conv) {
          conv = await Conversation.create({
            participants: [req.user.userId, recipientId],
          });
        }
        activeConvId = conv._id;
      } else {
        // Verify user is a participant of this conversation
        const conv = await Conversation.findOne({
          _id: activeConvId,
          participants: req.user.userId,
        });
        if (!conv) {
          res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
          return;
        }
      }

      const message = await Message.create({
        conversationId: activeConvId,
        senderId: req.user.userId,
        content: content.trim(),
        readBy: [req.user.userId],
      });

      // Update conversation lastMessage
      await Conversation.findByIdAndUpdate(activeConvId, {
        lastMessage: {
          senderId: req.user.userId,
          text: content.trim().substring(0, 100),
          sentAt: new Date(),
        },
      });

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'fullName avatarUrl')
        .lean();

      res.status(201).json({
        success: true,
        data: populatedMessage,
        conversationId: activeConvId,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get user notifications with pagination
  public static async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));
      const skip = (pageNum - 1) * limitNum;

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find({ recipientId: req.user.userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Notification.countDocuments({ recipientId: req.user.userId }),
        Notification.countDocuments({ recipientId: req.user.userId, isRead: false }),
      ]);

      res.json({
        success: true,
        data: notifications,
        unreadCount,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get nav badge counts: unread messages, pending connections, new jobs
  public static async getBadgeCounts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const userId = req.user.userId;
      const role = req.user.role;

      // 1. Unread messages: conversations where last message is not by me and not read by me
      const conversations = await Conversation.find({ participants: userId }).select('lastMessage').lean();
      let unreadMessages = 0;
      for (const conv of conversations) {
        const lm = (conv as any).lastMessage;
        if (lm && lm.senderId?.toString() !== userId) {
          // Check if latest message in this conversation is unread
          const unread = await Message.countDocuments({
            conversationId: conv._id,
            senderId: { $ne: userId },
            readBy: { $nin: [userId] },
          });
          if (unread > 0) unreadMessages++;
        }
      }

      // 2. Pending incoming connection requests
      const pendingConnections = await Connection.countDocuments({
        recipientId: userId,
        status: 'PENDING',
      });

      // 3. New jobs (only for DOCTOR role) — jobs posted in last 7 days
      let newJobs = 0;
      if (role === 'DOCTOR') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        newJobs = await JobPosting.countDocuments({
          status: 'ACTIVE',
          createdAt: { $gte: sevenDaysAgo },
        });
      }

      res.json({
        success: true,
        data: { unreadMessages, pendingConnections, newJobs },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Mark all notifications as read
  public static async markNotificationsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      await Notification.updateMany(
        { recipientId: req.user.userId, isRead: false },
        { isRead: true }
      );
      res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
