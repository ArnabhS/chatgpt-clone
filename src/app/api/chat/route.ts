import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { connectDB } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import {
  trimMessagesToTokenLimit,
  DEFAULT_MODEL
} from '@/lib/trimMessages';
import openaiClient from '@/lib/openai-client';
import memory, { storeMessages } from '@/lib/chat-memory';
import { saveTempFile, deleteTempFile } from '@/lib/file-utils';

export const maxDuration = 30;

export async function POST(req: Request) {
  await connectDB();

  let message: string | undefined;
  let file: File | undefined;
  let userId: string = 'guest';
  let existingChatId: string | undefined;
  let modelName: string = DEFAULT_MODEL;
  let formData: FormData | undefined;
  let body: unknown;
  let tempFilePath: string | undefined;

  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    console.log("receiving text")
    body = await req.json();
    const jsonBody = body as Record<string, unknown>;
    const messagesArr = jsonBody.messages as Array<{ role: string; content: string }>;
    let lastUserMessage = '';
    if (Array.isArray(messagesArr) && messagesArr.length > 0) {
      const lastMsg = messagesArr[messagesArr.length - 1];
      lastUserMessage = lastMsg.content;
    }
    message = lastUserMessage;
    userId = (jsonBody.userId as string) || 'guest';
    existingChatId = jsonBody.chatId as string;
    modelName = (jsonBody.modelName as string) || DEFAULT_MODEL;
  } else if (contentType.includes('multipart/form-data')) {
    console.log('file received')
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
  const searchQuery = userMessage.content;
  const searchResults = await memory.search(searchQuery, { userId: userId });
  const contextMessages = Array.isArray(searchResults)
    ? searchResults.map((item: { role: string; content: string }) => ({
        role: item.role as 'user' | 'assistant',
        content: item.content
      }))
    : [];

  let fullText = '';

  if (file && typeof file === 'string') {
    console.error('File is a string, not a File object:', file);
    return new Response(JSON.stringify({ error: 'Invalid file format' }), { status: 400 });
  }

  if (file) {
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
        (async () => {
          try {
            if (fullText) {
              await storeMessages(userId, chatId, userMessage.content, fullText);
            }
          } catch (error) {
            console.error('Error storing conversation:', error);
          }
        })();
        return response;
      } else if (file.type === 'application/pdf') {
        // PDF handling
        try {
          console.log('Extracting PDF text...');
          // Save with .pdf extension and original filename if possible
          const originalName = file.name || 'document.pdf';
          const extension = originalName.toLowerCase().endsWith('.pdf') ? '' : '.pdf';
          tempFilePath = await saveTempFile(buffer, extension);
          console.log('Temporary PDF file saved at:', tempFilePath);
          
          const { extractTextFromPDF } = await import('@/lib/pdf-extractor');
          const extractedText = await extractTextFromPDF(tempFilePath);
          userMessage.content += `\n\n[PDF Content]:\n${extractedText}`;
        } catch (err) {
          console.error('PDF extraction error:', err);
          return new Response(JSON.stringify({ error: 'Failed to extract text from PDF.' }), { status: 500 });
        } finally {
          // Clean up the temporary file
          if (tempFilePath) {
            await deleteTempFile(tempFilePath);
          }
        }
      } else if (
        file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // DOC/DOCX handling
        try {
          console.log('Extracting DOC/DOCX text...');
          // Save the buffer to a temporary file with appropriate extension
          const extension = file.type === 'application/msword' ? '.doc' : '.docx';
          tempFilePath = await saveTempFile(buffer, extension);
          console.log('Temporary document file saved at:', tempFilePath);
          
          const { extractTextFromDoc } = await import('@/lib/doc-extractor');
          const extractedText = await extractTextFromDoc(tempFilePath);
          userMessage.content += `\n\n[Document Content]:\n${extractedText}`;
        } catch (err) {
          console.error('DOC/DOCX extraction error:', err);
          return new Response(JSON.stringify({ error: 'Failed to extract text from document.' }), { status: 500 });
        } finally {
          // Clean up the temporary file
          if (tempFilePath) {
            await deleteTempFile(tempFilePath);
          }
        }
      } else {
        return new Response(JSON.stringify({ error: 'Unsupported file type' }), { status: 400 });
      }
    } catch (err) {
      console.error('File processing error:', err);
      return new Response(JSON.stringify({ error: 'Failed to process file.' }), { status: 500 });
    }
  }

  // For text, PDF, DOC, DOCX (after extraction), use text streaming
  console.log('Processing message:', userMessage);
  const result = streamText({
    model: openai(modelName),
    messages: trimMessagesToTokenLimit([...contextMessages, userMessage], modelName) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  });
  console.log(result)
  const stream = result.toDataStreamResponse();
  (async () => {
    try {
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }
      console.log('Full text from OpenAI:', fullText);
      if (fullText) {
        await storeMessages(userId, chatId, userMessage.content, fullText);
      }
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  })();
  return stream;
}


