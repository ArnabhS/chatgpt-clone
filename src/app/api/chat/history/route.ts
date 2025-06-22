import { connectDB } from "@/lib/db";
import { ChatMessage } from "@/models/chat";

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
  }

  // Get the last user message for each chatId
  const messages = await ChatMessage.aggregate([
    { $match: { userId } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$chatId",
        lastUserMessage: {
          $first: {
            $cond: [{ $eq: ["$role", "user"] }, "$content", null]
          }
        },
        createdAt: { $first: "$createdAt" }
      }
    },
    { $sort: { createdAt: -1 } }
  ]);

  
  for (const chat of messages) {
    if (!chat.lastUserMessage) {
      const lastAssistant = await ChatMessage.findOne({
        chatId: chat._id,
        userId,
        role: "assistant"
      }).sort({ createdAt: -1 });
      chat.lastUserMessage = lastAssistant?.content || "No messages yet";
    }
  }

  const chats = messages.map(chat => ({
    _id: chat._id,
    title: chat.lastUserMessage,
    latestMessage: chat.lastUserMessage,
    createdAt: chat.createdAt,
  }));

  return new Response(JSON.stringify({ chats }), { status: 200 });
}

export async function POST(req: Request) {
  await connectDB();
  const { chatId, userId } = await req.json();

  if (!chatId || !userId) {
    return new Response(JSON.stringify({ error: "Missing chatId or userId" }), { status: 400 });
  }

  // Return all messages for the chat in order
  const messages = await ChatMessage.find({ chatId, userId }).sort({ createdAt: 1 });

  return new Response(JSON.stringify({ messages }), { status: 200 });
}
