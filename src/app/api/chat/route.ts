import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Memory } from 'mem0ai/oss';
import { connectDB } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/models/chat';
import { 
  trimMessagesToTokenLimit, 
  getTokenUsage, 
  checkTokenLimits, 
  DEFAULT_MODEL 
} from '@/lib/trimMessages';
import OpenAI from 'openai';

const memory = new Memory();
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  await connectDB();

  const formData = await req.formData();
  const message = formData.get('message') as string;
  const imageFile = formData.get('image') as File;
  
  // Get other data from formData or use defaults
  const userId = formData.get('userId') as string || 'guest';
  const existingChatId = formData.get('chatId') as string;
  const modelName = (formData.get('modelName') as string) || DEFAULT_MODEL;
  
  // Generate a new chatId if this is a new conversation
  const chatId = existingChatId || uuidv4();
  
  // Create the user message
  const userMessage = {
    role: 'user' as const,
    content: message || ''
  };
  
  const searchQuery = userMessage.content;
  
  const searchResults = await memory.search(searchQuery, { userId: userId });
  
  const contextMessages = Array.isArray(searchResults) 
    ? searchResults.map(item => ({
        role: item.role as 'user' | 'assistant',
        content: item.content
      }))
    : [];
  
  const combinedMessages = [...contextMessages, userMessage];
  
  let result;
  let fullText = '';
  
  if (imageFile) {
    // Handle image messages with OpenAI vision API directly
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    
    const visionResponse = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: message || 'Please analyze this image.' },
            {
              type: 'image_url' as const,
              image_url: { 
                url: `data:${imageFile.type};base64,${base64Image}` 
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      stream: true,
    });

    // Convert OpenAI stream to AI SDK format
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of visionResponse) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullText += content;
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: content })}\n\n`));
            }
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

    // Store messages in background
    (async () => {
      try {
        if (fullText) {
          await memory.add(userMessage.content, { 
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
              content: userMessage.content,
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

    return response;
  } else {
    // Handle regular text messages with AI SDK
    const tokenCheck = checkTokenLimits(combinedMessages, modelName);
    console.log('Token usage:', {
      model: modelName,
      inputTokens: tokenCheck.inputTokens,
      maxTokens: tokenCheck.maxTokens,
      needsTrimming: tokenCheck.needsTrimming,
      costEstimate: tokenCheck.usage.costEstimate
    });
    
    // Trim messages if they exceed the model's token limit
    const trimmedMessages = trimMessagesToTokenLimit(combinedMessages, modelName);
    
    if (tokenCheck.needsTrimming) {
      console.log(`Messages trimmed from ${tokenCheck.inputTokens} to ${getTokenUsage(trimmedMessages, modelName).inputTokens} tokens`);
    }
    
    result = streamText({
      model: openai(modelName),
      messages: trimmedMessages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    });

    const stream = result.toDataStreamResponse();

    // Store messages in background without blocking the stream
    (async () => {
      try {
        // Use the textStream to collect the full response
        for await (const chunk of result.textStream) {
          fullText += chunk;
        }
        
        if (fullText) {
          await memory.add(userMessage.content, { 
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
              content: userMessage.content,
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
}


