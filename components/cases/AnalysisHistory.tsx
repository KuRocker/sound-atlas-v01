import React, { useState, useEffect, useCallback } from 'react';

export function AnalysisHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analysis/history?limit=50');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : data.history || []);
    } catch {
      setHistory([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e0e0e0]">Analysis History</h2>
        <button onClick={fetchHistory} disabled={loading}
          className="px-2 py-1 bg-[#333] hover:bg-[#444] text-[#999] rounded text-xs transition-colors">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {history.length === 0 && (
          <p className="text-sm text-[#666] text-center py-4">No analysis records</p>
        )}
        {history.map((entry, i) => (
          <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
            entry.alarm ? 'bg-red-900/20' : ''
          }`}>
            <span className="text-[#666] font-mono shrink-0">
              {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '-'}
            </span>
            <span className={`font-mono font-bold ${entry.alarm ? 'text-red-400' : 'text-green-400'}`}>
              {((entry.similarity || 0) * 100).toFixed(1)}%
            </span>
            <span className="text-[#999] truncate flex-1">{entry.referenceName || 'Unknown'}</span>
            <span className="text-[#666]">{entry.mode === 'normal_deviation' ? 'dev' : 'match'}</span>
            {entry.alarm && <span className="text-red-400">🚨</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
