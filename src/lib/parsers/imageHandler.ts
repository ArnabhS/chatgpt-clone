
import OpenAI from 'openai';

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function handleImageWithVision({
  uploadedFile,
  buffer,
  message,
  userMessage,
  userId,
  chatId,
  memory
}: {
  uploadedFile: File;
  buffer: Buffer;
  message: string;
  userMessage: { role: 'user'; content: string };
  userId: string;
  chatId: string;
  memory: {
    add: (content: string, options: { userId: string; metadata: { role: string } }) => Promise<void>;
  };
}) {
  let fullText = '';
  const base64 = buffer.toString('base64');

  const visionResponse = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: message || 'Analyze this image' },
          {
            type: 'image_url',
            image_url: { url: `data:${uploadedFile.type};base64,${base64}` }
          }
        ]
      }
    ],
    stream: true,
    max_tokens: 1000
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

        await memory.add(userMessage.content, { userId, metadata: { role: 'user' } });
        await memory.add(fullText, { userId, metadata: { role: 'assistant' } });

        await import('@/models/chat').then(({ ChatMessage }) =>
          ChatMessage.create([
            { userId, chatId, role: 'user', content: userMessage.content },
            { userId, chatId, role: 'assistant', content: fullText }
          ])
        );
      } catch (e) {
        controller.error(e);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    }
  });
}
