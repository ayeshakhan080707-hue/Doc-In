import { Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { AuthRequest } from '../types/index.js';
import { User } from '../models/User.js';


export class TwoFAController {
  // Step 1: Generate secret + QR code
  public static async setupTwoFA(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if ((user as any).twoFactorEnabled) {
        res.status(400).json({ success: false, message: '2FA is already enabled.' });
        return;
      }

      const secret = speakeasy.generateSecret({
        name: `DocIn (${user.email})`,
        issuer: 'DocIn Healthcare Platform',
        length: 20,
      });

      // Store secret temporarily (not enabled yet until verified)
      await User.findByIdAndUpdate(user._id, {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false,
      });

      const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeDataUrl,
          manualEntryKey: secret.base32,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Step 2: Verify token and enable 2FA
  public static async verifyAndEnable(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { token } = req.body;
      if (!token) {
        res.status(400).json({ success: false, message: 'Verification token is required.' });
        return;
      }

      const user = await User.findById(req.user.userId) as any;
      if (!user?.twoFactorSecret) {
        res.status(400).json({ success: false, message: 'Run setup first.' });
        return;
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: String(token),
        window: 1,
      });

      if (!verified) {
        res.status(400).json({ success: false, message: 'Invalid verification code. Please try again.' });
        return;
      }

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      await User.findByIdAndUpdate(user._id, {
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes,
      });

      res.json({
        success: true,
        message: '2FA enabled successfully.',
        data: { backupCodes },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Disable 2FA
  public static async disableTwoFA(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { token } = req.body;
      const user = await User.findById(req.user.userId) as any;

      if (!user?.twoFactorEnabled) {
        res.status(400).json({ success: false, message: '2FA is not enabled.' });
        return;
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: String(token),
        window: 1,
      });

      if (!verified) {
        res.status(400).json({ success: false, message: 'Invalid verification code.' });
        return;
      }

      await User.findByIdAndUpdate(user._id, {
        twoFactorEnabled: false,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: [],
      });

      res.json({ success: true, message: '2FA disabled successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Validate 2FA token during login
  public static async validateToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { token } = req.body;
      const user = await User.findById(req.user.userId) as any;

      if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
        res.status(400).json({ success: false, message: '2FA not enabled for this account.' });
        return;
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: String(token),
        window: 1,
      });

      if (!verified) {
        // Check backup codes
        const backupIdx = user.twoFactorBackupCodes?.indexOf(String(token).toUpperCase());
        if (backupIdx !== undefined && backupIdx >= 0) {
          const codes = [...user.twoFactorBackupCodes];
          codes.splice(backupIdx, 1);
          await User.findByIdAndUpdate(user._id, { twoFactorBackupCodes: codes });
          res.json({ success: true, message: 'Backup code accepted.' });
          return;
        }
        res.status(400).json({ success: false, message: 'Invalid 2FA code.' });
        return;
      }

      res.json({ success: true, message: '2FA verified.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get 2FA status
  public static async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const user = await User.findById(req.user.userId).select('+twoFactorEnabled').lean() as any;
      res.json({ success: true, data: { enabled: !!(user?.twoFactorEnabled) } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
