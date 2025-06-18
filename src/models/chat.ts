import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: String,
  content: String,
});

const ChatSchema = new mongoose.Schema(
  {
    userId: String,
    messages: [MessageSchema],
  },
  { timestamps: true }
);

export const Chat =
  mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
