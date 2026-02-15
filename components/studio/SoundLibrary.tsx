import React, { useEffect, useCallback, useState } from 'react';
import { useAppState, useAppDispatch } from '../../store/AppContext';

interface SoundLibraryProps {
  send?: (data: any) => void;
}

export function SoundLibrary({ send }: SoundLibraryProps) {
  const { references, activeReferenceId, selectedReferenceIds, faultSounds } = useAppState();
  const dispatch = useAppDispatch();
  const [editingType, setEditingType] = useState<string | null>(null);

  const fetchRefs = useCallback(async () => {
    try {
      const res = await fetch('/api/references');
      const data = await res.json();
      dispatch({ type: 'SET_REFERENCES', payload: {
        references: data.references || [],
        activeReferenceId: data.activeReferenceId || null,
        selectedReferenceIds: data.selectedReferenceIds || [],
        threshold: data.similarityThreshold || 0.80,
      }});
    } catch {}
  }, [dispatch]);

  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  const handleSelect = useCallback((id: string) => {
    send?.({ type: 'set_reference', referenceId: id });
  }, [send]);

  const handleTypeChange = useCallback(async (id: string, newType: string) => {
    try {
      await fetch(`/api/references/${id}/type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceType: newType }),
      });
      fetchRefs();
      setEditingType(null);
    } catch {}
  }, [fetchRefs]);

  const handleDelete = useCallback(async (filename: string) => {
    try {
      await fetch(`/api/fault-sounds/${filename}`, { method: 'DELETE' });
      fetchRefs();
    } catch {}
  }, [fetchRefs]);

  const typeColor = (type: string) => {
    switch (type) {
      case 'fault': return 'text-red-400';
      case 'negative': return 'text-blue-400';
      case 'normal': return 'text-green-400';
      default: return 'text-[#999]';
    }
  };

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e0e0e0]">Sound Library</h2>
        <span className="text-xs text-[#666]">{references.length} references</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {references.length === 0 && (
          <p className="text-sm text-[#666] text-center py-4">No references uploaded yet</p>
        )}
        {references.map((ref) => (
          <div
            key={ref.id}
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              activeReferenceId === ref.id ? 'bg-[#d4a574]/20 border border-[#d4a574]/40' : 'bg-[#1a1a2e] hover:bg-[#222]'
            }`}
            onClick={() => handleSelect(ref.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#e0e0e0] truncate">{ref.name}</p>
              <div className="flex items-center gap-2 text-xs">
                {editingType === ref.id ? (
                  <select
                    defaultValue={ref.referenceType}
                    onChange={(e) => handleTypeChange(ref.id, e.target.value)}
                    onBlur={() => setEditingType(null)}
                    autoFocus
                    className="bg-[#1a1a2e] border border-[#444] rounded px-1 py-0.5 text-[#e0e0e0]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="fault">fault</option>
                    <option value="negative">negative</option>
                    <option value="normal">normal</option>
                  </select>
                ) : (
                  <span
                    className={`${typeColor(ref.referenceType)} cursor-pointer hover:underline`}
                    onClick={(e) => { e.stopPropagation(); setEditingType(ref.id); }}
                  >
                    {ref.referenceType}
                  </span>
                )}
                <span className="text-[#666]">{ref.kind}</span>
                <span className="text-[#666]">{ref.duration.toFixed(1)}s</span>
              </div>
            </div>
            {selectedReferenceIds.includes(ref.id) && (
              <span className="text-xs text-[#d4a574]">✓</span>
            )}
          </div>
        ))}
      </div>

      {faultSounds.length > 0 && (
        <div className="border-t border-[#333] pt-3">
          <h3 className="text-sm text-[#999] mb-2">Sound Files</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {faultSounds.map((f) => (
              <div key={f.name} className="flex items-center justify-between text-xs py-1">
                <span className="text-[#e0e0e0] truncate flex-1">{f.name}</span>
                <span className="text-[#666] mx-2">{(f.size / 1024).toFixed(0)}KB</span>
                <button
                  onClick={() => handleDelete(f.name)}
                  className="text-red-500 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
