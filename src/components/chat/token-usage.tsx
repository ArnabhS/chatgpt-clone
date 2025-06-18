"use client";

import { useMemo } from "react";
import { getTokenUsage, MODEL_CONFIGS } from "@/lib/trimMessages";

interface TokenUsageProps {
  messages: Array<{ role: string; content: string }>;
  selectedModel: string;
}

export function TokenUsage({ messages, selectedModel }: TokenUsageProps) {
  const usage = useMemo(() => {
    if (messages.length === 0) return null;
    return getTokenUsage(messages, selectedModel);
  }, [messages, selectedModel]);

  if (!usage) return null;

  const modelConfig = MODEL_CONFIGS[selectedModel];
  const usagePercentage = (usage.inputTokens / modelConfig.maxTokens) * 100;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 px-4 py-2 border-t border-gray-700">
      <div className="flex items-center gap-1">
        <span>Tokens:</span>
        <span className="font-mono">{usage.inputTokens.toLocaleString()}</span>
        <span>/</span>
        <span className="font-mono">{modelConfig.maxTokens.toLocaleString()}</span>
      </div>
      
      <div className="flex-1 max-w-32">
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              usagePercentage > 80 ? 'bg-red-500' : 
              usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <span>Est. cost:</span>
        <span className="font-mono">${usage.costEstimate.toFixed(4)}</span>
      </div>
    </div>
  );
} 