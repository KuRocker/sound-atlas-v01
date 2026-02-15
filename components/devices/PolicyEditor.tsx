import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../store/AppContext';

interface PolicyEditorProps {
  onUpdate?: (patch: any) => Promise<void>;
}

const FIELDS = [
  { key: 'windowSize', label: 'Window Size', min: 1, max: 20, step: 1 },
  { key: 'minVotes', label: 'Min Votes', min: 1, max: 20, step: 1 },
  { key: 'cooldownMs', label: 'Cooldown (ms)', min: 0, max: 60000, step: 1000 },
  { key: 'minLiveRms', label: 'Min Live RMS', min: 0, max: 1, step: 0.001 },
  { key: 'minVibRms', label: 'Min Vib RMS', min: 0, max: 10, step: 0.01 },
  { key: 'minFaultNegativeMargin', label: 'Fault-Negative Margin', min: 0, max: 1, step: 0.01 },
  { key: 'minFaultNormalMargin', label: 'Fault-Normal Margin', min: 0, max: 1, step: 0.01 },
  { key: 'faultTriggerMargin', label: 'Fault Trigger Margin', min: 0, max: 1, step: 0.01 },
  { key: 'minCosinePositive', label: 'Min Cosine Positive', min: 0, max: 1, step: 0.01 },
  { key: 'minCorrelationPositive', label: 'Min Correlation Positive', min: 0, max: 1, step: 0.01 },
  { key: 'minLiveSpectralCv', label: 'Min Spectral CV', min: 0, max: 5, step: 0.01 },
  { key: 'minLivePeakToMean', label: 'Min Peak/Mean', min: 0, max: 20, step: 0.1 },
  { key: 'nearMargin', label: 'Near Margin', min: 0, max: 1, step: 0.01 },
  { key: 'nearStreak', label: 'Near Streak', min: 1, max: 20, step: 1 },
  { key: 'requireVibrationForFault', label: 'Require Vibration', type: 'boolean' },
] as const;

export function PolicyEditor({ onUpdate }: PolicyEditorProps) {
  const { analysisPolicy } = useAppState();
  const [local, setLocal] = useState<any>({});

  useEffect(() => {
    setLocal(analysisPolicy);
  }, [analysisPolicy]);

  const handleChange = useCallback((key: string, value: any) => {
    setLocal((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (onUpdate) await onUpdate(local);
  }, [local, onUpdate]);

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e0e0e0]">Alarm Policy</h2>
        <button onClick={handleSave} className="px-4 py-1.5 bg-[#d4a574] hover:bg-[#c49564] text-black rounded-lg text-sm font-medium transition-colors">
          Save
        </button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {FIELDS.map((field) => {
          if ('type' in field && field.type === 'boolean') {
            return (
              <div key={field.key} className="flex items-center justify-between">
                <span className="text-xs text-[#999]">{field.label}</span>
                <button
                  onClick={() => handleChange(field.key, !local[field.key])}
                  className={`px-3 py-1 rounded text-xs ${local[field.key] ? 'bg-green-700 text-white' : 'bg-[#333] text-[#999]'}`}
                >
                  {local[field.key] ? 'ON' : 'OFF'}
                </button>
              </div>
            );
          }
          return (
            <div key={field.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#999]">{field.label}</span>
                <span className="text-[#e0e0e0] font-mono">{local[field.key] ?? '-'}</span>
              </div>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={local[field.key] ?? field.min}
                onChange={(e) => handleChange(field.key, Number(e.target.value))}
                className="w-full h-1.5 bg-[#333] rounded-full appearance-none cursor-pointer accent-[#d4a574]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
