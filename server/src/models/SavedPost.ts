import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedPost extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  savedAt: Date;
}

const SavedPostSchema = new Schema<ISavedPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Prevent duplicates
SavedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const SavedPost = mongoose.model<ISavedPost>('SavedPost', SavedPostSchema);
