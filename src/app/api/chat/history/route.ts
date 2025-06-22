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
    { $sort: { createdAt: -1 } },
    
    {
      $group: {
        _id: "$chatId",
        title: { $first: "$title" },
        lastUserMessage: {
          $first: {
            $cond: [{ $eq: ["$role", "user"] }, "$content", null]
          }
        },
        createdAt: { $first: "$createdAt" },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);
  console.log(messages)
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

  const messages = await ChatMessage.find({ chatId, userId }).sort({ createdAt: 1 });

  return new Response(JSON.stringify({ messages }), { status: 200 });
}
