import React from 'react';
import { useAppState } from '../../store/AppContext';
import { MetricBar } from '../shared/MetricBar';

export function VibrationDisplay() {
  const { latestTelemetry } = useAppState();
  if (!latestTelemetry) {
    return (
      <div className="bg-[#16213e] border border-[#333] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[#e0e0e0] mb-2">Vibration</h2>
        <p className="text-sm text-[#666]">No telemetry data</p>
      </div>
    );
  }

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-3">
      <h2 className="text-lg font-semibold text-[#e0e0e0]">Vibration</h2>
      <MetricBar label="RMS" value={latestTelemetry.vib_rms ?? 0} max={5} color="#c084fc" />
      <MetricBar label="Peak" value={latestTelemetry.vib_peak ?? 0} max={10} color="#f472b6" />
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-xs text-[#999]">X</p>
          <p className="text-sm font-mono text-[#e0e0e0]">{(latestTelemetry.vib_x ?? 0).toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#999]">Y</p>
          <p className="text-sm font-mono text-[#e0e0e0]">{(latestTelemetry.vib_y ?? 0).toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#999]">Z</p>
          <p className="text-sm font-mono text-[#e0e0e0]">{(latestTelemetry.vib_z ?? 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
