import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: {
    senderId: mongoose.Types.ObjectId;
    text: string;
    sentAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: {
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, default: '' },
      sentAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
