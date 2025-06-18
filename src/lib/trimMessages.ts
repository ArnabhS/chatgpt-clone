import { encode } from "gpt-3-encoder";

export const trimMessagesToTokenLimit = (
  messages: { role: string; content: string }[],
  maxTokens = 128000
) => {
  let totalTokens = 0;
  const trimmedMessages: typeof messages = [];

  
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const tokenCount = encode(msg.content).length;

    if (totalTokens + tokenCount > maxTokens) break;

    trimmedMessages.unshift(msg);
    totalTokens += tokenCount;
  }

  return trimmedMessages;
};
