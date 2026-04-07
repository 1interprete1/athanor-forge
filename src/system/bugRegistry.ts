export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BugStatus = 'identified' | 'in-progress' | 'resolved';
export type BugCategory = 'inference-pipeline' | 'ui-ux' | 'state-management' | 'network' | 'security' | 'rendering / html-structure' | 'markdown-rendering';

export interface SystemBug {
  id: string;
  title: string;
  status: BugStatus;
  severity: BugSeverity;
  category: BugCategory;
  description: string;
  rootCause: string;
  trigger: string;
  location: string;
  impact: string;
  type: string;
  dateFound: string;
  dateResolved?: string;
}

export const BUG_REGISTRY: SystemBug[] = [
  {
    id: "AF-227",
    title: "LPU Empty Messages Payload",
    status: "identified",
    severity: "critical",
    category: "inference-pipeline",
    description: "Validation error triggered when starting a new session without a system prompt. The API receives an empty messages array.",
    rootCause: "Race condition in React state updates. generateResponse is invoked before the messages useMemo propagates the first user message.",
    trigger: "Sending the first message in a new session without a system prompt.",
    location: "src/hooks/useChat.ts -> sendMessageStream",
    impact: "API rejects the request with 'messages : minimum number of items is 1', preventing conversation initiation.",
    type: "race-condition",
    dateFound: "2026-03-26T09:50:00Z"
  },
  {
    id: "AF-BUG-229",
    title: "Invalid HTML Nesting (pre inside p)",
    status: "resolved",
    severity: "critical",
    category: "rendering / html-structure",
    description: "El renderer genera elementos <pre> dentro de <p>, violando las reglas del DOM.",
    rootCause: "Configuración incorrecta en ReactMarkdown components override para <p>.",
    trigger: "Renderizado de bloques de código dentro de mensajes Markdown",
    location: "ChatMessage.tsx → Markdown renderer",
    impact: "Hydration errors en React + posible ruptura de UI",
    type: "html-nesting",
    dateFound: new Date().toISOString(),
    dateResolved: new Date().toISOString()
  },
  {
    id: "AF-BUG-230",
    title: "Markdown Block/Inline Conflict",
    status: "resolved",
    severity: "high",
    category: "markdown-rendering",
    description: "Conflicto entre elementos inline (<p>) y block (<pre>) generado por el parser.",
    rootCause: "Uso de className=\"inline\" en <p> mientras se renderizan bloques de código.",
    trigger: "Renderizado de bloques de código dentro de mensajes Markdown",
    location: "Markdown components config",
    impact: "Estructura DOM inválida + warnings + posible inconsistencia visual",
    type: "css-conflict",
    dateFound: new Date().toISOString(),
    dateResolved: new Date().toISOString()
  }
];

export const reportBugDetection = (bugId: string, details?: string) => {
  console.warn(`[BUG DETECTED] ${bugId} - See /src/system/bugRegistry.ts for details.`, details || '');
};
