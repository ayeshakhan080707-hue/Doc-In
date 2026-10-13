import mongoose, { Schema, Document } from 'mongoose';

export interface IJobApplication extends Document {
  jobId: mongoose.Types.ObjectId;
  applicantId: mongoose.Types.ObjectId;
  coverNote: string;
  status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'REJECTED';
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coverNote: { type: String, default: '', maxlength: 2000 },
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED'],
      default: 'PENDING',
    },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate applications
JobApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

export const JobApplication = mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);
