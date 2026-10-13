import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types/index.js';

const PROFESSIONAL_ROLES: UserRole[] = [
  'DOCTOR',
  'HOSPITAL_ADMIN',
  'RECRUITER',
  'CREDENTIALING_OFFICER',
  'SUPER_ADMIN',
];

/**
 * Require specific roles — used for admin/panel endpoints
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
      });
      return;
    }
    next();
  };
};

/**
 * Require a professional account (not OBSERVER).
 * Used on action endpoints: post, connect, message, apply, upload credentials.
 * Returns upgradeRequired: true so the frontend can show the upgrade modal.
 */
export const requireProfessional = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }
  if (!PROFESSIONAL_ROLES.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: 'A professional account is required to perform this action.',
      upgradeRequired: true,
    });
    return;
  }
  next();
};
