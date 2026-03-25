import { useMemo } from 'react';
import { useChat } from './useChat';
import { useStore } from '../contexts/StoreContext';

export function useContextTracker() {
  const { messages } = useChat();
  const { config } = useStore();

  return useMemo(() => {
    const systemPromptChars = config.systemPrompt?.length || 0;
    const messagesChars = messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0);
    
    // Estimate tokens: 1 token ~= 4 chars
    const totalTokens = Math.ceil((systemPromptChars + messagesChars) / 4);
    
    // Estimate cost: based on total tokens and some rate (e.g., $0.000001 per token)
    // The user didn't specify the rate, I'll use a placeholder.
    const totalCost = totalTokens * 0.000001;
    
    return { totalTokens, totalCost };
  }, [messages, config.systemPrompt]);
}
