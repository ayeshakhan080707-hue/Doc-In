import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'
  | 'USER_DELETED'
  | 'ROLE_CHANGED'
  | 'CREDENTIAL_APPROVED'
  | 'CREDENTIAL_REJECTED'
  | 'CREDENTIAL_UNDER_REVIEW'
  | 'VERIFIED_SEAL_GRANTED'
  | 'VERIFIED_SEAL_REVOKED'
  | 'GOLD_GRANTED'
  | 'GOLD_REVOKED'
  | 'POST_DELETED'
  | 'POST_REPORTED'
  | 'JOB_CLOSED'
  | 'JOB_DELETED'
  | 'USER_FORCE_LOGOUT'
  | 'TOKENS_REVOKED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED';

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;   // who performed the action
  actorEmail?: string;
  action: AuditAction;
  targetType: 'User' | 'Credential' | 'Post' | 'Job' | 'Session';
  targetId?: string;
  meta?: Record<string, unknown>;     // extra context (old value, new value, reason)
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, index: true },
    meta: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

// TTL: keep audit logs for 1 year
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
