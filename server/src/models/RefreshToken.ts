import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IRefreshToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;   // SHA-256 hash of the raw token
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    revoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Static helpers ────────────────────────────────────────────────────────────

/** Hash a raw token for storage */
export const hashToken = (rawToken: string): string =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
