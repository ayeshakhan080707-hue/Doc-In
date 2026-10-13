import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { Connection } from '../models/Connection.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { getIO } from '../config/socket.js';

export class ConnectionController {
  // 1. Send Connection Request
  public static async sendRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { recipientId } = req.body;
      if (!recipientId || typeof recipientId !== 'string') {
        res.status(400).json({ success: false, message: 'Recipient ID is required.' });
        return;
      }

      if (recipientId === req.user.userId) {
        res.status(400).json({ success: false, message: 'Cannot connect with yourself.' });
        return;
      }

      const recipient = await User.findById(recipientId).select('_id status').lean();
      if (!recipient || recipient.status === 'SUSPENDED') {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const existing = await Connection.findOne({
        $or: [
          { requesterId: req.user.userId, recipientId },
          { requesterId: recipientId, recipientId: req.user.userId },
        ],
      });

      if (existing) {
        res.status(400).json({
          success: false,
          message: `Connection already ${existing.status.toLowerCase()}.`,
        });
        return;
      }

      const connection = await Connection.create({
        requesterId: req.user.userId,
        recipientId,
        status: 'PENDING',
      });

      const sender = await User.findById(req.user.userId).select('fullName').lean();
      const notif = await Notification.create({
        recipientId,
        senderId: req.user.userId as any,
        type: 'CONNECTION_REQUEST',
        title: 'New Connection Request',
        message: `${sender?.fullName || 'A healthcare professional'} requested to connect with you on DocIn.`,
      });

      // Real-time notification
      try {
        getIO().to(`user_${recipientId}`).emit('new_notification', notif);
      } catch {
        // Socket not critical
      }

      res.status(201).json({
        success: true,
        message: 'Connection invitation dispatched.',
        data: connection,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 2. Respond to Connection Request (Accept / Decline)
  public static async respondRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { action } = req.body;

      if (!['ACCEPTED', 'DECLINED'].includes(action)) {
        res.status(400).json({
          success: false,
          message: "Action must be 'ACCEPTED' or 'DECLINED'.",
        });
        return;
      }

      const connection = await Connection.findOne({
        _id: id,
        recipientId: req.user.userId,
        status: 'PENDING',
      });

      if (!connection) {
        res.status(404).json({ success: false, message: 'Connection invitation not found.' });
        return;
      }

      connection.status = action === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';
      await connection.save();

      if (action === 'ACCEPTED') {
        const recipient = await User.findById(req.user.userId).select('fullName').lean();
        const notif = await Notification.create({
          recipientId: connection.requesterId,
          senderId: req.user.userId as any,
          type: 'CONNECTION_ACCEPTED',
          title: 'Connection Invitation Accepted',
          message: `${recipient?.fullName || 'Colleague'} accepted your connection invitation.`,
        });
        try {
          getIO()
            .to(`user_${connection.requesterId.toString()}`)
            .emit('new_notification', notif);
        } catch {
          // Socket not critical
        }
      }

      res.json({
        success: true,
        message: `Connection ${action.toLowerCase()}.`,
        data: connection,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 3. Withdraw a sent connection request (requester only)
  public static async withdrawRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const connection = await Connection.findOne({
        _id: id,
        requesterId: req.user.userId,
        status: 'PENDING',
      });

      if (!connection) {
        res.status(404).json({
          success: false,
          message: 'Pending connection request not found.',
        });
        return;
      }

      await connection.deleteOne();
      res.json({ success: true, message: 'Connection request withdrawn.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 4. Remove an accepted connection (either party)
  public static async removeConnection(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const connection = await Connection.findOne({
        _id: id,
        status: 'ACCEPTED',
        $or: [
          { requesterId: req.user.userId },
          { recipientId: req.user.userId },
        ],
      });

      if (!connection) {
        res.status(404).json({ success: false, message: 'Connection not found.' });
        return;
      }

      await connection.deleteOne();
      res.json({ success: true, message: 'Connection removed.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 5. Get My Connections
  public static async getMyConnections(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const connections = await Connection.find({
        $or: [{ requesterId: req.user.userId }, { recipientId: req.user.userId }],
        status: 'ACCEPTED',
      })
        .populate('requesterId', 'fullName email avatarUrl isClinicalVerified subscriptionTier role')
        .populate('recipientId', 'fullName email avatarUrl isClinicalVerified subscriptionTier role')
        .lean();

      const formatted = connections.map((c: any) => {
        const isRequester = c.requesterId._id.toString() === req.user!.userId;
        return {
          connectionId: c._id,
          connectedUser: isRequester ? c.recipientId : c.requesterId,
          connectedAt: c.updatedAt,
        };
      });

      res.json({ success: true, data: formatted });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 6. Get Pending Invitations (Incoming)
  public static async getPendingInvitations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const invitations = await Connection.find({
        recipientId: req.user.userId,
        status: 'PENDING',
      })
        .populate('requesterId', 'fullName email avatarUrl isClinicalVerified subscriptionTier role')
        .lean();

      res.json({ success: true, data: invitations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 7. Get Sent (Outgoing) Pending Requests
  public static async getSentRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const sent = await Connection.find({
        requesterId: req.user.userId,
        status: 'PENDING',
      })
        .select('_id recipientId')
        .lean();

      // Return map of recipientId → connectionId for easy lookup on frontend
      const data: Record<string, string> = {};
      sent.forEach((c: any) => {
        data[c.recipientId.toString()] = c._id.toString();
      });

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 8. Get Discover / Recommended Connections (excludes existing + pending)
  public static async getRecommendations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.userId;
      const { page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));
      const skip = (pageNum - 1) * limitNum;

      // Roles visible in network: only doctors, hospital admins, and recruiters
      const ALLOWED_ROLES = ['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER'];

      let excludedIds: string[] = [];

      if (currentUserId) {
        // Exclude self + anyone with ANY existing connection record (PENDING or ACCEPTED)
        const existingConnections = await Connection.find({
          $or: [{ requesterId: currentUserId }, { recipientId: currentUserId }],
        })
          .select('requesterId recipientId')
          .lean();

        const connectedUserIds = existingConnections.map((c) =>
          c.requesterId.toString() === currentUserId
            ? c.recipientId.toString()
            : c.requesterId.toString()
        );

        excludedIds = [currentUserId, ...connectedUserIds];
      }

      const filter: Record<string, unknown> = {
        status: 'ACTIVE',
        role: { $in: ALLOWED_ROLES },
        ...(excludedIds.length > 0 && { _id: { $nin: excludedIds } }),
      };

      const [users, total] = await Promise.all([
        User.find(filter)
          .skip(skip)
          .limit(limitNum)
          .select('fullName email avatarUrl isClinicalVerified subscriptionTier role')
          .lean(),
        User.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
