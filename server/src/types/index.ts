import { Request } from 'express';

export type UserRole = 
  | 'OBSERVER'
  | 'DOCTOR' 
  | 'HOSPITAL_ADMIN' 
  | 'RECRUITER' 
  | 'CREDENTIALING_OFFICER' 
  | 'SUPER_ADMIN';

export type SubscriptionTier = 'FREE' | 'PREMIUM_GOLD';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  isClinicalVerified: boolean;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}
