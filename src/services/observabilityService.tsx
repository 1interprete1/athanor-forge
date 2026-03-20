/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, createContext, useContext, ReactNode, useRef, useMemo } from 'react';
import { LogEvent, LogLevel } from '../types';

export interface ObservabilityContextType {
  logs: LogEvent[];
  startGroup: (name: string) => string;
  addLog: (message: string, data?: unknown, level?: LogLevel, parentId?: string) => string;
  startSubGroup: (parentId: string, name: string) => string;
  endGroup: () => void;
  clearLogs: () => void;
}

const ObservabilityContext = createContext<ObservabilityContextType | undefined>(undefined);

export function ObservabilityProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const activeGroupsRef = useRef<string[]>([]);

  const addLog = useCallback((message: string, data?: unknown, level: LogLevel = 'info', parentId?: string) => {
    const id = crypto.randomUUID();
    const activeGroups = activeGroupsRef.current;
    const currentParent = parentId || (activeGroups.length > 0 ? activeGroups[activeGroups.length - 1] : undefined);
    const depth = activeGroups.length;

    const newLog: LogEvent = {
      id,
      timestamp: Date.now(),
      message,
      level,
      parentId: currentParent,
      depth: currentParent ? depth : 0,
      raw: data
    };

    setLogs(prev => [...prev, newLog]);
    return id;
  }, []);

  const startGroup = useCallback((name: string) => {
    const id = addLog(name, null, 'info');
    activeGroupsRef.current = [...activeGroupsRef.current, id];
    return id;
  }, [addLog]);

  const startSubGroup = useCallback((parentId: string, name: string) => {
    // We don't strictly need parentId if we use the stack, but keeping it for manual control
    const id = addLog(name, null, 'info', parentId);
    activeGroupsRef.current = [...activeGroupsRef.current, id];
    return id;
  }, [addLog]);

  const endGroup = useCallback(() => {
    activeGroupsRef.current = activeGroupsRef.current.slice(0, -1);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    activeGroupsRef.current = [];
  }, []);

  const value = useMemo(() => ({ logs, startGroup, addLog, startSubGroup, endGroup, clearLogs }), [logs, startGroup, addLog, startSubGroup, endGroup, clearLogs]);

  return (
    <ObservabilityContext.Provider value={value}>
      {children}
    </ObservabilityContext.Provider>
  );
}

export function useObservability() {
  const context = useContext(ObservabilityContext);
  if (!context) {
    throw new Error('useObservability must be used within an ObservabilityProvider');
  }
  return context;
}
