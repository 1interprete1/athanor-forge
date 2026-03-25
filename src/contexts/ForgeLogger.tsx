import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import { ForgeLog } from '../types';

export interface ForgeLoggerContextType {
  logs: ForgeLog[];
  addLog: (category: ForgeLog['category'], severity: ForgeLog['severity'], message: string, metadata: any) => void;
  clearLogs: () => void;
  startGroup: (message: string) => string;
  endGroup: () => void;
  startSubGroup: (parentId: string, message: string) => string;
}

const ForgeLoggerContext = createContext<ForgeLoggerContextType | undefined>(undefined);

export function ForgeLoggerProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ForgeLog[]>(() => {
    const saved = localStorage.getItem('athanor_system_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length > 500) {
            return parsed.slice(0, 400); // Purge oldest 100 (assuming newest are at the beginning)
          }
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse logs", e);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('athanor_system_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = useCallback((category: ForgeLog['category'], severity: ForgeLog['severity'], message: string, metadata: any) => {
    const newLog: ForgeLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' }),
      category,
      severity,
      message,
      metadata,
    };
    setLogs(prev => {
      const newLogs = [newLog, ...prev];
      if (newLogs.length > 500) {
        return newLogs.slice(0, 400);
      }
      return newLogs;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const startGroup = useCallback((message: string) => {
    addLog('System', 'info', `Group Started: ${message}`, {});
    return 'group-id';
  }, [addLog]);

  const endGroup = useCallback(() => {
    addLog('System', 'info', 'Group Ended', {});
  }, [addLog]);

  const startSubGroup = useCallback((parentId: string, message: string) => {
    addLog('System', 'info', `SubGroup Started: ${message}`, { parentId });
    return 'subgroup-id';
  }, [addLog]);

  const value = useMemo(() => ({
    logs, addLog, clearLogs, startGroup, endGroup, startSubGroup
  }), [logs, addLog, clearLogs, startGroup, endGroup, startSubGroup]);

  return (
    <ForgeLoggerContext.Provider value={value}>
      {children}
    </ForgeLoggerContext.Provider>
  );
}

export function useForgeLogs() {
  const context = useContext(ForgeLoggerContext);
  if (!context) {
    throw new Error('useForgeLogs must be used within a ForgeLoggerProvider');
  }
  return context;
}
