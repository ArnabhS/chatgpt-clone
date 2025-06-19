import { Memory } from 'mem0ai/oss';
import { ChatMessage } from '@/models/chat';

const memory = new Memory({
  historyStore: {
    provider: 'supabase',
    config: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      tableName: 'memory_history',
    },
  },
});

export async function storeMessages(userId: string, chatId: string, userContent: string, assistantContent: string) {
  await memory.add(userContent, { userId, metadata: { role: 'user' } });
  await memory.add(assistantContent, { userId, metadata: { role: 'assistant' } });
  await ChatMessage.create([
    { userId, chatId, role: 'user', content: userContent },
    { userId, chatId, role: 'assistant', content: assistantContent },
  ]);
}

export default memory; 