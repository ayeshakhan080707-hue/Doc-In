import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctorProfile extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  headline: string;
  specialization: string;
  subSpecialties: string[];
  medicalLicenseNumber: string;
  licensingBody: string;
  yearsOfExperience: number;
  about: string;
  city: string;
  country: string;
  hospitalAffiliations: Array<{
    hospitalName: string;
    position: string;
    isCurrent: boolean;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  procedures: string[];
  profileViewsCount: number;
  searchAppearancesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorProfileSchema = new Schema<IDoctorProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true },
    headline: { type: String, default: 'Healthcare Professional at DocIn' },
    specialization: { type: String, default: 'General Medicine' },
    subSpecialties: [{ type: String }],
    medicalLicenseNumber: { type: String, default: '' },
    licensingBody: { type: String, default: '' },
    yearsOfExperience: { type: Number, default: 0 },
    about: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    hospitalAffiliations: [
      {
        hospitalName: { type: String },
        position: { type: String },
        isCurrent: { type: Boolean, default: true },
      },
    ],
    education: [
      {
        degree: { type: String },
        institution: { type: String },
        year: { type: Number },
      },
    ],
    procedures: [{ type: String }],
    profileViewsCount: { type: Number, default: 0 },
    searchAppearancesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DoctorProfile = mongoose.model<IDoctorProfile>('DoctorProfile', DoctorProfileSchema);
