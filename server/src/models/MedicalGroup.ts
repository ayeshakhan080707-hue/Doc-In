import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicalGroup extends Document {
  name: string;
  description: string;
  specialty: string;
  privacy: 'PUBLIC' | 'PRIVATE';
  adminId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  membersCount: number;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalGroupSchema = new Schema<IMedicalGroup>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 2000 },
    specialty: { type: String, default: 'General Medicine', maxlength: 100 },
    privacy: { type: String, enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    membersCount: { type: Number, default: 1 },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

MedicalGroupSchema.index({ name: 'text', specialty: 'text' });

export const MedicalGroup = mongoose.model<IMedicalGroup>('MedicalGroup', MedicalGroupSchema);
