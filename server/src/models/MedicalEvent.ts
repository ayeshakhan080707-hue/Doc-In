import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicalEvent extends Document {
  title: string;
  description: string;
  organizerId: mongoose.Types.ObjectId;
  organizerName: string;
  specialty: string;
  eventType: 'CONFERENCE' | 'WORKSHOP' | 'WEBINAR' | 'CME_SESSION' | 'SYMPOSIUM' | 'OTHER';
  location: string;
  isOnline: boolean;
  meetingLink?: string;
  startDate: Date;
  endDate: Date;
  registrationUrl?: string;
  cmeCredits?: number;
  rsvps: mongoose.Types.ObjectId[];
  rsvpCount: number;
  createdAt: Date;
}

const MedicalEventSchema = new Schema<IMedicalEvent>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 3000 },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizerName: { type: String, required: true },
    specialty: { type: String, default: 'General Medicine' },
    eventType: {
      type: String,
      enum: ['CONFERENCE', 'WORKSHOP', 'WEBINAR', 'CME_SESSION', 'SYMPOSIUM', 'OTHER'],
      default: 'OTHER',
    },
    location: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    meetingLink: { type: String },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    registrationUrl: { type: String },
    cmeCredits: { type: Number, min: 0, max: 50 },
    rsvps: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    rsvpCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const MedicalEvent = mongoose.model<IMedicalEvent>('MedicalEvent', MedicalEventSchema);
