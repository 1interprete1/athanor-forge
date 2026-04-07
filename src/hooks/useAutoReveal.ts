import { useEffect } from 'react';
import { useForgeLogs } from '../contexts/ForgeLogger';

export function useAutoReveal(isOpen: boolean, setIsOpen: (v: boolean) => void) {
  const { logs } = useForgeLogs();
  useEffect(() => {
    const lastLog = logs[logs.length - 1];
    if (lastLog?.severity === 'error' && !isOpen) {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [logs, isOpen, setIsOpen]);
}
