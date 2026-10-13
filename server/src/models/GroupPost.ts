import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupPost extends Document {
  groupId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  imageUrl?: string;
  likes: mongoose.Types.ObjectId[];
  comments: Array<{
    _id?: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    fullName: string;
    avatarUrl?: string;
    text: string;
    createdAt: Date;
  }>;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupPostSchema = new Schema<IGroupPost>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'MedicalGroup', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 5000 },
    imageUrl: { type: String, default: '' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        fullName: { type: String, required: true },
        avatarUrl: { type: String, default: '' },
        text: { type: String, required: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const GroupPost = mongoose.model<IGroupPost>('GroupPost', GroupPostSchema);
