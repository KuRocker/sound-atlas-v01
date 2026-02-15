import React from 'react';
import { useEventLog } from '../../hooks/useEventLog';

export function EventLog() {
  const { eventLog, clear, exportLog } = useEventLog();

  const typeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-amber-400';
      case 'error': return 'text-red-400';
      case 'anomaly': return 'text-red-500 font-bold';
      default: return 'text-[#999]';
    }
  };

  const typeBg = (type: string) => {
    switch (type) {
      case 'anomaly': return 'bg-red-900/20 border-l-2 border-red-500';
      case 'error': return 'bg-red-900/10';
      case 'warning': return 'bg-amber-900/10';
      case 'success': return 'bg-green-900/10';
      default: return '';
    }
  };

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e0e0e0]">Event Log</h2>
        <div className="flex gap-2">
          <button onClick={exportLog} className="px-2 py-1 bg-[#333] hover:bg-[#444] text-[#999] rounded text-xs transition-colors">
            Export
          </button>
          <button onClick={clear} className="px-2 py-1 bg-[#333] hover:bg-[#444] text-[#999] rounded text-xs transition-colors">
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {eventLog.length === 0 && (
          <p className="text-sm text-[#666] text-center py-8">No events recorded</p>
        )}
        {eventLog.map((entry, i) => (
          <div key={i} className={`flex gap-2 px-2 py-1 rounded text-xs ${typeBg(entry.type)}`}>
            <span className="text-[#666] font-mono shrink-0">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className={typeColor(entry.type)}>{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
