import { ExportConfig, Message, DevMode } from '../types';

export function buildExportPayload(msg: Message, config: ExportConfig, devMode: DevMode) {
  if (devMode === 'simple') {
    return { content: msg.content };
  }

  const payload: any = {
    content: msg.content,
  };

  if (config.includeTimestamp) {
    payload.timestamp = new Date(parseInt(msg.id)).toISOString();
  }
  
  if (config.includeRole) {
    payload.role = msg.role;
  }

  if (msg.role === 'assistant') {
    if (config.includeModel && msg.model) {
      payload.model = msg.model;
    }
    if (config.includeTokens && msg.tokens) {
      payload.tokens = msg.tokens;
    }
    if (config.includeCost && msg.cost !== undefined) {
      payload.cost = msg.cost;
    }
    if (config.includeRaw && msg.rawResponse) {
      payload.rawResponse = msg.rawResponse;
    }
  }

  return payload;
}

export function formatPayloadForCopy(payload: any): string {
  let text = '';
  
  if (payload.timestamp) {
    const date = new Date(payload.timestamp);
    const timeString = date.toLocaleTimeString([], { hour12: false });
    text += `[${timeString}]\n`;
  }

  if (payload.role) {
    text += `${payload.role.toUpperCase()}: `;
  }

  text += payload.content;

  const footerParts = [];
  if (payload.model) footerParts.push(`Model: ${payload.model}`);
  if (payload.tokens) footerParts.push(`Tokens: ${payload.tokens}`);
  if (payload.cost !== undefined) footerParts.push(`Cost: $${payload.cost.toFixed(6)}`);

  if (footerParts.length > 0) {
    text += '\n\n--- Metadata ---\n' + footerParts.join(' | ');
  }

  if (payload.rawResponse) {
    text += '\n\n--- Raw Response ---\n' + JSON.stringify(payload.rawResponse, null, 2);
  }

  return text;
}

export function formatSessionForExport(session: any, config: ExportConfig, devMode: DevMode): string {
  const turns = [];
  let currentTurn: any = null;

  for (const msg of session.messages) {
    if (msg.role === 'user') {
      if (currentTurn) turns.push(currentTurn);
      currentTurn = {
        id: msg.id,
        timestamp: new Date(parseInt(msg.id)).toISOString(),
        user: buildExportPayload(msg, config, devMode),
        assistant: null
      };
    } else if (msg.role === 'assistant') {
      if (currentTurn) {
        currentTurn.assistant = buildExportPayload(msg, config, devMode);
        turns.push(currentTurn);
        currentTurn = null;
      } else {
        turns.push({
          id: msg.id,
          timestamp: new Date(parseInt(msg.id)).toISOString(),
          user: null,
          assistant: buildExportPayload(msg, config, devMode)
        });
      }
    }
  }
  if (currentTurn) turns.push(currentTurn);

  return JSON.stringify({
    sessionId: session.id,
    createdAt: session.date,
    turns: turns
  }, null, 2);
}
