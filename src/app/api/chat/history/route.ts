import { connectDB } from "@/lib/db";
import { ChatMessage } from "@/models/chat";

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
  }

  const messages = await ChatMessage.aggregate([
    { $match: { userId } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$chatId",
        firstUserMessage: { $first: { $cond: [{ $eq: ["$role", "user"] }, "$content", null] } },
        latestMessage: { $last: "$content" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $last: "$createdAt" },
      },
    },
    { $sort: { updatedAt: -1 } },
  ]);

  // Clean up the results to use first user message as title, fallback to latest message
  const chats = messages.map(chat => ({
    _id: chat._id,
    title: chat.firstUserMessage || chat.latestMessage,
    latestMessage: chat.latestMessage,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  }));

  return new Response(JSON.stringify({ chats }), { status: 200 });
}

export async function POST(req: Request) {
 await connectDB()
  const { chatId, userId } = await req.json();

  if (!chatId || !userId) {
    return new Response(JSON.stringify({ error: "Missing chatId or userId" }), { status: 400 });
  }

  const messages = await ChatMessage.find({ chatId, userId }).sort({ createdAt: 1 });

  return new Response(JSON.stringify({ messages }), { status: 200 });
}
