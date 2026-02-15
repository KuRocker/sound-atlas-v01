import { useCallback } from 'react';
import { useAppState, useAppDispatch } from '../store/AppContext';
import type { EventLogEntry } from '../types';

export function useEventLog() {
  const { eventLog } = useAppState();
  const dispatch = useAppDispatch();

  const log = useCallback((message: string, type: EventLogEntry['type'] = 'info') => {
    dispatch({ type: 'ADD_EVENT', payload: {
      timestamp: new Date().toISOString(),
      message,
      type,
    }});
  }, [dispatch]);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR_EVENTS' });
  }, [dispatch]);

  const exportLog = useCallback(() => {
    const text = eventLog.map(e =>
      `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.type.toUpperCase()}] ${e.message}`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soundatlas-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [eventLog]);

  return { eventLog, log, clear, exportLog };
}
