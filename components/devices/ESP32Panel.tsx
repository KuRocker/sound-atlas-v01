import React, { useState, useCallback } from 'react';
import { useAppState } from '../../store/AppContext';
import { StatusDot } from '../shared/StatusDot';

interface ESP32PanelProps {
  send?: (data: any) => void;
}

export function ESP32Panel({ send }: ESP32PanelProps) {
  const { esp32Status, calibrationState } = useAppState();
  const [ip, setIp] = useState('192.168.4.1');
  const [calibLabel, setCalibLabel] = useState('fan');
  const [calibDuration, setCalibDuration] = useState(10);

  const handleConnect = useCallback(() => {
    send?.({ type: 'connect_esp32', ip });
  }, [send, ip]);

  const handleDisconnect = useCallback(() => {
    send?.({ type: 'disconnect_esp32' });
  }, [send]);

  const handleCalibStart = useCallback(() => {
    send?.({ type: 'server_calibration_start', label: calibLabel, duration: calibDuration });
  }, [send, calibLabel, calibDuration]);

  const handleCalibStop = useCallback(() => {
    send?.({ type: 'server_calibration_stop' });
  }, [send]);

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e0e0e0]">ESP32 Connection</h2>
        <StatusDot connected={esp32Status.connected} size="md" label={esp32Status.connected ? 'Connected' : 'Disconnected'} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="ESP32 IP"
          className="flex-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-2 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none"
        />
        {esp32Status.connected ? (
          <button onClick={handleDisconnect} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
            Disconnect
          </button>
        ) : (
          <button onClick={handleConnect} className="px-4 py-2 bg-[#d4a574] hover:bg-[#c49564] text-black rounded-lg text-sm font-medium transition-colors">
            Connect
          </button>
        )}
      </div>

      {esp32Status.lastSeen && (
        <p className="text-xs text-[#999]">Last seen: {new Date(esp32Status.lastSeen).toLocaleTimeString()}</p>
      )}

      {/* Calibration */}
      <div className="border-t border-[#333] pt-4 space-y-3">
        <h3 className="text-sm font-medium text-[#999]">Live Calibration</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={calibLabel}
            onChange={(e) => setCalibLabel(e.target.value)}
            placeholder="Label"
            className="flex-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none"
          />
          <input
            type="number"
            value={calibDuration}
            onChange={(e) => setCalibDuration(Number(e.target.value))}
            className="w-20 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] text-center focus:border-[#d4a574] focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCalibStart}
            disabled={calibrationState.active}
            className="flex-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            {calibrationState.active ? 'Calibrating...' : 'Start Calibration'}
          </button>
          {calibrationState.active && (
            <button onClick={handleCalibStop} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
              Stop
            </button>
          )}
        </div>
        {calibrationState.done && <p className="text-xs text-green-400">Calibration complete!</p>}
        {calibrationState.error && <p className="text-xs text-red-400">{calibrationState.error}</p>}
      </div>

      {/* Test alarm */}
      <button
        onClick={() => send?.({ type: 'send_to_esp32', command: 'test_alarm' })}
        disabled={!esp32Status.connected}
        className="w-full px-3 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:bg-amber-900 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
      >
        Test Alarm
      </button>
    </div>
  );
}
