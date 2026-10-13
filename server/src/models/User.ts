import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, SubscriptionTier } from '../types/index.js';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  fullName: string;
  role: UserRole;
  googleId?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: Date;
  isClinicalVerified: boolean;
  verifiedAt?: Date;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  avatarUrl?: string;
  bannerUrl?: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  twoFactorBackupCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['OBSERVER', 'DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'CREDENTIALING_OFFICER', 'SUPER_ADMIN'],
      default: 'DOCTOR',
    },
    googleId: { type: String, sparse: true },
    isEmailVerified: { type: Boolean, default: true }, // Default true for frictionless dev/testing
    emailVerificationToken: { type: String },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    subscriptionTier: {
      type: String,
      enum: ['FREE', 'PREMIUM_GOLD'],
      default: 'FREE',
    },
    subscriptionExpiresAt: { type: Date },
    isClinicalVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'PENDING'],
      default: 'ACTIVE',
    },
    avatarUrl: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorBackupCodes: [{ type: String }],
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
