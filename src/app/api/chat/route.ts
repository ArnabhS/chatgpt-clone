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


  let message: string | undefined;
  let imageFile: File | undefined;
  let userId: string = 'guest';
  let existingChatId: string | undefined;
  let modelName: string = DEFAULT_MODEL;
  let formData: FormData | undefined;
  let body: unknown;


  const contentType = req.headers.get('content-type') || '';


  if (contentType.includes('application/json')) {
    body = await req.json();
    const jsonBody = body as Record<string, unknown>;
    // Vercel SDK sends an array of messages
    const messagesArr = jsonBody.messages as Array<{ role: string; content: string }>;
    let lastUserMessage = '';
    if (Array.isArray(messagesArr) && messagesArr.length > 0) {
      // Find the last user message (or just the last message)
      const lastMsg = messagesArr[messagesArr.length - 1];
      lastUserMessage = lastMsg.content;
    }
    message = lastUserMessage;
    userId = (jsonBody.userId as string) || 'guest';
    existingChatId = jsonBody.chatId as string;
    modelName = (jsonBody.modelName as string) || DEFAULT_MODEL;
    // No image in JSON
  } else if (contentType.includes('multipart/form-data')) {
    console.log("reaching here")
    formData = await req.formData();
    console.log("form data:", formData)
    message = (formData.get('message') as string) || '';
    imageFile = formData.get('files') as File;
    userId = (formData.get('userId') as string) || 'guest';
    existingChatId = formData.get('chatId') as string;
    modelName = (formData.get('modelName') as string) || DEFAULT_MODEL;
  } else {
    return new Response(JSON.stringify({ error: 'Unsupported Content-Type' }), { status: 400 });
  }


  // Generate a new chatId if this is a new conversation
  const chatId = existingChatId || uuidv4();
 
  // Create the user message
  const userMessage = {
    role: 'user' as const,
    content: message || ''
  };
  console.log(userMessage)
  const searchQuery = userMessage.content;
 
  const searchResults = await memory.search(searchQuery, { userId: userId });
 
  // Ensure searchResults is always an array
  const contextMessages = Array.isArray(searchResults)
    ? searchResults.map((item: { role: string; content: string }) => ({
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

    console.log("IMAGE RES:", response)
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
