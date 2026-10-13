import mongoose, { Schema, Document } from 'mongoose';

export interface ICredentialDocument extends Document {
  userId: mongoose.Types.ObjectId;
  documentType: 'MEDICAL_LICENSE' | 'DEGREE_CERTIFICATE' | 'FELLOWSHIP' | 'EXPERIENCE_LETTER' | 'RESUME';
  fileUrl: string;
  originalFileName: string;
  ocrExtractedData: {
    rawText: string;
    licenseNumber?: string;
    doctorNameFound?: string;
    issuingAuthority?: string;
    degreeFound?: string;
    issueDate?: string;
    expiryDate?: string;
    confidenceScore: number;
  };
  userConfirmedData: {
    licenseNumber?: string;
    issuingAuthority?: string;
    degree?: string;
    expiryDate?: string;
  };
  verificationStatus: 'DRAFT_EXTRACTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CredentialDocumentSchema = new Schema<ICredentialDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentType: {
      type: String,
      enum: ['MEDICAL_LICENSE', 'DEGREE_CERTIFICATE', 'FELLOWSHIP', 'EXPERIENCE_LETTER', 'RESUME'],
      required: true,
    },
    fileUrl: { type: String, required: true },
    originalFileName: { type: String, default: 'document.png' },
    ocrExtractedData: {
      rawText: { type: String, default: '' },
      licenseNumber: { type: String },
      doctorNameFound: { type: String },
      issuingAuthority: { type: String },
      degreeFound: { type: String },
      issueDate: { type: String },
      expiryDate: { type: String },
      confidenceScore: { type: Number, default: 0 },
    },
    userConfirmedData: {
      licenseNumber: { type: String },
      issuingAuthority: { type: String },
      degree: { type: String },
      expiryDate: { type: String },
    },
    verificationStatus: {
      type: String,
      enum: ['DRAFT_EXTRACTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'SUBMITTED',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const CredentialDocument = mongoose.model<ICredentialDocument>('CredentialDocument', CredentialDocumentSchema);
