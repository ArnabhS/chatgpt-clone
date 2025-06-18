import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Memory } from 'mem0ai/oss';
import { connectDB } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/models/chat';
const memory = new Memory();

export const maxDuration = 30;

export async function POST(req: Request) {

  await connectDB();

  const { messages, userId, chatId: existingChatId } = await req.json();
  
  // Generate a new chatId if this is a new conversation
  const chatId = existingChatId || uuidv4();
  
  // Get the latest user message content
  const latestUserMessage = messages[messages.length - 1];
  const searchQuery = latestUserMessage.content;
  
  console.log('Search query:', searchQuery);
  const searchResults = await memory.search(searchQuery, { userId: userId });
  console.log('Search results:', searchResults);
  
  const contextMessages = Array.isArray(searchResults) 
    ? searchResults.map(item => ({
        role: item.role as 'user' | 'assistant',
        content: item.content
      }))
    : [];
  
  console.log('Context messages:', contextMessages);
  const combinedMessages = [...contextMessages, ...messages];
  
  const result = streamText({
    model: openai('gpt-4.1'),
    messages: combinedMessages,
  });

  const stream = result.toDataStreamResponse();

  // Store messages in background without blocking the stream
  (async () => {
    try {
      // Use the textStream to collect the full response
      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }
      
      if (fullText) {
        await memory.add(latestUserMessage.content, { 
          userId: userId, 
          metadata: { role: 'user' } 
        });
        
        await memory.add(fullText, { 
          userId: userId, 
          metadata: { role: 'assistant' } 
        });
        
        await ChatMessage.create([
          {
            userId,
            chatId,
            role: 'user',
            content: latestUserMessage.content,
          },
          {
            userId,
            chatId,
            role: 'assistant',
            content: fullText,
          },
        ]);
      }
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  })();
  
  return stream;
}


