export type RuntimeEventType = 'runtime-error' | 'auto-fix' | 'warning' | 'info';

export interface RuntimeEvent {
  id: string;
  timestamp: number;
  type: RuntimeEventType;
  message: string;
  source: string;
  context?: any;
  associatedBugId?: string;
}

export const runtimeEvents: RuntimeEvent[] = [];

type Listener = (events: RuntimeEvent[]) => void;
const listeners: Set<Listener> = new Set();

export function subscribeToRuntimeEvents(listener: Listener) {
  listeners.add(listener);
  // Send initial state
  listener([...runtimeEvents]);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const eventsCopy = [...runtimeEvents];
  listeners.forEach(listener => listener(eventsCopy));
}

export function logRuntimeEvent(event: Omit<RuntimeEvent, 'id' | 'timestamp'>) {
  const newEvent: RuntimeEvent = {
    ...event,
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
    timestamp: Date.now(),
  };
  
  runtimeEvents.push(newEvent);
  
  // Keep only the last 1000 events to prevent memory leaks
  if (runtimeEvents.length > 1000) {
    runtimeEvents.shift();
  }
  
  // Semi-automatic bug promotion
  if (newEvent.type === 'runtime-error') {
    const similarErrors = runtimeEvents.filter(e => e.type === 'runtime-error' && e.message === newEvent.message);
    if (similarErrors.length >= 3) {
      console.warn(`[BUG PROMOTION SUGGESTION] Error "${newEvent.message}" has occurred ${similarErrors.length} times. Consider adding it to bugRegistry.ts.`);
      
      // Optionally log a warning event to the registry itself
      if (similarErrors.length === 3) { // Only log the warning once
        runtimeEvents.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          timestamp: Date.now(),
          type: 'warning',
          message: `Frequent Error Detected: "${newEvent.message}". Suggestion: Promote to hardcoded bug in bugRegistry.ts.`,
          source: 'system.bug-promoter',
          context: { errorCount: similarErrors.length }
        });
      }
    }
  }

  notifyListeners();
  return newEvent;
}

export function getLastRuntimeEvent(): RuntimeEvent | undefined {
  return runtimeEvents.length > 0 ? runtimeEvents[runtimeEvents.length - 1] : undefined;
}

export function registerAutoFix(fixDescription: string, associatedBugId?: string) {
  const lastEvent = getLastRuntimeEvent();
  
  if (lastEvent && lastEvent.type === 'runtime-error') {
    // Update the last event to associate it with the bug if provided
    if (associatedBugId) {
      lastEvent.associatedBugId = associatedBugId;
    }
  }

  return logRuntimeEvent({
    type: 'auto-fix',
    message: fixDescription,
    source: 'system.auto-fix',
    associatedBugId,
    context: {
      triggeredByEvent: lastEvent?.id,
      previousError: lastEvent?.message
    }
  });
}
