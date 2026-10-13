import mongoose, { Schema, Document } from 'mongoose';

export interface IComment {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fullName: string;
  avatarUrl?: string;
  headline?: string;
  text: string;
  createdAt: Date;
}

export interface IPost extends Document {
  authorId: mongoose.Types.ObjectId;
  content: string;
  isClinicalCase: boolean;
  phiSanitizedConfirmed: boolean;
  medicalSpecialty?: string;
  attachments: Array<{
    url: string;
    type: 'IMAGE' | 'PDF' | 'VIDEO';
  }>;
  likes: mongoose.Types.ObjectId[];
  comments: IComment[];
  sharesCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    headline: { type: String, default: '' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const PostSchema = new Schema<IPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    isClinicalCase: { type: Boolean, default: false },
    phiSanitizedConfirmed: { type: Boolean, default: false },
    medicalSpecialty: { type: String, default: 'General Medicine' },
    attachments: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['IMAGE', 'PDF', 'VIDEO'], default: 'IMAGE' },
      },
    ],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
    sharesCount: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export const Post = mongoose.model<IPost>('Post', PostSchema);
