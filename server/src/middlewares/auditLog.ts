import { AuthRequest } from '../types/index.js';
import { AuditLog, AuditAction } from '../models/AuditLog.js';

/**
 * Log an admin action to the AuditLog collection.
 * Call this inside controller methods after performing the action.
 */
export const logAuditAction = async (
  req: AuthRequest,
  action: AuditAction,
  targetType: 'User' | 'Credential' | 'Post' | 'Job' | 'Session',
  targetId?: string,
  meta?: Record<string, unknown>
): Promise<void> => {
  try {
    if (!req.user) return;
    await AuditLog.create({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      action,
      targetType,
      targetId,
      meta,
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown',
    });
  } catch {
    // Audit log failure should never crash the API
  }
};
