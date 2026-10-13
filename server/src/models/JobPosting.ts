import mongoose, { Schema, Document } from 'mongoose';

export interface IJobPosting extends Document {
  employerId: mongoose.Types.ObjectId;
  title: string;
  institutionName: string;
  department: string;
  specializationRequired: string;
  minimumExperienceYears: number;
  location: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'LOCUM' | 'FELLOWSHIP';
  salaryRange?: string;
  description: string;
  clinicalVerificationRequired: boolean;
  applicantsCount: number;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

const JobPostingSchema = new Schema<IJobPosting>(
  {
    employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    institutionName: { type: String, required: true },
    department: { type: String, required: true },
    specializationRequired: { type: String, required: true },
    minimumExperienceYears: { type: Number, default: 0 },
    location: { type: String, required: true },
    jobType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'LOCUM', 'FELLOWSHIP'],
      default: 'FULL_TIME',
    },
    salaryRange: { type: String, default: '' },
    description: { type: String, required: true },
    clinicalVerificationRequired: { type: Boolean, default: true },
    applicantsCount: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const JobPosting = mongoose.model<IJobPosting>('JobPosting', JobPostingSchema);
