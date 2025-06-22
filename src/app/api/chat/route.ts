import { connectDB } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import {
  trimMessagesToTokenLimit,
  DEFAULT_MODEL
} from '@/lib/trimMessages';
import openaiClient from '@/lib/openai-client';
import { storeMessages, getAllMemories } from '@/lib/chat-memory';
import { saveTempFile, deleteTempFile } from '@/lib/file-utils';


export const maxDuration = 30;

export async function POST(req: Request) {
  await connectDB();

  let message: string | undefined;
  let file: File | undefined;
  let userId: string;
  let existingChatId: string | undefined;
  let modelName: string = DEFAULT_MODEL;
  let formData: FormData | undefined;
  let body: unknown;
  let tempFilePath: string | undefined;
  let fullText = '';

  const contentType = req.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    console.log("receiving text")
    body = await req.json();
    console.log(body)
    const jsonBody = body as Record<string, unknown>;
    const messagesArr = jsonBody.messages as Array<{ role: string; content: string }>;
    let lastUserMessage = '';
    if (Array.isArray(messagesArr) && messagesArr.length > 0) {
      const lastMsg = messagesArr[messagesArr.length - 1];
      lastUserMessage = lastMsg.content;
    }
    console.log(jsonBody)
    message = lastUserMessage;
    userId = (jsonBody.userId as string) || 'guest';
    existingChatId = jsonBody.chatId as string;
    modelName = (jsonBody.modelName as string) || DEFAULT_MODEL;
  } else if (contentType.includes('multipart/form-data')) {
    
    formData = await req.formData();
    
    message = (formData.get('message') as string) || '';
    file = formData.get('files') as File;
    userId = (formData.get('userId') as string) || 'guest';
    existingChatId = formData.get('chatId') as string;
    modelName = (formData.get('modelName') as string) || DEFAULT_MODEL;
  } else {
    return new Response(JSON.stringify({ error: 'Unsupported Content-Type' }), { status: 400 });
  }

  const chatId = existingChatId || uuidv4();

  const userMessage = {
    role: 'user' as const,
    content: message || ''
  };
  
  const searchResults = await getAllMemories(userId);

  type MemoryResult = { memory: string };
  const contextMessages = Array.isArray(searchResults?.results)
    ? searchResults.results.map((mem: MemoryResult) => ({
        role: 'system' as const,
        content: `Memory: ${mem.memory}`
      }))
    : [];

  // Debug: Log what memory search returns
  console.log('Memory contextMessages:', contextMessages);

  // Always include the last 5 messages from this chat (if available)
  let lastMessages: { role: string; content: string }[] = [];
  if (existingChatId && userId) {
    type RecentMsg = { role: string; content: string };
    const recent = await import('@/models/chat').then(({ ChatMessage }) =>
      ChatMessage.find({ chatId: existingChatId, userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    );
    lastMessages = (recent as unknown as RecentMsg[]).reverse().map((msg) => ({ role: msg.role, content: msg.content }));
  }

  // Compose the prompt for the LLM
  const promptMessages = trimMessagesToTokenLimit([
    ...lastMessages,
    ...contextMessages,
    userMessage
  ], modelName);

  if (file && typeof file !== 'string') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (file.type.startsWith('image/')) {
        // Image handling (OpenAI vision)
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
                    url: `data:${file.type};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          stream: true,
        });
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
              // Store memory after streaming is done
              if (fullText) {
                await storeMessages(
                  userId,
                  chatId,
                  userMessage.content,
                  fullText,
                  {
                    imageData: formData?.get('imageData') as string || undefined,
                    imageName: formData?.get('imageName') as string || file.name || undefined,
                  },
                  undefined
                );
              }
            } catch (error) {
              controller.error(error);
            }
          }
        });
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
          },
        });
      } else if (file.type === 'application/pdf') {
        // PDF handling (stream like images)
        try {
          console.log('Extracting PDF text...');
          // Save with .pdf extension and original filename if possible
          const originalName = file.name || 'document.pdf';
          const extension = originalName.toLowerCase().endsWith('.pdf') ? '' : '.pdf';
          tempFilePath = await saveTempFile(buffer, extension);
          console.log('Temporary PDF file saved at:', tempFilePath);
          
          const { extractTextFromPDF } = await import('@/lib/pdf-extractor');
          const extractedText = await extractTextFromPDF(tempFilePath);
          console.log("Extracted text raw:", extractedText);
          userMessage.content += `\n\n[PDF Content]:\n${extractedText}`;
          console.log(userMessage)
          // Stream OpenAI text response in custom format
          const safeMessages = trimMessagesToTokenLimit([...contextMessages, userMessage], modelName).map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
          }));
          const textResponse = await openaiClient.chat.completions.create({
            model: modelName,
            messages: safeMessages,
            max_tokens: 1000,
            stream: true,
          });
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of textResponse) {
                  const content = chunk.choices[0]?.delta?.content;
                  if (content) {
                    fullText += content;
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: content })}\n\n`));
                  }
                }
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
                // Store memory after streaming is done
                if (fullText) {
                  await storeMessages(
                    userId,
                    chatId,
                    userMessage.content,
                    fullText,
                    {
                      imageData: formData?.get('imageData') as string || undefined,
                      imageName: formData?.get('imageName') as string || file.name || undefined,
                    },
                    undefined
                  );
                }
              } catch (error) {
                controller.error(error);
              }
            }
          });
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Transfer-Encoding': 'chunked',
            },
          });
        } catch (err) {
          console.error('PDF extraction error:', err);
          return new Response(JSON.stringify({ error: 'Failed to extract text from PDF.' }), { status: 500 });
        } finally {
          // Clean up the temporary file
          if (tempFilePath) {
            await deleteTempFile(tempFilePath);
          }
        }
      } 
    } catch (err) {
      console.error('File processing error:', err);
      return new Response(JSON.stringify({ error: 'Failed to process file.' }), { status: 500 });
    }
  }

  // Unified streaming for all message types
  const openaiResponse = await openaiClient.chat.completions.create({
    model: modelName,
    messages: promptMessages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    max_tokens: 1000,
    stream: true,
  });
  console.log("open ai res:",openaiResponse)
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of openaiResponse) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullText += content;
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: content })}\n\n`));
          }
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
        console.log('fullText after streaming:', fullText);
        // Store memory after streaming is done
        if (fullText) {
          await storeMessages(
            userId,
            chatId,
            userMessage.content,
            fullText,
            {
              imageData: formData?.get('imageData') as string || undefined,
              imageName: formData?.get('imageName') as string || file?.name || undefined,
            },
            undefined
          );
        }
      } catch (error) {
        controller.error(error);
      }
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}


