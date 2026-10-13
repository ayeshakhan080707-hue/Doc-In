import mongoose, { Schema, Document } from 'mongoose';

export interface IConnection extends Document {
  requesterId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

ConnectionSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

export const Connection = mongoose.model<IConnection>('Connection', ConnectionSchema);
