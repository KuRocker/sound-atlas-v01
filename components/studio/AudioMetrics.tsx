import React from 'react';
import { useAppState } from '../../store/AppContext';
import { MetricBar } from '../shared/MetricBar';

export function AudioMetrics() {
  const { latestTelemetry, latestAnalysis } = useAppState();

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-3">
      <h2 className="text-lg font-semibold text-[#e0e0e0]">Audio Metrics</h2>

      <MetricBar label="Audio RMS" value={latestTelemetry?.audio_rms ?? 0} max={0.5} color="#d4a574" />
      <MetricBar label="Zero Crossing Rate" value={latestTelemetry?.audio_zcr ?? 0} max={1} color="#d4a574" />

      <div className="border-t border-[#333] pt-3 space-y-3">
        <h3 className="text-sm text-[#999]">Energy Bands</h3>
        <MetricBar label="200-800 Hz" value={latestTelemetry?.e_200_800 ?? 0} max={1} color="#f59e0b" />
        <MetricBar label="800-2k Hz" value={latestTelemetry?.e_800_2k ?? 0} max={1} color="#ef4444" />
        <MetricBar label="2k-4k Hz" value={latestTelemetry?.e_2k_4k ?? 0} max={1} color="#ec4899" />
      </div>

      {latestAnalysis && (
        <div className="border-t border-[#333] pt-3 space-y-2">
          <h3 className="text-sm text-[#999]">Similarity</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <MetricBar
                label="Match"
                value={latestAnalysis.similarity * 100}
                max={100}
                color={latestAnalysis.alarm ? '#ef4444' : '#22c55e'}
                unit="%"
              />
            </div>
            {latestAnalysis.alarm && (
              <span className="text-xs font-bold text-red-400 animate-pulse">ALARM</span>
            )}
          </div>
          <p className="text-xs text-[#666]">
            Mode: {latestAnalysis.mode} | Ref: {latestAnalysis.referenceName}
          </p>
        </div>
      )}

      {latestTelemetry?.peak_freq != null && (
        <div className="text-xs text-[#999]">
          Peak Frequency: <span className="text-[#e0e0e0] font-mono">{latestTelemetry.peak_freq.toFixed(0)} Hz</span>
        </div>
      )}
    </div>
  );
}
