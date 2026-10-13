import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenPayload } from '../types/index.js';
import { RefreshToken, hashToken } from '../models/RefreshToken.js';

// ── Strict secret enforcement ─────────────────────────────────────────────────
const ACCESS_SECRET = (() => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[FATAL] JWT_ACCESS_SECRET must be set and at least 32 characters.');
    }
    return 'docin_dev_access_secret_key_32chars_min';
  }
  return secret;
})();

const REFRESH_SECRET = (() => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[FATAL] JWT_REFRESH_SECRET must be set and at least 32 characters.');
    }
    return 'docin_dev_refresh_secret_key_32chars_min';
  }
  return secret;
})();

const REFRESH_TOKEN_EXPIRES_DAYS = 7;

// ── Access token (short-lived, stateless) ─────────────────────────────────────
export const generateAccessToken = (payload: TokenPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  } catch {
    return null;
  }
};

// ── Refresh token (DB-backed, rotated on each use) ────────────────────────────

/**
 * Generate and store a new refresh token for a user.
 * Returns the raw token (to be sent as httpOnly cookie).
 */
export const createRefreshToken = async (userId: string): Promise<string> => {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ userId, tokenHash, expiresAt });
  return rawToken;
};

/**
 * Validate a refresh token from the DB.
 * Returns the stored document if valid, null otherwise.
 * Does NOT rotate — rotation happens in auth controller.
 */
export const validateRefreshToken = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  const doc = await RefreshToken.findOne({
    tokenHash,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });
  return doc;
};

/**
 * Revoke a specific refresh token.
 */
export const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.findOneAndUpdate(
    { tokenHash },
    { revoked: true, revokedAt: new Date() }
  );
};

/**
 * Revoke ALL refresh tokens for a user (force logout all devices).
 */
export const revokeAllUserRefreshTokens = async (userId: string): Promise<number> => {
  const result = await RefreshToken.updateMany(
    { userId, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );
  return result.modifiedCount;
};

/**
 * Legacy compatibility — generateTokens for places that still call it.
 * Stateless access token only; refresh token creation now async via createRefreshToken.
 */
export const generateTokens = (payload: TokenPayload) => {
  const accessToken = generateAccessToken(payload);
  // Sync fallback (no DB) — used only in seeding/test contexts
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

/** Legacy — kept for backwards compat in non-critical flows */
export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
};
