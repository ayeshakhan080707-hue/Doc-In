import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  senderId?: mongoose.Types.ObjectId;
  type: 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'POST_LIKE' | 'POST_COMMENT' | 'CREDENTIAL_STATUS' | 'JOB_ALERT';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'POST_LIKE', 'POST_COMMENT', 'CREDENTIAL_STATUS', 'JOB_ALERT'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
