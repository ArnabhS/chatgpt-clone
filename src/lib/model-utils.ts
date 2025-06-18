import { MODEL_CONFIGS, checkTokenLimits } from './trimMessages';

export interface ModelInfo {
  id: string;
  name: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  description: string;
}

export const getAvailableModels = (): ModelInfo[] => {
  return Object.entries(MODEL_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    maxTokens: config.maxTokens,
    costPer1kInput: config.costPer1kInput,
    costPer1kOutput: config.costPer1kOutput,
    description: getModelDescription(id),
  }));
};

export const getModelDescription = (modelId: string): string => {
  const descriptions: Record<string, string> = {
    'gpt-4o': 'Most capable model, best for complex reasoning and analysis',
    'gpt-4o-mini': 'Fast and efficient, great for most tasks',
    'gpt-4-turbo': 'Balanced performance and cost for general use',
    'gpt-4': 'High-quality responses with 8K context',
    'gpt-3.5-turbo': 'Fast and cost-effective for simple tasks',
  };
  
  return descriptions[modelId] || 'AI model for conversation';
};

export const validateModelSwitch = (
  currentMessages: Array<{ role: string; content: string }>,
  newModelId: string
): {
  canSwitch: boolean;
  reason?: string;
  tokenCheck: ReturnType<typeof checkTokenLimits>;
} => {
  const tokenCheck = checkTokenLimits(currentMessages, newModelId);
  
  if (tokenCheck.isValid) {
    return {
      canSwitch: true,
      tokenCheck,
    };
  }
  
  return {
    canSwitch: false,
    reason: `Messages exceed ${MODEL_CONFIGS[newModelId]?.name} token limit (${tokenCheck.inputTokens.toLocaleString()}/${tokenCheck.maxTokens.toLocaleString()} tokens)`,
    tokenCheck,
  };
};

export const getRecommendedModel = (
  messages: Array<{ role: string; content: string }>
): string => {
  // Find the most cost-effective model that can handle the messages
  const availableModels = getAvailableModels();
  
  for (const model of availableModels) {
    const validation = validateModelSwitch(messages, model.id);
    if (validation.canSwitch) {
      return model.id;
    }
  }
  
  // If no model can handle the messages, return the one with the highest token limit
  return availableModels.reduce((best, current) => 
    current.maxTokens > best.maxTokens ? current : best
  ).id;
};

export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};

export const formatCost = (cost: number): string => {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(2)}/1K tokens`;
  }
  return `$${cost.toFixed(4)}`;
}; 