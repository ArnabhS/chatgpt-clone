import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Memory } from 'mem0ai/oss';

const memory = new Memory();

export const maxDuration = 30;

interface StreamResult {
  textPromise: Promise<string>;
  toDataStreamResponse: () => Response;
}

export async function POST(req: Request) {
  const { messages, userId } = await req.json();
  
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
  }) as unknown as StreamResult;


  const stream = result.toDataStreamResponse();
  

  try {
    const text = await result.textPromise;
    if (text) {
      
      await memory.add(latestUserMessage.content, { 
        userId: userId, 
        metadata: { role: 'user' } 
      });
      
      await memory.add(text, { 
        userId: userId, 
        metadata: { role: 'assistant' } 
      });
    }
  } catch (error) {
    console.error('Error storing conversation:', error);
  }
  
  return stream;
}