import { Message } from '../types';

export interface Turn {
  user: Message | null;
  assistant: Message | null;
}

export function groupMessagesIntoTurns(messages: Message[]): Turn[] {
  const visibleMessages = messages.filter(m => m.role !== 'system');
  const turns: Turn[] = [];
  let currentTurn: Turn | null = null;
  
  visibleMessages.forEach((msg) => {
    if (msg.role === 'user') {
      if (currentTurn) turns.push(currentTurn);
      currentTurn = { user: msg, assistant: null };
    } else if (msg.role === 'assistant') {
      if (!currentTurn) {
        currentTurn = { user: null, assistant: msg };
      } else {
        currentTurn.assistant = msg;
        turns.push(currentTurn);
        currentTurn = null;
      }
    }
  });
  
  if (currentTurn) turns.push(currentTurn);
  return turns;
}
