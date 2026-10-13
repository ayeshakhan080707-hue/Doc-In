import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { verifyAccessToken } from '../utils/token.js';

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    let token = '';

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Authentication error.' });
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }
  } catch {
    // ignore token errors for optional auth
  }
  next();
};
