import { Memory } from 'mem0ai/oss';
import { ChatMessage } from '@/models/chat';


const config = {
  version: 'v1.1',
  embedder: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'text-embedding-3-small',
    },
  },
  vectorStore: {
    provider: 'supabase',
    config: {
      collectionName: "memories",
      embeddingModelDims: 1536,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      tableName: "memories",
    },
  },
  llm: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo-preview',
    },
  },
  historyStore: {
    provider: 'supabase',
    config: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      tableName: 'memory_history',
    },
  },
  disableHistory: false, 
}

const memory = new Memory(config);

export async function storeMessages(
  userId: string,
  chatId: string,
  userContent: string,
  assistantContent: string,
  userFileFields?: Partial<{
    imageData: string;
    imageName: string;
    pdfData: string;
    pdfName: string;
    txtData: string;
    txtName: string;
  }>,
  assistantFileFields?: Partial<{
    imageData: string;
    imageName: string;
    pdfData: string;
    pdfName: string;
    txtData: string;
    txtName: string;
  }>
) {
  const messages = [
    { role: 'user' as const, content: userContent },
    { role: 'assistant' as const, content: assistantContent },
  ];
  try {
    console.log("message recieved", userId, messages)
    await memory.add(messages, { userId: userId, metadata: { category: "chat" }  });
    console.log("adding memories");
  } catch (err) {
    console.error("Error in memory.add:", err);
  }

  await ChatMessage.create([
    { userId, chatId, role: 'user', content: userContent, ...(userFileFields || {}) },
    { userId, chatId, role: 'assistant', content: assistantContent, ...(assistantFileFields || {}) },
  ]);
}

// Helper to retrieve all memories for a user (with optional filters)
export async function getAllMemories(userId: string) {
  
  
  try {
    const allMemories = await memory.getAll({ userId: userId });

    console.log("Memories", allMemories);
    return allMemories;
  } catch (error) {
    console.log("Error:", error);
    throw error;
  }
}

export default memory;