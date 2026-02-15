import React, { useState, useCallback } from 'react';

interface WifiSettingsProps {
  send?: (data: any) => void;
}

export function WifiSettings({ send }: WifiSettingsProps) {
  const [staSSID, setStaSSID] = useState('');
  const [staPass, setStaPass] = useState('');
  const [apSSID, setApSSID] = useState('');
  const [apPass, setApPass] = useState('');

  const handleSave = useCallback(() => {
    send?.({ type: 'send_to_esp32', command: 'set_wifi', params: {
      sta_ssid: staSSID, sta_pass: staPass,
      ap_ssid: apSSID, ap_pass: apPass,
    }});
  }, [send, staSSID, staPass, apSSID, apPass]);

  const handleRestart = useCallback(() => {
    send?.({ type: 'send_to_esp32', command: 'restart_wifi' });
  }, [send]);

  return (
    <div className="bg-[#16213e] border border-[#333] rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[#e0e0e0]">WiFi Settings</h2>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-[#999]">Station SSID</label>
          <input type="text" value={staSSID} onChange={(e) => setStaSSID(e.target.value)}
            placeholder="WiFi network name"
            className="w-full mt-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-[#999]">Station Password</label>
          <input type="password" value={staPass} onChange={(e) => setStaPass(e.target.value)}
            placeholder="WiFi password"
            className="w-full mt-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-[#999]">AP SSID</label>
          <input type="text" value={apSSID} onChange={(e) => setApSSID(e.target.value)}
            placeholder="Access point name"
            className="w-full mt-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-[#999]">AP Password</label>
          <input type="password" value={apPass} onChange={(e) => setApPass(e.target.value)}
            placeholder="Access point password"
            className="w-full mt-1 bg-[#1a1a2e] border border-[#444] rounded-lg px-3 py-1.5 text-sm text-[#e0e0e0] focus:border-[#d4a574] focus:outline-none" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} className="flex-1 px-3 py-1.5 bg-[#d4a574] hover:bg-[#c49564] text-black rounded-lg text-sm font-medium transition-colors">
          Save WiFi
        </button>
        <button onClick={handleRestart} className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors">
          Restart WiFi
        </button>
      </div>
    </div>
  );
}
