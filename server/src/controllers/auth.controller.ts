import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { RefreshToken } from '../models/RefreshToken.js';
import {
  generateAccessToken,
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from '../utils/token.js';
import { AuthRequest } from '../types/index.js';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const buildUserPayload = (user: any) => ({
  userId: user._id.toString(),
  email: user.email,
  role: user.role,
  subscriptionTier: user.subscriptionTier,
  isClinicalVerified: user.isClinicalVerified,
});

const buildUserResponse = (user: any) => ({
  id: user._id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  avatarUrl: user.avatarUrl,
  bannerUrl: user.bannerUrl,
  subscriptionTier: user.subscriptionTier,
  isClinicalVerified: user.isClinicalVerified,
  status: user.status,
});

export class AuthController {
  // ── Register ──────────────────────────────────────────────────────────────
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, role, specialization, licenseNumber } = req.body;

      if (!email || !password || !fullName) {
        res.status(400).json({ success: false, message: 'Email, password, and full name are required.' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        return;
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      const validRoles = ['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'OBSERVER'];
      const assignedRole = validRoles.includes(role) ? role : 'DOCTOR';

      const passwordHash = await bcrypt.hash(password, 12);
      const avatarSeed = encodeURIComponent(fullName);
      const user = await User.create({
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        role: assignedRole,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}&backgroundColor=0A66C2&fontColor=ffffff`,
        isEmailVerified: true,
      });

      if (user.role === 'DOCTOR') {
        await DoctorProfile.create({
          userId: user._id,
          fullName: user.fullName,
          specialization: specialization || 'General Medicine',
          medicalLicenseNumber: licenseNumber || '',
          headline: `${specialization || 'General Physician'} | DocIn Healthcare Network`,
        });
      }

      const payload = buildUserPayload(user);
      const accessToken = generateAccessToken(payload);
      const rawRefreshToken = await createRefreshToken(user._id.toString());

      res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTS);

      // Send welcome email (non-blocking)
      sendWelcomeEmail(user.email, user.fullName, user.role).catch(() => {});

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        data: { user: buildUserResponse(user), accessToken },
      });
    } catch (error: any) {
      console.error('[Register Error]:', error);
      res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({ success: false, message: 'This account has been suspended. Please contact support.' });
        return;
      }

      if (!user.passwordHash) {
        res.status(400).json({
          success: false,
          message: 'This account was registered via Google. Please use "Continue with Google".',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      // Check if 2FA is enabled — return a temporary token instead of full access
      if ((user as any).twoFactorEnabled) {
        // Issue a short-lived temp token for 2FA verification only
        const tempToken = require('crypto').randomBytes(32).toString('hex');
        // Store temp token in memory (simple approach) — user must verify 2FA within 5 min
        // We'll use a signed JWT with limited scope
        const jwt = await import('jsonwebtoken');
        const twoFaTempToken = jwt.default.sign(
          { userId: user._id.toString(), scope: '2fa_pending' },
          process.env.JWT_ACCESS_SECRET || 'docin_dev_access_secret_key_32chars_min',
          { expiresIn: '5m' }
        );
        res.json({
          success: true,
          requiresTwoFactor: true,
          twoFactorToken: twoFaTempToken,
          message: '2FA verification required.',
        });
        return;
      }

      const payload = buildUserPayload(user);
      const accessToken = generateAccessToken(payload);
      const rawRefreshToken = await createRefreshToken(user._id.toString());

      res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTS);
      res.json({
        success: true,
        message: 'Login successful.',
        data: { user: buildUserResponse(user), accessToken },
      });
    } catch (error: any) {
      console.error('[Login Error]:', error);
      res.status(500).json({ success: false, message: 'Server error during login.' });
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  public static async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, role } = req.body;

      if (!idToken) {
        res.status(400).json({ success: false, message: 'Google ID token is required.' });
        return;
      }

      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      let googlePayload: any;
      try {
        const ticket = await client.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        googlePayload = ticket.getPayload();
      } catch {
        res.status(401).json({ success: false, message: 'Invalid Google token. Please try again.' });
        return;
      }

      if (!googlePayload?.email) {
        res.status(400).json({ success: false, message: 'Could not extract email from Google account.' });
        return;
      }

      const { email, name, picture, sub: googleId } = googlePayload;
      const isNewUser = !(await User.findOne({ email: email.toLowerCase() }));

      let user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        const validRoles = ['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'OBSERVER'];
        const assignedRole = validRoles.includes(role) ? role : 'DOCTOR';
        user = await User.create({
          email: email.toLowerCase(),
          fullName: name || email.split('@')[0],
          googleId,
          avatarUrl: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
          role: assignedRole,
          isEmailVerified: true,
        });

        if (user.role === 'DOCTOR') {
          await DoctorProfile.create({
            userId: user._id,
            fullName: user.fullName,
            headline: 'Healthcare Professional | DocIn Verified Network',
            specialization: 'General Medicine',
          });
        }

        if (isNewUser) {
          sendWelcomeEmail(user.email, user.fullName, user.role).catch(() => {});
        }
      }

      const payload = buildUserPayload(user);
      const accessToken = generateAccessToken(payload);
      const rawRefreshToken = await createRefreshToken(user._id.toString());

      res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTS);
      res.json({
        success: true,
        data: { user: buildUserResponse(user), accessToken },
      });
    } catch (error: any) {
      console.error('[Google Auth Error]:', error);
      res.status(500).json({ success: false, message: 'Google authentication failed.' });
    }
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  public static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email address is required.' });
        return;
      }

      const genericResponse = {
        success: true,
        message: 'If that email is registered on DocIn, a secure password reset link has been dispatched to your inbox.',
      };

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        res.json(genericResponse);
        return;
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      // Send actual email
      await sendPasswordResetEmail(user.email, user.fullName, rawToken);

      const responseData: any = { ...genericResponse };
      if (process.env.NODE_ENV !== 'production') {
        responseData.devToken = rawToken;
        responseData.devNote = 'Token also returned in development mode for testing.';
      }

      res.json(responseData);
    } catch (error: any) {
      console.error('[Forgot Password Error]:', error);
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  public static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        return;
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
        return;
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Revoke all existing refresh tokens for security
      await revokeAllUserRefreshTokens(user._id.toString());

      res.json({ success: true, message: 'Password has been reset successfully. Please sign in.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }

  // ── Refresh Token (with rotation) ────────────────────────────────────────
  public static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const rawToken = req.cookies.refreshToken;
      if (!rawToken) {
        res.status(401).json({ success: false, message: 'No refresh token.' });
        return;
      }

      // Validate against DB
      const tokenDoc = await validateRefreshToken(rawToken);
      if (!tokenDoc) {
        res.clearCookie('refreshToken');
        res.status(401).json({ success: false, message: 'Refresh token expired or revoked.' });
        return;
      }

      const user = await User.findById(tokenDoc.userId);
      if (!user || user.status === 'SUSPENDED') {
        await revokeRefreshToken(rawToken);
        res.clearCookie('refreshToken');
        res.status(401).json({ success: false, message: 'User not found or suspended.' });
        return;
      }

      // Rotate: revoke old, issue new
      await revokeRefreshToken(rawToken);
      const newRawToken = await createRefreshToken(user._id.toString());

      res.cookie('refreshToken', newRawToken, COOKIE_OPTS);

      const accessToken = generateAccessToken(buildUserPayload(user));
      res.json({ success: true, accessToken });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error refreshing token.' });
    }
  }

  // ── Get Current User ──────────────────────────────────────────────────────
  public static async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      let doctorProfile = null;
      if (user.role === 'DOCTOR') {
        doctorProfile = await DoctorProfile.findOne({ userId: user._id }).lean();
      }

      res.json({
        success: true,
        data: { user: buildUserResponse(user), doctorProfile },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  public static async logout(req: Request, res: Response): Promise<void> {
    const rawToken = req.cookies.refreshToken;
    if (rawToken) {
      await revokeRefreshToken(rawToken).catch(() => {});
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  }

  // ── 2FA Login Verify ─────────────────────────────────────────────────────────
  public static async verifyTwoFALogin(req: Request, res: Response): Promise<void> {
    try {
      const { twoFactorToken, code } = req.body;

      if (!twoFactorToken || !code) {
        res.status(400).json({ success: false, message: '2FA token and code are required.' });
        return;
      }

      // Verify the temp token
      const jwt = await import('jsonwebtoken');
      let decoded: any;
      try {
        decoded = jwt.default.verify(
          twoFactorToken,
          process.env.JWT_ACCESS_SECRET || 'docin_dev_access_secret_key_32chars_min'
        );
      } catch {
        res.status(401).json({ success: false, message: '2FA session expired. Please login again.' });
        return;
      }

      if (decoded.scope !== '2fa_pending') {
        res.status(401).json({ success: false, message: 'Invalid 2FA token.' });
        return;
      }

      const user = await User.findById(decoded.userId) as any;
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        res.status(400).json({ success: false, message: 'Invalid 2FA session.' });
        return;
      }

      // Verify TOTP code
      const speakeasy = await import('speakeasy');
      const verified = speakeasy.default.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: String(code),
        window: 1,
      });

      if (!verified) {
        // Check backup codes
        const backupIdx = user.twoFactorBackupCodes?.indexOf(String(code).toUpperCase());
        if (backupIdx !== undefined && backupIdx >= 0) {
          const codes = [...user.twoFactorBackupCodes];
          codes.splice(backupIdx, 1);
          await User.findByIdAndUpdate(user._id, { twoFactorBackupCodes: codes });
        } else {
          res.status(401).json({ success: false, message: 'Invalid 2FA code. Please try again.' });
          return;
        }
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({ success: false, message: 'Account suspended.' });
        return;
      }

      // 2FA passed — issue full tokens
      const payload = buildUserPayload(user);
      const accessToken = generateAccessToken(payload);
      const rawRefreshToken = await createRefreshToken(user._id.toString());

      res.cookie('refreshToken', rawRefreshToken, COOKIE_OPTS);
      res.json({
        success: true,
        message: 'Login successful.',
        data: { user: buildUserResponse(user), accessToken },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }

  // ── Change Password ───────────────────────────────────────────────────────
  public static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current and new password are required.' });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
        return;
      }

      const user = await User.findById(req.user.userId).select('+passwordHash');
      if (!user || !user.passwordHash) {
        res.status(400).json({ success: false, message: 'Cannot change password for Google-authenticated accounts.' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        return;
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await user.save();

      // Revoke all other refresh tokens (force re-login on other devices)
      const currentRawToken = req.cookies.refreshToken;
      if (currentRawToken) {
        const { hashToken } = await import('../models/RefreshToken.js');
        const currentHash = hashToken(currentRawToken);
        await RefreshToken.updateMany(
          { userId: user._id, revoked: false, tokenHash: { $ne: currentHash } },
          { revoked: true, revokedAt: new Date() }
        );
      }

      res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }

  // ── Get Active Sessions ───────────────────────────────────────────────────
  public static async getActiveSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const sessions = await RefreshToken.find({
        userId: req.user.userId,
        revoked: false,
        expiresAt: { $gt: new Date() },
      })
        .select('createdAt expiresAt')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, data: sessions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }

  // ── Logout All Devices ────────────────────────────────────────────────────
  public static async logoutAllDevices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const count = await revokeAllUserRefreshTokens(req.user.userId);
      res.clearCookie('refreshToken');
      res.json({ success: true, message: `Logged out from ${count} device(s).` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
}
