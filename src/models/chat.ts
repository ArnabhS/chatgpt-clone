import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    chatId: { type: String, required: true }, 
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
