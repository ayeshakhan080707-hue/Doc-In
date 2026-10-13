import mongoose, { Schema, Document } from 'mongoose';

export interface ICMERecord extends Document {
  doctorId: mongoose.Types.ObjectId;
  activityTitle: string;
  provider: string;
  credits: number;
  activityType: 'CONFERENCE' | 'ONLINE_COURSE' | 'WORKSHOP' | 'JOURNAL' | 'WEBINAR' | 'OTHER';
  completedAt: Date;
  certificateUrl?: string;
  notes?: string;
  createdAt: Date;
}

const CMERecordSchema = new Schema<ICMERecord>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityTitle: { type: String, required: true, trim: true, maxlength: 200 },
    provider: { type: String, required: true, trim: true, maxlength: 200 },
    credits: { type: Number, required: true, min: 0, max: 100 },
    activityType: {
      type: String,
      enum: ['CONFERENCE', 'ONLINE_COURSE', 'WORKSHOP', 'JOURNAL', 'WEBINAR', 'OTHER'],
      default: 'OTHER',
    },
    completedAt: { type: Date, required: true },
    certificateUrl: { type: String },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

export const CMERecord = mongoose.model<ICMERecord>('CMERecord', CMERecordSchema);
