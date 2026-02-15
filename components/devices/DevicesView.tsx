import React from 'react';
import { ESP32Panel } from './ESP32Panel';
import { DeviceSettings } from './DeviceSettings';
import { PolicyEditor } from './PolicyEditor';
import { WifiSettings } from './WifiSettings';
import { VibrationDisplay } from './VibrationDisplay';

export function DevicesView() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[#e0e0e0]">Devices</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ESP32Panel />
          <VibrationDisplay />
          <WifiSettings />
        </div>
        <div className="space-y-6">
          <DeviceSettings />
          <PolicyEditor />
        </div>
      </div>
    </div>
  );
}
