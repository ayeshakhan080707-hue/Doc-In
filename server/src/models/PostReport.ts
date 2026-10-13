import mongoose, { Schema, Document } from 'mongoose';

export type ReportReason =
  | 'PHI_VIOLATION'
  | 'MISINFORMATION'
  | 'SPAM'
  | 'HARASSMENT'
  | 'INAPPROPRIATE_CONTENT'
  | 'OTHER';

export interface IPostReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  reason: ReportReason;
  details?: string;
  resolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
}

const PostReportSchema = new Schema<IPostReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    reason: {
      type: String,
      enum: ['PHI_VIOLATION', 'MISINFORMATION', 'SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'OTHER'],
      required: true,
    },
    details: { type: String, maxlength: 500 },
    resolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// One report per user per post
PostReportSchema.index({ reporterId: 1, postId: 1 }, { unique: true });

export const PostReport = mongoose.model<IPostReport>('PostReport', PostReportSchema);
