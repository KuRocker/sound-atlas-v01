import React, { useState, useCallback } from 'react';
import { useAppState } from '../../store/AppContext';

interface DeviceSettingsProps {
  send?: (data: any) => void;
}

export function DeviceSettings({ send }: DeviceSettingsProps) {
  const { latestTelemetry } = useAppState();
  const [kFactor, setKFactor] = useState(latestTelemetry?.k_factor ?? 1.0);
  const [mlThreshold, setMlThreshold] = useState(latestTelemetry?.ml_threshold ?? 0.7);
  const [specDeltaTh, setSpecDeltaTh] = useState(latestTelemetry?.spec_delta_th ?? 0.5);
  const [calibDuration, setCalibDuration] = useState(latestTelemetry?.calib_duration ?? 10);

  const sendSetting = useCallback((command: string, value: any) => {
    send?.({ type: 'send_to_esp32', command, params: { value } });
  }, [send]);

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[#e0e0e0]">Device Settings</h2>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-[#999]">K-Factor</label>
          <div className="flex gap-2 mt-1">
            <input type="number" step="0.1" value={kFactor}
              onChange={(e) => setKFactor(Number(e.target.value))}
              className="flex-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none"
            />
            <button onClick={() => sendSetting('set_k_factor', kFactor)}
              className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-[#e0e0e0] rounded-lg text-sm transition-colors">
              Set
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-[#999]">ML Threshold</label>
          <div className="flex gap-2 mt-1">
            <input type="number" step="0.05" min="0" max="1" value={mlThreshold}
              onChange={(e) => setMlThreshold(Number(e.target.value))}
              className="flex-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none"
            />
            <button onClick={() => sendSetting('set_ml_threshold', mlThreshold)}
              className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-[#e0e0e0] rounded-lg text-sm transition-colors">
              Set
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-[#999]">Spectrum Delta Threshold</label>
          <div className="flex gap-2 mt-1">
            <input type="number" step="0.1" value={specDeltaTh}
              onChange={(e) => setSpecDeltaTh(Number(e.target.value))}
              className="flex-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none"
            />
            <button onClick={() => sendSetting('set_spec_delta_th', specDeltaTh)}
              className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-[#e0e0e0] rounded-lg text-sm transition-colors">
              Set
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-[#999]">Calibration Duration (s)</label>
          <div className="flex gap-2 mt-1">
            <input type="number" step="1" min="5" value={calibDuration}
              onChange={(e) => setCalibDuration(Number(e.target.value))}
              className="flex-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none"
            />
            <button onClick={() => sendSetting('set_calib_duration', calibDuration)}
              className="px-3 py-1.5 bg-[#333] hover:bg-[#444] text-[#e0e0e0] rounded-lg text-sm transition-colors">
              Set
            </button>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="border-t border-[#333] pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#999]">ML Enabled</span>
          <button
            onClick={() => sendSetting('set_ml_enabled', !latestTelemetry?.ml_enabled)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              latestTelemetry?.ml_enabled ? 'bg-green-700 text-white' : 'bg-[#333] text-[#999]'
            }`}
          >
            {latestTelemetry?.ml_enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#999]">Alarm Enabled</span>
          <button
            onClick={() => sendSetting('set_alarm_enabled', !latestTelemetry?.alarm_enabled)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              latestTelemetry?.alarm_enabled ? 'bg-green-700 text-white' : 'bg-[#333] text-[#999]'
            }`}
          >
            {latestTelemetry?.alarm_enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
