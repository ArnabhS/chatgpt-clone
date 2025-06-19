export interface ModelConfig {
  name: string;
  maxTokens: number;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'gpt-4o': {
    name: 'GPT-4o',
    maxTokens: 128000,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    maxTokens: 128000,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    maxTokens: 128000,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  },
  'gpt-4': {
    name: 'GPT-4',
    maxTokens: 8192,
    contextWindow: 8192,
    maxOutputTokens: 4096,
    costPer1kInput: 0.03,
    costPer1kOutput: 0.06,
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    maxTokens: 16385,
    contextWindow: 16385,
    maxOutputTokens: 4096,
    costPer1kInput: 0.0015,
    costPer1kOutput: 0.002,
  },
};

export const DEFAULT_MODEL = 'gpt-4o';

export const getModelConfig = (modelName: string): ModelConfig => {
  return MODEL_CONFIGS[modelName] || MODEL_CONFIGS[DEFAULT_MODEL];
};

// Approximate token counting for browser compatibility
// This is a simplified approach - for production use a proper tokenizer
export const calculateTokens = (content: string): number => {
  if (!content) return 0;
  
  // Rough estimation: 1 token ≈ 4 characters for English text
  // This is a simplified approach - actual tokenization is more complex
  const charCount = content.length;
  const wordCount = content.split(/\s+/).length;
  
  // Use the higher of character-based or word-based estimation
  const charBasedTokens = Math.ceil(charCount / 4);
  const wordBasedTokens = Math.ceil(wordCount * 1.3); // Average 1.3 tokens per word
  
  return Math.max(charBasedTokens, wordBasedTokens);
};

// Calculate total tokens for multiple messages
export const calculateTotalTokens = (messages: { role: string; content: string }[]): number => {
  return messages.reduce((total, message) => {
    return total + calculateTokens(message.content);
  }, 0);
};

// Estimate response tokens (rough estimation)
export const estimateResponseTokens = (inputTokens: number, modelConfig: ModelConfig): number => {
  // Estimate response length based on input length (typically 1/3 to 1/2 of input)
  const estimatedRatio = 0.4;
  const estimatedTokens = Math.floor(inputTokens * estimatedRatio);
  
  // Ensure it doesn't exceed max output tokens
  return Math.min(estimatedTokens, modelConfig.maxOutputTokens);
};

// Trim messages to fit within model constraints
export const trimMessagesToTokenLimit = (
  messages: { role: string; content: string }[],
  modelName: string = DEFAULT_MODEL,
  preserveSystemMessages: boolean = true
): { role: string; content: string }[] => {
  const modelConfig = getModelConfig(modelName);
  
  // Reserve tokens for the response
  const reservedTokens = modelConfig.maxOutputTokens;
  const availableTokens = modelConfig.maxTokens - reservedTokens;
  
  let totalTokens = 0;
  const trimmedMessages: typeof messages = [];
  const systemMessages: typeof messages = [];
  const regularMessages: typeof messages = [];
  
  // Separate system messages from regular messages
  messages.forEach(msg => {
    if (msg.role === 'system') {
      systemMessages.push(msg);
    } else {
      regularMessages.push(msg);
    }
  });
  
  // Always include system messages if preserveSystemMessages is true
  if (preserveSystemMessages) {
    for (const msg of systemMessages) {
      const tokenCount = calculateTokens(msg.content);
      if (totalTokens + tokenCount <= availableTokens) {
        trimmedMessages.push(msg);
        totalTokens += tokenCount;
      }
    }
  }
  
  // Add regular messages from newest to oldest (reverse order)
  for (let i = regularMessages.length - 1; i >= 0; i--) {
    const msg = regularMessages[i];
    const tokenCount = calculateTokens(msg.content);
    
    if (totalTokens + tokenCount > availableTokens) {
      break;
    }
    
    trimmedMessages.unshift(msg);
    totalTokens += tokenCount;
  }
  
  return trimmedMessages;
};

// Get token usage statistics
export const getTokenUsage = (
  messages: { role: string; content: string }[],
  modelName: string = DEFAULT_MODEL
): {
  inputTokens: number;
  estimatedOutputTokens: number;
  totalTokens: number;
  modelConfig: ModelConfig;
  costEstimate: number;
} => {
  const modelConfig = getModelConfig(modelName);
  const inputTokens = calculateTotalTokens(messages);
  const estimatedOutputTokens = estimateResponseTokens(inputTokens, modelConfig);
  const totalTokens = inputTokens + estimatedOutputTokens;
  
  // Calculate cost estimate
  const inputCost = (inputTokens / 1000) * modelConfig.costPer1kInput;
  const outputCost = (estimatedOutputTokens / 1000) * modelConfig.costPer1kOutput;
  const costEstimate = inputCost + outputCost;
  
  return {
    inputTokens,
    estimatedOutputTokens,
    totalTokens,
    modelConfig,
    costEstimate,
  };
};

// Check if messages exceed model limits
export const checkTokenLimits = (
  messages: { role: string; content: string }[],
  modelName: string = DEFAULT_MODEL
): {
  isValid: boolean;
  inputTokens: number;
  maxTokens: number;
  needsTrimming: boolean;
  usage: ReturnType<typeof getTokenUsage>;
} => {
  const usage = getTokenUsage(messages, modelName);
  const modelConfig = getModelConfig(modelName);
  
  const isValid = usage.inputTokens <= modelConfig.maxTokens;
  const needsTrimming = usage.inputTokens > modelConfig.maxTokens;
  
  return {
    isValid,
    inputTokens: usage.inputTokens,
    maxTokens: modelConfig.maxTokens,
    needsTrimming,
    usage,
  };
}; 