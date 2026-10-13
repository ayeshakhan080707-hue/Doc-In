import mongoose, { Schema, Document } from 'mongoose';

export interface IRepost extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  repostedAt: Date;
}

const RepostSchema = new Schema<IRepost>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  repostedAt: { type: Date, default: Date.now },
}, { timestamps: false });

// One repost per user per post
RepostSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const Repost = mongoose.model<IRepost>('Repost', RepostSchema);
